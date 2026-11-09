const express = require("express");
const prisma = require("../prisma");
const authMiddleware = require("../middleware/authMiddleware");
const fs = require("fs");
const path = require("path");

const {
    notifyApplicationStatus,
} = require("../services/notificationService");

const router = express.Router();

// ==========================================
// AUTHENTICATION AND AUTHORIZATION
// ==========================================

router.use(authMiddleware);

const employerOnly = (req, res, next) => {
    if (req.user.role !== "EMPLOYER") {
        return res.status(403).json({
            message: "Access denied. Employer account required.",
        });
    }

    next();
};

router.use(employerOnly);

// ==========================================
// CONSTANTS
// ==========================================

const VALID_CATEGORIES = [
    "INTERNSHIP",
    "FULL_TIME_JOB",
    "PART_TIME_JOB",
    "FREELANCE",
    "CONTRACT",
    "RESEARCH",
    "TRAINING",
];

const VALID_EMPLOYMENT_TYPES = [
    "FULL_TIME",
    "PART_TIME",
    "CONTRACT",
    "TEMPORARY",
    "FREELANCE",
    "INTERNSHIP",
];

const ALLOWED_APPLICATION_STATUSES = [
    "REVIEWED",
    "SHORTLISTED",
    "INTERVIEW",
    "ACCEPTED",
    "REJECTED",
];

const RESUME_DIR = path.join(
    __dirname,
    "..",
    "uploads",
    "resumes"
);

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

const parseDeadline = (deadline) => {
    if (deadline === undefined) return undefined;

    if (deadline === null || deadline === "") {
        return null;
    }

    const parsedDate = new Date(deadline);

    if (Number.isNaN(parsedDate.getTime())) {
        return null;
    }

    return parsedDate;
};

const normalizeString = (value) => {
    return typeof value === "string" ? value.trim() : "";
};

const mapEmploymentType = (value) => {
    if (!value || typeof value !== "string") {
        return null;
    }

    const normalized = value
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, "_");

    const mappings = {
        FULL_TIME: "FULL_TIME",
        FULLTIME: "FULL_TIME",
        PART_TIME: "PART_TIME",
        PARTTIME: "PART_TIME",
        CONTRACT: "CONTRACT",
        TEMPORARY: "TEMPORARY",
        FREELANCE: "FREELANCE",
        INTERNSHIP: "INTERNSHIP",
    };

    return mappings[normalized] || null;
};

const getOpportunitySelect = () => ({
    id: true,
    title: true,
    description: true,
    category: true,
    employmentType: true,
    location: true,
    isRemote: true,
    compensation: true,
    duration: true,
    requirements: true,
    applicationUrl: true,
    deadline: true,
    isActive: true,
    companyId: true,
    createdAt: true,
    updatedAt: true,
    company: {
        select: {
            id: true,
            name: true,
            logoUrl: true,
            location: true,
        },
    },
});

// Keep old frontend property names available temporarily.

const formatOpportunity = (opportunity) => {
    if (!opportunity) return null;

    return {
        ...opportunity,
        internshipType: opportunity.employmentType,
        stipend: opportunity.compensation,
    };
};

const formatApplication = (application) => {
    if (!application) return null;

    const legacyInternship = application.opportunity
        ? {
            id: application.opportunity.id,
            title: application.opportunity.title,
            location: application.opportunity.location,
            isRemote: application.opportunity.isRemote,
            stipend: application.opportunity.compensation,
            duration: application.opportunity.duration,
        }
        : application.internship
            ? { ...application.internship }
            : null;

    return {
        ...application,
        internship: legacyInternship,
    };
};

