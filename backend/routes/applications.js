
const express = require("express");
const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");

const router = express.Router();

const prisma = require("../prisma");
const authMiddleware = require("../middleware/authMiddleware");

// ==========================================
// DIRECTORIES
// ==========================================

const PROFILE_RESUME_DIR = path.join(
    __dirname,
    "..",
    "uploads",
    "resumes"
);

const APPLICATION_RESUME_DIR = path.join(
    __dirname,
    "..",
    "uploads",
    "application-resumes"
);

// ==========================================
// STUDENT-ONLY MIDDLEWARE
// ==========================================

const studentOnly = (req, res, next) => {
    if (!req.user || req.user.role !== "STUDENT") {
        return res.status(403).json({
            message: "Access denied. Students only.",
        });
    }

    next();
};

// ==========================================
// HELPERS
// ==========================================

const isValidResumeFilename = (filename) => {
    return (
        typeof filename === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/i.test(
            filename
        )
    );
};

const getApplicationStatistics = (applications) => ({
    total: applications.length,

    pending: applications.filter(
        (app) => app.status === "PENDING"
    ).length,

    reviewed: applications.filter(
        (app) => app.status === "REVIEWED"
    ).length,

    shortlisted: applications.filter(
        (app) => app.status === "SHORTLISTED"
    ).length,

    interview: applications.filter(
        (app) => app.status === "INTERVIEW"
    ).length,

    accepted: applications.filter(
        (app) => app.status === "ACCEPTED"
    ).length,

    rejected: applications.filter(
        (app) => app.status === "REJECTED"
    ).length,

    withdrawn: applications.filter(
        (app) => app.status === "WITHDRAWN"
    ).length,
});

// ==========================================
// 1. APPLY FOR AN OPPORTUNITY
// POST /api/applications/:opportunityId
// ==========================================

router.post(
    "/:opportunityId",
    authMiddleware,
    studentOnly,
    async (req, res) => {
        let snapshotPath = null;

        try {
            const { opportunityId } = req.params;
            const { coverLetter } = req.body || {};

            // Validate cover letter
            if (
                typeof coverLetter !== "string" ||
                !coverLetter.trim()
            ) {
                return res.status(400).json({
                    message:
                        "Please provide your cover letter before applying.",
                });
            }

            const cleanedCoverLetter = coverLetter.trim();

            if (cleanedCoverLetter.length < 100) {
                return res.status(400).json({
                    message:
                        "Your cover letter must contain at least 100 characters.",
                });
            }

            if (cleanedCoverLetter.length > 10000) {
                return res.status(400).json({
                    message:
                        "Your cover letter cannot exceed 10,000 characters.",
                });
            }

            // Find opportunity
            const opportunity =
                await prisma.opportunity.findUnique({
                    where: {
                        id: opportunityId,
                    },
                });

            if (!opportunity || !opportunity.isActive) {
                return res.status(404).json({
                    message:
                        "Opportunity not found or no longer active.",
                });
            }

            // Check deadline
            if (
                opportunity.deadline &&
                new Date(opportunity.deadline) < new Date()
            ) {
                return res.status(400).json({
                    message:
                        "The application deadline has passed.",
                });
            }

            // Check duplicate application
            const existingApplication =
                await prisma.application.findFirst({
                    where: {
                        userId: req.user.id,
                        opportunityId,
                    },
                });

            if (existingApplication) {
                return res.status(409).json({
                    message:
                        "You have already applied for this opportunity.",
                });
            }

            // Find legacy internship if applicable
            const legacyInternship =
                opportunity.category === "INTERNSHIP"
                    ? await prisma.internship.findUnique({
                        where: {
                            id: opportunityId,
                        },
                    })
                    : null;

            // Check legacy duplicate application
            if (legacyInternship) {
                const existingLegacyApplication =
                    await prisma.application.findFirst({
                        where: {
                            userId: req.user.id,
                            internshipId: legacyInternship.id,
                        },
                    });

                if (existingLegacyApplication) {
                    return res.status(409).json({
                        message:
                            "You have already applied for this opportunity.",
                    });
                }
            }

            // Get student's current profile resume
            const studentProfile =
                await prisma.studentProfile.findUnique({
                    where: {
                        userId: req.user.id,
                    },
                    select: {
                        resumeUrl: true,
                    },
                });

            const profileResume = studentProfile?.resumeUrl;

            if (!profileResume) {
                return res.status(400).json({
                    message:
                        "Please upload your resume before applying.",
                });
            }

            // Validate managed PDF filename
            if (!isValidResumeFilename(profileResume)) {
                return res.status(400).json({
                    message:
                        "Your saved resume is invalid. Please upload your resume again.",
                });
            }

            // Verify original resume exists
            const sourceResumePath = path.join(
                PROFILE_RESUME_DIR,
                profileResume
            );

            try {
                await fs.promises.access(
                    sourceResumePath,
                    fs.constants.R_OK
                );
            } catch {
                return res.status(404).json({
                    message:
                        "Your uploaded resume could not be found. Please upload it again.",
                });
            }

            // Create application-specific resume snapshot
            await fs.promises.mkdir(
                APPLICATION_RESUME_DIR,
                { recursive: true }
            );

            const snapshotFilename = `${randomUUID()}.pdf`;

            snapshotPath = path.join(
                APPLICATION_RESUME_DIR,
                snapshotFilename
            );

            await fs.promises.copyFile(
                sourceResumePath,
                snapshotPath,
                fs.constants.COPYFILE_EXCL
            );

            // Create application and initial status history
            const application = await prisma.$transaction(
                async (tx) => {
                    const created =
                        await tx.application.create({
                            data: {
                                userId: req.user.id,
                                opportunityId,
                                internshipId: legacyInternship
                                    ? legacyInternship.id
                                    : null,
                                coverLetter: cleanedCoverLetter,
                                resumeUrl: snapshotFilename,
                            },
                        });

                    await tx.applicationStatusHistory.create({
                        data: {
                            applicationId: created.id,
                            fromStatus: null,
                            toStatus: "PENDING",
                            changedById: req.user.id,
                            changedByRole: "STUDENT",
                            note: "Application submitted.",
                        },
                    });

                    return created;
                }
            );

            return res.status(201).json({
                message:
                    "Application submitted successfully.",
                application,
            });

        } catch (error) {
            // Remove copied snapshot if submission failed
            if (snapshotPath) {
                try {
                    await fs.promises.unlink(snapshotPath);
                } catch (cleanupError) {
                    console.error(
                        "Resume snapshot cleanup failed:",
                        cleanupError.message
                    );
                }
            }

            console.error(
                "APPLICATION SUBMISSION FAILED:",
                error
            );

            if (error.code === "P2002") {
                return res.status(409).json({
                    message:
                        "You have already applied for this opportunity.",
                });
            }

            if (error.code === "P2025") {
                return res.status(404).json({
                    message: "Opportunity not found.",
                });
            }

            return res.status(500).json({
                message: "Failed to submit application.",
                debug: error.message,
            });
        }
    }
);

