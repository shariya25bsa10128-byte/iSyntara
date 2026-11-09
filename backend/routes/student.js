
const express = require("express");
const router = express.Router();

const prisma = require("../prisma");
const protect = require("../middleware/authMiddleware");

const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");

// ==========================================
// CONFIGURATION
// ==========================================

const RESUME_DIR = path.join(__dirname, "..", "uploads", "resumes");
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const isManagedResume = (filename) => {
    return (
        typeof filename === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/i.test(filename)
    );
};

// ==========================================
// COMMON VALIDATION HELPERS
// ==========================================

const isPlainObject = (value) =>
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value);

const isValidMonth = (value) => {
    if (typeof value !== "string") return false;

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
        return false;
    }

    return true;
};

const isValidOptionalDate = (value) => {
    if (value === undefined || value === null || value === "") {
        return true;
    }

    return (
        typeof value === "string" &&
        (
            isValidMonth(value) ||
            (
                /^\d{4}-\d{2}-\d{2}$/.test(value) &&
                !Number.isNaN(Date.parse(value))
            )
        )
    );
};

const isValidOptionalUrl = (value) => {
    if (value === undefined || value === null || value === "") {
        return true;
    }

    if (typeof value !== "string") return false;

    try {
        const parsed = new URL(value);
        return ["http:", "https:"].includes(parsed.protocol);
    } catch {
        return false;
    }
};

const isStringArray = (value) =>
    Array.isArray(value) &&
    value.every((item) => typeof item === "string");

// ==========================================
// MULTER CONFIGURATION
// ==========================================

const upload = multer({
    storage: multer.memoryStorage(),

    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1,
    },

    fileFilter: (req, file, callback) => {
        if (file.mimetype !== "application/pdf") {
            return callback(
                new Error("Only PDF files are allowed.")
            );
        }

        callback(null, true);
    },
});

const handleResumeUpload = (req, res, next) => {
    upload.single("resume")(req, res, (error) => {
        if (error instanceof multer.MulterError) {
            if (error.code === "LIMIT_FILE_SIZE") {
                return res.status(400).json({
                    message: "Resume must not exceed 5 MB.",
                });
            }

            return res.status(400).json({
                message: error.message,
            });
        }

        if (error) {
            return res.status(400).json({
                message: error.message || "Resume upload failed.",
            });
        }

        next();
    });
};

// ==========================================
// STUDENT ROLE CHECK
// ==========================================

const studentOnly = (req, res, next) => {
    if (req.user.role !== "STUDENT") {
        return res.status(403).json({
            message: "Access denied. Student account required.",
        });
    }

    next();
};

// ==========================================
// WORK EXPERIENCE VALIDATION
// ==========================================

const allowedEmploymentTypes = [
    "INTERNSHIP",
    "FULL_TIME",
    "PART_TIME",
    "CONTRACT",
    "FREELANCE",
    "OTHER",
];

const validateWorkExperience = (
    hasWorkExperience,
    workExperience
) => {
    if (
        hasWorkExperience !== undefined &&
        typeof hasWorkExperience !== "boolean"
    ) {
        return "hasWorkExperience must be true or false.";
    }

    if (
        workExperience !== undefined &&
        !Array.isArray(workExperience)
    ) {
        return "Work experience must be an array.";
    }

    if (workExperience === undefined) {
        return null;
    }

    if (
        hasWorkExperience === false &&
        workExperience.length > 0
    ) {
        return "Turn on work experience before adding entries.";
    }

    if (
        hasWorkExperience === true &&
        workExperience.length === 0
    ) {
        return "Please add at least one work experience.";
    }

    for (const experience of workExperience) {
        if (!isPlainObject(experience)) {
            return "Invalid work experience entry.";
        }

        const requiredFields = [
            "company",
            "jobTitle",
            "employmentType",
            "location",
            "startDate",
            "responsibilities",
        ];

        for (const field of requiredFields) {
            if (
                typeof experience[field] !== "string" ||
                !experience[field].trim()
            ) {
                return `${field} is required for every experience.`;
            }
        }

        if (
            !allowedEmploymentTypes.includes(
                experience.employmentType
            )
        ) {
            return "Please select a valid employment type.";
        }

        if (!isValidMonth(experience.startDate)) {
            return "Please provide a valid start date.";
        }

        if (typeof experience.currentlyWorking !== "boolean") {
            return "Please specify whether you currently work here.";
        }

        if (experience.currentlyWorking) {
            if (experience.endDate) {
                return "End date must be empty for your current experience.";
            }
        } else {
            if (!isValidMonth(experience.endDate)) {
                return "Please provide a valid end date.";
            }

            if (experience.endDate < experience.startDate) {
                return "End date cannot be before start date.";
            }
        }

        if (
            experience.skills !== undefined &&
            !isStringArray(experience.skills)
        ) {
            return "Experience skills must be an array of strings.";
        }
    }

    return null;
};