const getOpportunityInput = (body, isUpdate = false) => {
    const data = {};

    if (body.title !== undefined) {
        if (
            typeof body.title !== "string" ||
            !body.title.trim()
        ) {
            return {
                error: "A valid opportunity title is required.",
            };
        }

        data.title = body.title.trim();
    }

    if (body.description !== undefined) {
        if (
            typeof body.description !== "string" ||
            !body.description.trim()
        ) {
            return {
                error: "A valid opportunity description is required.",
            };
        }

        data.description = body.description.trim();
    }

    if (body.category !== undefined) {
        if (!VALID_CATEGORIES.includes(body.category)) {
            return {
                error: "Invalid opportunity category.",
            };
        }

        data.category = body.category;
    } else if (!isUpdate) {
        data.category = "INTERNSHIP";
    }

    const employmentInput =
        body.employmentType !== undefined
            ? body.employmentType
            : body.type;

    if (employmentInput !== undefined) {
        if (
            employmentInput === null ||
            employmentInput === ""
        ) {
            data.employmentType = null;
        } else {
            const mapped = mapEmploymentType(employmentInput);

            if (
                !mapped ||
                !VALID_EMPLOYMENT_TYPES.includes(mapped)
            ) {
                return {
                    error: "Invalid employment type.",
                };
            }

            data.employmentType = mapped;
        }
    } else if (!isUpdate && data.category === "INTERNSHIP") {
        data.employmentType = "INTERNSHIP";
    }

    if (body.location !== undefined) {
        data.location = body.location || null;
    }

    const remoteValue =
        body.isRemote !== undefined
            ? body.isRemote
            : body.remote;

    if (remoteValue !== undefined) {
        if (typeof remoteValue !== "boolean") {
            return {
                error: "Remote status must be true or false.",
            };
        }

        data.isRemote = remoteValue;
    }

    const compensationValue =
        body.compensation !== undefined
            ? body.compensation
            : body.stipend;

    if (compensationValue !== undefined) {
        data.compensation = compensationValue || null;
    }

    if (body.duration !== undefined) {
        data.duration = body.duration || null;
    }

    if (body.requirements !== undefined) {
        data.requirements = body.requirements || null;
    }

    if (body.applicationUrl !== undefined) {
        data.applicationUrl = body.applicationUrl || null;
    }

    if (body.deadline !== undefined) {
        const parsedDeadline = parseDeadline(body.deadline);

        if (body.deadline && !parsedDeadline) {
            return {
                error: "Please provide a valid opportunity deadline.",
            };
        }

        data.deadline = parsedDeadline;
    }

    if (body.isActive !== undefined) {
        if (typeof body.isActive !== "boolean") {
            return {
                error: "isActive must be true or false.",
            };
        }

        data.isActive = body.isActive;
    }

    return {
        data,
        error: null,
    };
};

// ==========================================
// COMPANY PROFILE
// ==========================================

// GET /api/employer/company

router.get("/company", async (req, res) => {
    try {
        const company = await prisma.company.findUnique({
            where: {
                ownerId: req.user.id,
            },
        });

        if (!company) {
            return res.status(404).json({
                message: "Company profile not found.",
            });
        }

        return res.status(200).json({
            company,
        });
    } catch (error) {
        console.error("Get company profile error:", error);

        return res.status(500).json({
            message: "Failed to retrieve company profile.",
        });
    }
});

// PUT /api/employer/company

router.put("/company", async (req, res) => {
    try {
        const {
            name,
            description,
            website,
            industry,
            location,
            logoUrl,
        } = req.body;

        if (typeof name !== "string" || !name.trim()) {
            return res.status(400).json({
                message: "Company name is required.",
            });
        }

        const company = await prisma.company.upsert({
            where: {
                ownerId: req.user.id,
            },
            update: {
                name: name.trim(),
                description,
                website,
                industry,
                location,
                logoUrl,
            },
            create: {
                name: name.trim(),
                description,
                website,
                industry,
                location,
                logoUrl,
                ownerId: req.user.id,
            },
        });

        return res.status(200).json({
            message: "Company profile saved successfully.",
            company,
        });
    } catch (error) {
        console.error("Save company profile error:", error);

        return res.status(500).json({
            message: "Failed to save company profile.",
        });
    }
});

// ==========================================
// OPPORTUNITY MANAGEMENT
// ==========================================

// POST /api/employer/opportunities
// POST /api/employer/internships

router.post(
    ["/opportunities", "/internships"],
    async (req, res) => {
        try {
            const parsed = getOpportunityInput(req.body);

            if (parsed.error) {
                return res.status(400).json({
                    message: parsed.error,
                });
            }

            const data = parsed.data;

            if (!data.title) {
                return res.status(400).json({
                    message: "Opportunity title is required.",
                });
            }

            if (!data.description) {
                return res.status(400).json({
                    message: "Opportunity description is required.",
                });
            }

            const company = await prisma.company.findUnique({
                where: {
                    ownerId: req.user.id,
                },
            });

            if (!company) {
                return res.status(400).json({
                    message: "Please create your company profile first.",
                });
            }

            const opportunity = await prisma.opportunity.create({
                data: {
                    ...data,
                    companyId: company.id,
                },
                include: {
                    company: {
                        select: {
                            id: true,
                            name: true,
                            logoUrl: true,
                            location: true,
                        },
                    },
                },
            });

            const formatted = formatOpportunity(opportunity);

            return res.status(201).json({
                message: "Opportunity created successfully.",
                opportunity: formatted,
                internship: formatted,
            });
        } catch (error) {
            console.error("Create opportunity error:", error);

            return res.status(500).json({
                message: "Failed to create opportunity.",
            });
        }
    }
);