// ==========================================
// 2. GET STUDENT APPLICATIONS + STATISTICS
// GET /api/applications/my
//
// IMPORTANT:
// This endpoint intentionally avoids nested Prisma
// relations while we isolate the dashboard 500 error.
// ==========================================

router.get(
    "/my",
    authMiddleware,
    studentOnly,
    async (req, res) => {
        try {
            console.log(
                "Fetching applications for student:",
                req.user.id
            );

            const applications =
                await prisma.application.findMany({
                    where: {
                        userId: req.user.id,
                    },

                    orderBy: {
                        appliedAt: "desc",
                    },
                });

            const statistics =
                getApplicationStatistics(applications);

            return res.status(200).json({
                message:
                    "Student applications fetched successfully.",

                statistics,

                total: applications.length,

                applications,
            });

        } catch (error) {
            console.error(
                "GET STUDENT APPLICATIONS FAILED:",
                error
            );

            return res.status(500).json({
                message:
                    "Failed to fetch student applications.",
                debug: error.message,
            });
        }
    }
);

// ==========================================
// 3. GET ONE APPLICATION'S STATUS HISTORY
// GET /api/applications/:applicationId/history
// ==========================================

router.get(
    "/:applicationId/history",
    authMiddleware,
    studentOnly,
    async (req, res) => {
        try {
            const { applicationId } = req.params;

            // Check ownership
            const application =
                await prisma.application.findFirst({
                    where: {
                        id: applicationId,
                        userId: req.user.id,
                    },

                    select: {
                        id: true,
                    },
                });

            if (!application) {
                return res.status(404).json({
                    message: "Application not found.",
                });
            }

            const history =
                await prisma.applicationStatusHistory.findMany({
                    where: {
                        applicationId,
                    },

                    orderBy: {
                        createdAt: "asc",
                    },
                });

            return res.status(200).json({
                message:
                    "Application history fetched successfully.",
                history,
            });

        } catch (error) {
            console.error(
                "APPLICATION HISTORY FETCH FAILED:",
                error
            );

            return res.status(500).json({
                message:
                    "Failed to fetch application history.",
                debug: error.message,
            });
        }
    }
);

// ==========================================
// 4. WITHDRAW AN APPLICATION
// PATCH /api/applications/:applicationId/withdraw
// ==========================================

router.patch(
    "/:applicationId/withdraw",
    authMiddleware,
    studentOnly,
    async (req, res) => {
        try {
            const { applicationId } = req.params;

            const application =
                await prisma.application.findFirst({
                    where: {
                        id: applicationId,
                        userId: req.user.id,
                    },
                });

            if (!application) {
                return res.status(404).json({
                    message: "Application not found.",
                });
            }

            const withdrawableStatuses = [
                "PENDING",
                "REVIEWED",
                "SHORTLISTED",
                "INTERVIEW",
            ];

            if (
                !withdrawableStatuses.includes(
                    application.status
                )
            ) {
                return res.status(400).json({
                    message:
                        `Application cannot be withdrawn because its status is ${application.status}.`,
                });
            }

            // Update application and history atomically
            const updatedApplication =
                await prisma.$transaction(async (tx) => {
                    const updated =
                        await tx.application.update({
                            where: {
                                id: applicationId,
                            },

                            data: {
                                status: "WITHDRAWN",
                            },
                        });

                    await tx.applicationStatusHistory.create({
                        data: {
                            applicationId,
                            fromStatus: application.status,
                            toStatus: "WITHDRAWN",
                            changedById: req.user.id,
                            changedByRole: "STUDENT",
                            note:
                                "Application withdrawn by student.",
                        },
                    });

                    return updated;
                });

            return res.status(200).json({
                message:
                    "Application withdrawn successfully.",
                application: updatedApplication,
            });

        } catch (error) {
            console.error(
                "WITHDRAW APPLICATION FAILED:",
                error
            );

            return res.status(500).json({
                message:
                    "Failed to withdraw application.",
                debug: error.message,
            });
        }
    }
);

// ==========================================
// EXPORT ROUTER
// ==========================================

module.exports = router;