// ==========================================
// PROJECT VALIDATION
// ==========================================

const validateProjects = (projects) => {
    if (projects === undefined) return null;

    if (!Array.isArray(projects)) {
        return "Projects must be an array.";
    }

    if (projects.length > 30) {
        return "You can add a maximum of 30 projects.";
    }

    for (const project of projects) {
        if (!isPlainObject(project)) {
            return "Invalid project entry.";
        }

        if (
            typeof project.title !== "string" ||
            !project.title.trim()
        ) {
            return "Project title is required.";
        }

        if (
            typeof project.description !== "string" ||
            !project.description.trim()
        ) {
            return "Project description is required.";
        }

        if (
            project.technologies !== undefined &&
            !isStringArray(project.technologies)
        ) {
            return "Project technologies must be an array of strings.";
        }

        if (!isValidOptionalUrl(project.projectUrl)) {
            return "Please provide a valid project URL.";
        }

        if (!isValidOptionalUrl(project.githubUrl)) {
            return "Please provide a valid GitHub URL.";
        }

        if (!isValidOptionalDate(project.startDate)) {
            return "Please provide a valid project start date.";
        }

        if (!isValidOptionalDate(project.endDate)) {
            return "Please provide a valid project end date.";
        }

        if (
            project.startDate &&
            project.endDate &&
            project.endDate < project.startDate
        ) {
            return "Project end date cannot be before its start date.";
        }
    }

    return null;
};

// ==========================================
// CERTIFICATION VALIDATION
// ==========================================

const validateCertifications = (certifications) => {
    if (certifications === undefined) return null;

    if (!Array.isArray(certifications)) {
        return "Certifications must be an array.";
    }

    if (certifications.length > 30) {
        return "You can add a maximum of 30 certifications.";
    }

    for (const certification of certifications) {
        if (!isPlainObject(certification)) {
            return "Invalid certification entry.";
        }

        if (
            typeof certification.name !== "string" ||
            !certification.name.trim()
        ) {
            return "Certification name is required.";
        }

        if (
            typeof certification.issuer !== "string" ||
            !certification.issuer.trim()
        ) {
            return "Certification issuing organization is required.";
        }

        if (!isValidOptionalDate(certification.issueDate)) {
            return "Please provide a valid certification issue date.";
        }

        if (!isValidOptionalDate(certification.expiryDate)) {
            return "Please provide a valid certification expiry date.";
        }

        if (
            certification.issueDate &&
            certification.expiryDate &&
            certification.expiryDate < certification.issueDate
        ) {
            return "Certification expiry date cannot be before its issue date.";
        }

        if (
            certification.credentialId !== undefined &&
            certification.credentialId !== null &&
            typeof certification.credentialId !== "string"
        ) {
            return "Credential ID must be a string.";
        }

        if (!isValidOptionalUrl(certification.credentialUrl)) {
            return "Please provide a valid certification verification URL.";
        }
    }

    return null;
};

// ==========================================
// GET STUDENT PROFILE
// GET /api/student/profile
// ==========================================