// GET /api/employer/opportunities
// GET /api/employer/internships

router.get(
    ["/opportunities", "/internships"],
    async (req, res) => {
        try {
            const company = await prisma.company.findUnique({
                where: {
                    ownerId: req.user.id,
                },
            });

            if (!company) {
                return res.status(400).json({
                    message: "Please create your company profile first.",
                });
            }

            const opportunities = await prisma.opportunity.findMany({
                where: {
                    companyId: company.id,
                },
                include: {
                    _count: {
                        select: {
                            applications: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: "desc",
                },
            });

            const formatted = opportunities.map(formatOpportunity);

            return res.status(200).json({
                opportunities: formatted,
                internships: formatted,
            });
        } catch (error) {
            console.error("Get employer opportunities error:", error);

            return res.status(500).json({
                message: "Failed to retrieve opportunities.",
            });
        }
    }
);

// PUT /api/employer/opportunities/:id
// PUT /api/employer/internships/:id

router.put(
    ["/opportunities/:id", "/internships/:id"],
    async (req, res) => {
        try {
            const opportunityId = req.params.id;

            const company = await prisma.company.findUnique({
                where: {
                    ownerId: req.user.id,
                },
            });

            if (!company) {
                return res.status(400).json({
                    message: "Company profile not found.",
                });
            }

            const existingOpportunity =
                await prisma.opportunity.findFirst({
                    where: {
                        id: opportunityId,
                        companyId: company.id,
                    },
                });

            if (!existingOpportunity) {
                return res.status(404).json({
                    message: "Opportunity not found or access denied.",
                });
            }

            const parsed = getOpportunityInput(req.body, true);

            if (parsed.error) {
                return res.status(400).json({
                    message: parsed.error,
                });
            }

            const opportunity = await prisma.opportunity.update({
                where: {
                    id: opportunityId,
                },
                data: parsed.data,
            });

            const formatted = formatOpportunity(opportunity);

            return res.status(200).json({
                message: "Opportunity updated successfully.",
                opportunity: formatted,
                internship: formatted,
            });
        } catch (error) {
            console.error("Update opportunity error:", error);

            return res.status(500).json({
                message: "Failed to update opportunity.",
            });
        }
    }
);

// ==========================================
// CLOSE / REOPEN OPPORTUNITIES
// ==========================================

// PATCH /api/employer/opportunities/:id/close
// PATCH /api/employer/internships/:id/close

router.patch(
    [
        "/opportunities/:id/close",
        "/internships/:id/close",
    ],
    async (req, res) => {
        try {
            const company = await prisma.company.findUnique({
                where: {
                    ownerId: req.user.id,
                },
                select: {
                    id: true,
                },
            });

            if (!company) {
                return res.status(400).json({
                    message: "Company profile not found.",
                });
            }

            const existingOpportunity =
                await prisma.opportunity.findFirst({
                    where: {
                        id: req.params.id,
                        companyId: company.id,
                    },
                });

            if (!existingOpportunity) {
                return res.status(404).json({
                    message: "Opportunity not found or access denied.",
                });
            }

            const opportunity = await prisma.opportunity.update({
                where: {
                    id: req.params.id,
                },
                data: {
                    isActive: false,
                },
            });

            const formatted = formatOpportunity(opportunity);

            return res.status(200).json({
                message: "Opportunity closed successfully.",
                opportunity: formatted,
                internship: formatted,
            });
        } catch (error) {
            console.error("Close opportunity error:", error);

            return res.status(500).json({
                message: "Failed to close opportunity.",
            });
        }
    }
);

// PATCH /api/employer/opportunities/:id/reopen
// PATCH /api/employer/internships/:id/reopen

router.patch(
    [
        "/opportunities/:id/reopen",
        "/internships/:id/reopen",
    ],
    async (req, res) => {
        try {
            const company = await prisma.company.findUnique({
                where: {
                    ownerId: req.user.id,
                },
                select: {
                    id: true,
                },
            });

            if (!company) {
                return res.status(400).json({
                    message: "Company profile not found.",
                });
            }

            const existingOpportunity =
                await prisma.opportunity.findFirst({
                    where: {
                        id: req.params.id,
                        companyId: company.id,
                    },
                });

            if (!existingOpportunity) {
                return res.status(404).json({
                    message: "Opportunity not found or access denied.",
                });
            }

            const opportunity = await prisma.opportunity.update({
                where: {
                    id: req.params.id,
                },
                data: {
                    isActive: true,
                },
            });

            const formatted = formatOpportunity(opportunity);

            return res.status(200).json({
                message: "Opportunity reopened successfully.",
                opportunity: formatted,
                internship: formatted,
            });
        } catch (error) {
            console.error("Reopen opportunity error:", error);

            return res.status(500).json({
                message: "Failed to reopen opportunity.",
            });
        }
    }
);

// ==========================================
// EMPLOYER APPLICATION MANAGEMENT
// ==========================================

// GET /api/employer/applications

router.get("/applications", async (req, res) => {
    try {
        const company = await prisma.company.findUnique({
            where: {
                ownerId: req.user.id,
            },
            select: {
                id: true,
            },
        });

        if (!company) {
            return res.status(404).json({
                message: "Company profile not found.",
            });
        }

        const applications = await prisma.application.findMany({
            where: {
                OR: [
                    {
                        opportunity: {
                            companyId: company.id,
                        },
                    },
                    {
                        internship: {
                            companyId: company.id,
                        },
                    },
                ],
            },
            orderBy: {
                appliedAt: "desc",
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        studentProfile: {
                            select: {
                                university: true,
                                degree: true,
                                branch: true,
                                graduationYear: true,
                                resumeUrl: true,
                                skills: true,
                                linkedinUrl: true,
                                portfolioUrl: true,
                                hasWorkExperience: true,
                                workExperience: true,
                                projects: true,
                                certifications: true,
                            },
                        },
                    },
                },
                opportunity: {
                    select: {
                        id: true,
                        title: true,
                        category: true,
                        employmentType: true,
                        location: true,
                        isRemote: true,
                        compensation: true,
                        duration: true,
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
                    },
                },
                statusHistory: {
                    orderBy: {
                        createdAt: "asc",
                    },
                },
            },
        });

        const formatted = applications.map(formatApplication);

        return res.status(200).json({
            message: "Applications fetched successfully.",
            total: formatted.length,
            applications: formatted,
        });
    } catch (error) {
        console.error("Fetch employer applications error:", error);

        return res.status(500).json({
            message: "Failed to fetch applications.",
        });
    }
});

