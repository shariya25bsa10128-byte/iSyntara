
const express = require("express");
const prisma = require("../prisma");

const router = express.Router();

// ==========================================
// VALID OPPORTUNITY FILTERS
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

// ==========================================
// SHARED OPPORTUNITY SELECT
// ==========================================

const opportunitySelect = {
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
    createdAt: true,

    company: {
        select: {
            id: true,
            name: true,
            description: true,
            website: true,
            industry: true,
            location: true,
            logoUrl: true,
        },
    },
};

// ==========================================
// HELPERS
// ==========================================

function getQueryString(value) {
    return typeof value === "string" ? value.trim() : "";
}

// Preserve compatibility with the old internship frontend.
function formatOpportunity(opportunity) {
    return {
        ...opportunity,

        // Legacy frontend compatibility
        internshipType: opportunity.employmentType,
        stipend: opportunity.compensation,
    };
}

function parseEnumFilter(value, allowedValues, fieldName) {
    if (!value) {
        return {
            values: [],
            error: null,
        };
    }

    const values = value
        .split(",")
        .map((item) => item.trim().toUpperCase())
        .filter(Boolean);

    const uniqueValues = [...new Set(values)];

    const invalidValues = uniqueValues.filter(
        (item) => !allowedValues.includes(item)
    );

    if (invalidValues.length > 0) {
        return {
            values: [],
            error: `Invalid ${fieldName}: ${invalidValues.join(", ")}`,
        };
    }

    return {
        values: uniqueValues,
        error: null,
    };
}

// ==========================================
// GET /api/internships
// GET /api/opportunities
//
// Browse active opportunities
// ==========================================

router.get("/", async (req, res) => {
    try {
        const {
            search,
            location,
            remote,
            category,
            employmentType,
            page = 1,
            limit = 10,
        } = req.query;

        // ------------------------------
        // PAGINATION
        // ------------------------------

        const pageNumber = Math.max(
            parseInt(page, 10) || 1,
            1
        );

        const limitNumber = Math.min(
            Math.max(parseInt(limit, 10) || 10, 1),
            50
        );

        const skip = (pageNumber - 1) * limitNumber;

        // ------------------------------
        // VALIDATE CATEGORY
        // ------------------------------

        if (category && typeof category !== "string") {
            return res.status(400).json({
                message: "Invalid category filter.",
            });
        }

        const categoryFilter = parseEnumFilter(
            category,
            VALID_CATEGORIES,
            "category"
        );

        if (categoryFilter.error) {
            return res.status(400).json({
                message: categoryFilter.error,
            });
        }

        // ------------------------------
        // VALIDATE EMPLOYMENT TYPE
        // ------------------------------

        if (
            employmentType &&
            typeof employmentType !== "string"
        ) {
            return res.status(400).json({
                message: "Invalid employment type filter.",
            });
        }

        const employmentFilter = parseEnumFilter(
            employmentType,
            VALID_EMPLOYMENT_TYPES,
            "employment type"
        );

        if (employmentFilter.error) {
            return res.status(400).json({
                message: employmentFilter.error,
            });
        }

        // ------------------------------
        // BUILD DATABASE FILTER
        // ------------------------------

        const where = {
            isActive: true,
        };

        const searchTerm = getQueryString(search);
        const locationTerm = getQueryString(location);

        if (searchTerm) {
            where.OR = [
                {
                    title: {
                        contains: searchTerm,
                        mode: "insensitive",
                    },
                },
                {
                    description: {
                        contains: searchTerm,
                        mode: "insensitive",
                    },
                },
                {
                    requirements: {
                        contains: searchTerm,
                        mode: "insensitive",
                    },
                },
                {
                    company: {
                        name: {
                            contains: searchTerm,
                            mode: "insensitive",
                        },
                    },
                },
            ];
        }

        if (locationTerm) {
            where.location = {
                contains: locationTerm,
                mode: "insensitive",
            };
        }

        if (remote === "true") {
            where.isRemote = true;
        } else if (remote === "false") {
            where.isRemote = false;
        }

        if (categoryFilter.values.length === 1) {
            where.category = categoryFilter.values[0];
        } else if (categoryFilter.values.length > 1) {
            where.category = {
                in: categoryFilter.values,
            };
        }

        if (employmentFilter.values.length === 1) {
            where.employmentType = employmentFilter.values[0];
        } else if (employmentFilter.values.length > 1) {
            where.employmentType = {
                in: employmentFilter.values,
            };
        }

        // ------------------------------
        // FETCH OPPORTUNITIES
        // ------------------------------

        const [opportunities, total] = await Promise.all([
            prisma.opportunity.findMany({
                where,
                skip,
                take: limitNumber,
                orderBy: {
                    createdAt: "desc",
                },
                select: opportunitySelect,
            }),

            prisma.opportunity.count({
                where,
            }),
        ]);

        const formattedOpportunities = opportunities.map(
            formatOpportunity
        );

        // ------------------------------
        // RESPONSE
        // ------------------------------

        return res.status(200).json({
            message: "Opportunities fetched successfully.",

            // New API response
            opportunities: formattedOpportunities,

            // Legacy frontend compatibility
            internships: formattedOpportunities,

            pagination: {
                page: pageNumber,
                limit: limitNumber,
                total,
                totalPages: Math.ceil(total / limitNumber),
            },
        });
    } catch (error) {
        console.error("Fetch opportunities error:", error);

        return res.status(500).json({
            message: "Failed to fetch opportunities.",
        });
    }
});

// ==========================================
// GET /api/internships/:id
// GET /api/opportunities/:id
//
// Fetch one active opportunity
// ==========================================

router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const opportunity = await prisma.opportunity.findFirst({
            where: {
                id,
                isActive: true,
            },
            select: opportunitySelect,
        });

        if (!opportunity) {
            return res.status(404).json({
                message: "Opportunity not found or no longer available.",
            });
        }

        const formattedOpportunity = formatOpportunity(opportunity);

        return res.status(200).json({
            message: "Opportunity fetched successfully.",

            // New API response
            opportunity: formattedOpportunity,

            // Legacy frontend compatibility
            internship: formattedOpportunity,
        });
    } catch (error) {
        console.error("Fetch opportunity details error:", error);

        return res.status(500).json({
            message: "Failed to fetch opportunity details.",
        });
    }
});

module.exports = router;
