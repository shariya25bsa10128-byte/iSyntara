
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const prisma = require("../prisma");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

// ==========================================
// REGISTER STUDENT OR EMPLOYER
// POST /api/auth/register
// ==========================================

router.post("/register", async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Name, email, and password are required.",
            });
        }

        // Validate name
        if (typeof name !== "string" || !name.trim()) {
            return res.status(400).json({
                message: "Please provide a valid name.",
            });
        }

        // Validate email type and format
        if (typeof email !== "string") {
            return res.status(400).json({
                message: "Please provide a valid email address.",
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(normalizedEmail)) {
            return res.status(400).json({
                message: "Please provide a valid email address.",
            });
        }

        // Validate password
        if (typeof password !== "string" || password.length < 8) {
            return res.status(400).json({
                message: "Password must be at least 8 characters long.",
            });
        }

        // Validate registration role
        const selectedRole = role || "STUDENT";

        if (!["STUDENT", "EMPLOYER"].includes(selectedRole)) {
            return res.status(400).json({
                message: "Role must be STUDENT or EMPLOYER.",
            });
        }

        // Check whether email already exists
        const existingUser = await prisma.user.findUnique({
            where: {
                email: normalizedEmail,
            },
        });

        if (existingUser) {
            return res.status(409).json({
                message: "An account with this email already exists.",
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user and student profile together
        const user = await prisma.user.create({
            data: {
                name: name.trim(),
                email: normalizedEmail,
                password: hashedPassword,
                role: selectedRole,

                // Automatically create a profile for students
                ...(selectedRole === "STUDENT" && {
                    studentProfile: {
                        create: {
                            skills: [],
                        },
                    },
                }),
            },

            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
            },
        });

        return res.status(201).json({
            message: "Registration successful!",
            user,
        });

    } catch (error) {
        // Handle duplicate email
        if (error.code === "P2002") {
            return res.status(409).json({
                message: "An account with this email already exists.",
            });
        }

        console.error("Registration error:", error);

        return res.status(500).json({
            message: "Something went wrong during registration.",
        });
    }
});


// ==========================================
// LOGIN STUDENT OR EMPLOYER
// POST /api/auth/login
// ==========================================

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required.",
            });
        }

        if (
            typeof email !== "string" ||
            typeof password !== "string"
        ) {
            return res.status(400).json({
                message: "Invalid email or password format.",
            });
        }

        // Find user
        const user = await prisma.user.findUnique({
            where: {
                email: email.toLowerCase().trim(),
            },
        });

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password.",
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordValid) {
            return res.status(401).json({
                message: "Invalid email or password.",
            });
        }

        // Generate JWT
        const token = jwt.sign(
            {
                userId: user.id,
                role: user.role,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES_IN || "7d",
            }
        );

        return res.status(200).json({
            message: "Login successful!",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });

    } catch (error) {
        console.error("Login error:", error);

        return res.status(500).json({
            message: "Something went wrong during login.",
        });
    }
});


// ==========================================
// GET CURRENTLY LOGGED-IN USER
// GET /api/auth/me
// Requires JWT authentication
// ==========================================

router.get("/me", protect, (req, res) => {
    return res.status(200).json({
        message: "Authenticated successfully!",
        user: req.user,
    });
});


// ==========================================
// EXPORT ROUTER
// ==========================================

module.exports = router;