// ==========================================
// EMPLOYER RESUME ACCESS
// ==========================================

// GET /api/employer/applications/:applicationId/resume

router.get(
    "/applications/:applicationId/resume",
    async (req, res) => {
        try {
            const { applicationId } = req.params;

            const application = await prisma.application.findFirst({
                where: {
                    id: applicationId,
                    OR: [
                        {
                            opportunity: {
                                company: {
                                    ownerId: req.user.id,
                                },
                            },
                        },
                        {
                            internship: {
                                company: {
                                    ownerId: req.user.id,
                                },
                            },
                        },
                    ],
                },
                select: {
                    id: true,
                    user: {
                        select: {
                            name: true,
                            studentProfile: {
                                select: {
                                    resumeUrl: true,
                                },
                            },
                        },
                    },
                    opportunity: {
                        select: {
                            title: true,
                        },
                    },
                    internship: {
                        select: {
                            title: true,
                        },
                    },
                },
            });

            if (!application) {
                return res.status(404).json({
                    message: "Application not found for your company.",
                });
            }

            const resumeFilename =
                application.user?.studentProfile?.resumeUrl;

            if (!resumeFilename) {
                return res.status(404).json({
                    message: "This student has not uploaded a resume.",
                });
            }

            if (!isValidResumeFilename(resumeFilename)) {
                return res.status(400).json({
                    message: "Invalid resume file reference.",
                });
            }

            const resumePath = path.join(
                RESUME_DIR,
                resumeFilename
            );

            if (!fs.existsSync(resumePath)) {
                return res.status(404).json({
                    message: "Resume file not found.",
                });
            }

            return res.download(
                resumePath,
                `student-resume-${applicationId}.pdf`,
                (error) => {
                    if (error) {
                        console.error(
                            "Employer resume download error:",
                            error
                        );

                        if (!res.headersSent) {
                            res.status(500).json({
                                message: "Failed to download student resume.",
                            });
                        }
                    }
                }
            );
        } catch (error) {
            console.error("Employer resume access error:", error);

            return res.status(500).json({
                message: "Failed to retrieve student resume.",
            });
        }
    }
);

// ==========================================
// UPDATE APPLICATION STATUS
// ==========================================

// PATCH /api/employer/applications/:applicationId/status