router.get("/profile", protect, studentOnly, async (req, res) => {
    try {
        const profile = await prisma.studentProfile.upsert({
            where: {
                userId: req.user.id,
            },

            update: {},

            create: {
                userId: req.user.id,
                skills: [],
                hasWorkExperience: false,
                workExperience: [],
                projects: [],
                certifications: [],
            },

            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        return res.status(200).json({
            message: "Student profile retrieved successfully.",
            profile,
        });
    } catch (error) {
        console.error("Get student profile error:", error);

        return res.status(500).json({
            message: "Something went wrong while retrieving the profile.",
        });
    }
});

// ==========================================
// CREATE OR UPDATE STUDENT PROFILE
// PUT /api/student/profile
// ==========================================

router.put("/profile", protect, studentOnly, async (req, res) => {
    try {
        const {
            university,
            degree,
            branch,
            graduationYear,
            resumeUrl,
            skills,
            linkedinUrl,
            portfolioUrl,
            hasWorkExperience,
            workExperience,
            projects,
            certifications,
        } = req.body;

        // Validate skills
        if (
            skills !== undefined &&
            !isStringArray(skills)
        ) {
            return res.status(400).json({
                message: "Skills must be an array of strings.",
            });
        }

        // Validate graduation year
        if (
            graduationYear !== undefined &&
            graduationYear !== null
        ) {
            const year = Number(graduationYear);

            if (
                !Number.isInteger(year) ||
                year < 1900 ||
                year > 2200
            ) {
                return res.status(400).json({
                    message: "Please provide a valid graduation year.",
                });
            }
        }

        // Validate string fields
        for (const [field, value] of Object.entries({
            university,
            degree,
            branch,
            resumeUrl,
            linkedinUrl,
            portfolioUrl,
        })) {
            if (
                value !== undefined &&
                value !== null &&
                typeof value !== "string"
            ) {
                return res.status(400).json({
                    message: `${field} must be a string or null.`,
                });
            }
        }

        // Validate work experience
        const experienceError = validateWorkExperience(
            hasWorkExperience,
            workExperience
        );

        if (experienceError) {
            return res.status(400).json({
                message: experienceError,
            });
        }

        // Validate projects
        const projectError = validateProjects(projects);

        if (projectError) {
            return res.status(400).json({
                message: projectError,
            });
        }

        // Validate certifications
        const certificationError =
            validateCertifications(certifications);

        if (certificationError) {
            return res.status(400).json({
                message: certificationError,
            });
        }

        // Build update object.
        // Fields not supplied by the frontend remain unchanged.
        const profileData = {
            ...(university !== undefined && { university }),
            ...(degree !== undefined && { degree }),
            ...(branch !== undefined && { branch }),

            ...(graduationYear !== undefined && {
                graduationYear:
                    graduationYear === null
                        ? null
                        : Number(graduationYear),
            }),

            ...(resumeUrl !== undefined && { resumeUrl }),
            ...(skills !== undefined && { skills }),
            ...(linkedinUrl !== undefined && { linkedinUrl }),
            ...(portfolioUrl !== undefined && { portfolioUrl }),

            ...(hasWorkExperience !== undefined && {
                hasWorkExperience,
            }),

            ...(workExperience !== undefined && {
                workExperience,
            }),

            ...(projects !== undefined && {
                projects,
            }),

            ...(certifications !== undefined && {
                certifications,
            }),
        };

        const profile = await prisma.studentProfile.upsert({
            where: {
                userId: req.user.id,
            },

            update: profileData,

            create: {
                userId: req.user.id,

                university: university ?? null,
                degree: degree ?? null,
                branch: branch ?? null,

                graduationYear:
                    graduationYear == null
                        ? null
                        : Number(graduationYear),

                resumeUrl: resumeUrl ?? null,
                skills: skills ?? [],
                linkedinUrl: linkedinUrl ?? null,
                portfolioUrl: portfolioUrl ?? null,

                hasWorkExperience: hasWorkExperience ?? false,
                workExperience: workExperience ?? [],

                projects: projects ?? [],
                certifications: certifications ?? [],
            },
        });

        return res.status(200).json({
            message: "Student profile saved successfully.",
            profile,
        });
    } catch (error) {
        console.error("Save student profile error:", error);

        return res.status(500).json({
            message: "Something went wrong while saving the profile.",
        });
    }
});

// ==========================================
// UPLOAD STUDENT RESUME
// POST /api/student/resume
// ==========================================

router.post(
    "/resume",
    protect,
    studentOnly,
    handleResumeUpload,
    async (req, res) => {
        let newFilePath = null;

        try {
            if (!req.file) {
                return res.status(400).json({
                    message: "Please select a PDF resume to upload.",
                });
            }

            const pdfSignature = req.file.buffer
                .subarray(0, 5)
                .toString("ascii");

            if (pdfSignature !== "%PDF-") {
                return res.status(400).json({
                    message: "Invalid PDF file. Please upload a genuine PDF.",
                });
            }

            const existingProfile = await prisma.studentProfile.findUnique({
                where: {
                    userId: req.user.id,
                },
            });

            await fs.promises.mkdir(RESUME_DIR, {
                recursive: true,
            });

            const filename = `${randomUUID()}.pdf`;
            newFilePath = path.join(RESUME_DIR, filename);

            await fs.promises.writeFile(
                newFilePath,
                req.file.buffer,
                { flag: "wx" }
            );

            const profile = await prisma.studentProfile.upsert({
                where: {
                    userId: req.user.id,
                },

                update: {
                    resumeUrl: filename,
                },

                create: {
                    userId: req.user.id,
                    resumeUrl: filename,
                    skills: [],
                    hasWorkExperience: false,
                    workExperience: [],
                    projects: [],
                    certifications: [],
                },
            });

            // Delete the previous managed resume after successful upload.
            if (
                existingProfile &&
                isManagedResume(existingProfile.resumeUrl) &&
                existingProfile.resumeUrl !== filename
            ) {
                const oldFilePath = path.join(
                    RESUME_DIR,
                    existingProfile.resumeUrl
                );

                try {
                    await fs.promises.unlink(oldFilePath);
                } catch (error) {
                    if (error.code !== "ENOENT") {
                        console.error("Old resume cleanup error:", error);
                    }
                }
            }

            return res.status(201).json({
                message: "Resume uploaded successfully.",
                resumeUrl: "/api/student/resume",
                profile,
            });
        } catch (error) {
            console.error("Resume upload error:", error);

            if (newFilePath) {
                try {
                    await fs.promises.unlink(newFilePath);
                } catch (cleanupError) {
                    console.error("Resume cleanup error:", cleanupError);
                }
            }

            return res.status(500).json({
                message: "Failed to upload resume.",
            });
        }
    }
);

// ==========================================
// VIEW / DOWNLOAD STUDENT RESUME
// GET /api/student/resume
// ==========================================

router.get("/resume", protect, studentOnly, async (req, res) => {
    try {
        const profile = await prisma.studentProfile.findUnique({
            where: {
                userId: req.user.id,
            },
        });

        if (!profile || !isManagedResume(profile.resumeUrl)) {
            return res.status(404).json({
                message: "No uploaded resume found.",
            });
        }

        const filePath = path.join(RESUME_DIR, profile.resumeUrl);

        try {
            await fs.promises.access(filePath, fs.constants.R_OK);
        } catch {
            return res.status(404).json({
                message: "Resume file not found on the server.",
            });
        }

        res.setHeader("Content-Type", "application/pdf");

        res.setHeader(
            "Content-Disposition",
            'inline; filename="resume.pdf"'
        );

        res.setHeader("X-Content-Type-Options", "nosniff");

        return res.sendFile(filePath);
    } catch (error) {
        console.error("Get resume error:", error);

        return res.status(500).json({
            message: "Failed to retrieve resume.",
        });
    }
});

// ==========================================
// DELETE STUDENT RESUME
// DELETE /api/student/resume
// ==========================================

router.delete("/resume", protect, studentOnly, async (req, res) => {
    try {
        const profile = await prisma.studentProfile.findUnique({
            where: {
                userId: req.user.id,
            },
        });

        if (!profile || !profile.resumeUrl) {
            return res.status(404).json({
                message: "No resume found to delete.",
            });
        }

        await prisma.studentProfile.update({
            where: {
                userId: req.user.id,
            },

            data: {
                resumeUrl: null,
            },
        });

        if (isManagedResume(profile.resumeUrl)) {
            const filePath = path.join(RESUME_DIR, profile.resumeUrl);

            try {
                await fs.promises.unlink(filePath);
            } catch (error) {
                if (error.code !== "ENOENT") {
                    console.error("Resume deletion error:", error);
                }
            }
        }

        return res.status(200).json({
            message: "Resume deleted successfully.",
        });
    } catch (error) {
        console.error("Delete resume error:", error);

        return res.status(500).json({
            message: "Failed to delete resume.",
        });
    }
});

module.exports = router;
