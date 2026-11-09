
const express = require("express");
const router = express.Router();

const prisma = require("../prisma");
const authMiddleware = require("../middleware/authMiddleware");

// ==========================================
// STUDENT-ONLY MIDDLEWARE
// ==========================================

const studentOnly = (req, res, next) => {
    if (req.user.role !== "STUDENT") {
        return res.status(403).json({
            message: "Access denied. Students only.",
        });
    }

    next();
};

// ==========================================
// SHARED APPLICATION DETAILS
// ==========================================

const applicationDetails = {
    opportunity: {
        select: {
            id: true,
            title: true,
            description: true,
            category: true,
            employmentType: true,
            location: true,
            isRemote: true,
            compensation: true,
            duration: true,
            deadline: true,
            company: {
                select: {
                    id: true,
                    name: true,
                    logoUrl: true,
                    website: true,
                },
            },
        },
    },

    internship: {
        select: {
            id: true,
            title: true,
            location: true,
            isRemote: true,
            internshipType: true,
            stipend: true,
            duration: true,
            deadline: true,
            company: {
                select: {
                    id: true,
                    name: true,
                    logoUrl: true,
                    website: true,
                },
            },
        },
    },
};

// ==========================================
// 1. APPLY FOR AN OPPORTUNITY
// POST /api/applications/:opportunityId
// ==========================================

router.post(
    "/:opportunityId",
    authMiddleware,
    studentOnly,
    async (req, res) => {
        try {
            const { opportunityId } = req.params;
            const { coverLetter } = req.body || {};

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
            const opportunity = await prisma.opportunity.findUnique({
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
                    message: "The application deadline has passed.",
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

            // Check duplicate opportunity application
            const existingOpportunityApplication =
                await prisma.application.findUnique({
                    where: {
                        userId_opportunityId: {
                            userId: req.user.id,
                            opportunityId,
                        },
                    },
                });

            if (existingOpportunityApplication) {
                return res.status(409).json({
                    message:
                        "You have already applied for this opportunity.",
                });
            }

            // Check duplicate legacy internship application
            if (legacyInternship) {
                const existingLegacyApplication =
                    await prisma.application.findUnique({
                        where: {
                            userId_internshipId: {
                                userId: req.user.id,
                                internshipId: legacyInternship.id,
                            },
                        },
                    });

                if (existingLegacyApplication) {
                    return res.status(409).json({
                        message:
                            "You have already applied for this opportunity.",
                    });
                }
            }

            // Create application and initial history atomically
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
                            },
                            include: {
                                ...applicationDetails,
                                user: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true,
                                    },
                                },
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
                message: "Application submitted successfully.",
                application,
            });

        } catch (error) {
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
            });
        }
    }
);

// ==========================================
// 2. GET STUDENT APPLICATIONS + STATISTICS
// GET /api/applications/my
// ==========================================

router.get(
    "/my",
    authMiddleware,
    studentOnly,
    async (req, res) => {
        try {
            const applications =
                await prisma.application.findMany({
                    where: {
                        userId: req.user.id,
                    },

                    orderBy: {
                        appliedAt: "desc",
                    },

                    include: {
                        ...applicationDetails,

                        statusHistory: {
                            orderBy: {
                                createdAt: "asc",
                            },
                        },
                    },
                });

            const statistics = {
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
            };

            return res.status(200).json({
                message:
                    "Student applications fetched successfully.",
                statistics,
                applications,
            });

        } catch (error) {
            console.error(
                "STUDENT APPLICATIONS FETCH FAILED:",
                error
            );

            return res.status(500).json({
                message: "Failed to fetch student applications.",
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

            // Ownership check
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
                message: "Application history fetched successfully.",
                history,
            });

        } catch (error) {
            console.error(
                "APPLICATION HISTORY FETCH FAILED:",
                error
            );

            return res.status(500).json({
                message: "Failed to fetch application history.",
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

            // Update status and history atomically
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

                            include: {
                                ...applicationDetails,

                                statusHistory: {
                                    orderBy: {
                                        createdAt: "asc",
                                    },
                                },
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
                message: "Failed to withdraw application.",
            });
        }
    }
);

module.exports = router;