router.patch(
    "/applications/:applicationId/status",
    async (req, res) => {
        try {
            const { applicationId } = req.params;
            const { status, note } = req.body || {};

            // Validate status.

            if (!ALLOWED_APPLICATION_STATUSES.includes(status)) {
                return res.status(400).json({
                    message: "Invalid application status.",
                    allowedStatuses: ALLOWED_APPLICATION_STATUSES,
                });
            }

            // Validate optional note.

            if (
                note !== undefined &&
                note !== null &&
                typeof note !== "string"
            ) {
                return res.status(400).json({
                    message: "Status note must be a string.",
                });
            }

            if (
                typeof note === "string" &&
                note.trim().length > 1000
            ) {
                return res.status(400).json({
                    message: "Status note cannot exceed 1,000 characters.",
                });
            }

            // Update application and history together.

            const result = await prisma.$transaction(async (tx) => {
                const application = await tx.application.findFirst({
                    where: {
                        id: applicationId,
                        OR: [
                            {
                                opportunity: {
                                    company: {
                                        ownerId: req.user.id,
                                    },
                                },
                            },
                            {
                                internship: {
                                    company: {
                                        ownerId: req.user.id,
                                    },
                                },
                            },
                        ],
                    },
                    include: {
                        opportunity: {
                            select: {
                                id: true,
                                title: true,
                                category: true,
                                location: true,
                                isRemote: true,
                                compensation: true,
                                duration: true,
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
                            },
                        },
                    },
                });

                if (!application) {
                    return {
                        error: "NOT_FOUND",
                    };
                }

                if (application.status === "WITHDRAWN") {
                    return {
                        error: "WITHDRAWN",
                    };
                }

                // Avoid duplicate history entries and notifications.

                if (application.status === status) {
                    const unchanged = await tx.application.findUnique({
                        where: {
                            id: applicationId,
                        },
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true,
                                },
                            },
                            opportunity: {
                                select: {
                                    id: true,
                                    title: true,
                                    category: true,
                                },
                            },
                            internship: {
                                select: {
                                    id: true,
                                    title: true,
                                },
                            },
                            statusHistory: {
                                orderBy: {
                                    createdAt: "asc",
                                },
                            },
                        },
                    });

                    return {
                        application: unchanged,
                        unchanged: true,
                    };
                }

                // Update current application status.

                await tx.application.update({
                    where: {
                        id: applicationId,
                    },
                    data: {
                        status,
                    },
                });

                // Record status history.

                await tx.applicationStatusHistory.create({
                    data: {
                        applicationId,
                        fromStatus: application.status,
                        toStatus: status,
                        changedById: req.user.id,
                        changedByRole: "EMPLOYER",
                        note:
                            typeof note === "string" && note.trim()
                                ? note.trim()
                                : null,
                    },
                });

                // Fetch updated application.

                const updated = await tx.application.findUnique({
                    where: {
                        id: applicationId,
                    },
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                        opportunity: {
                            select: {
                                id: true,
                                title: true,
                                category: true,
                            },
                        },
                        internship: {
                            select: {
                                id: true,
                                title: true,
                            },
                        },
                        statusHistory: {
                            orderBy: {
                                createdAt: "asc",
                            },
                        },
                    },
                });

                return {
                    application: updated,
                    unchanged: false,
                };
            });

            // Handle application lookup errors.

            if (result.error === "NOT_FOUND") {
                return res.status(404).json({
                    message: "Application not found for your company.",
                });
            }

            if (result.error === "WITHDRAWN") {
                return res.status(400).json({
                    message: "A withdrawn application cannot be updated.",
                });
            }

            // ======================================
            // CREATE STUDENT NOTIFICATION
            // ======================================

            // Only notify when the status actually changes.

            if (!result.unchanged) {
                try {
                    const application = result.application;

                    const opportunityTitle =
                        application.opportunity?.title ||
                        application.internship?.title ||
                        "your opportunity";

                    await notifyApplicationStatus({
                        userId: application.user.id,
                        applicationId: application.id,
                        opportunityTitle,
                        status: application.status,
                    });
                } catch (notificationError) {
                    // Notification failure must not undo
                    // a successful application status update.

                    console.error(
                        "Application notification error:",
                        notificationError
                    );
                }
            }

            return res.status(200).json({
                message: result.unchanged
                    ? "Application already has this status."
                    : "Application status updated successfully.",
                application: formatApplication(result.application),
            });
        } catch (error) {
            console.error("Update application status error:", error);

            return res.status(500).json({
                message: "Failed to update application status.",
            });
        }
    }
);

// ==========================================
// EXPORT ROUTER
// ==========================================

module.exports = router;