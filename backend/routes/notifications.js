const express = require("express");
const router = express.Router();

const prisma = require("../prisma");
const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);

// GET /api/notifications
// Fetch notifications for the logged-in user.

router.get("/", async (req, res) => {
    try {
        const notifications = await prisma.notification.findMany({
            where: {
                userId: req.user.id,
            },
            orderBy: {
                createdAt: "desc",
            },
            take: 50,
        });

        const unreadCount = await prisma.notification.count({
    where: {
        userId: req.user.id,
        isRead: false,
    },
});

        return res.status(200).json({
            notifications,
            unreadCount,
        });
    } catch (error) {
        console.error("Fetch notifications error:", error);

        return res.status(500).json({
            message: "Failed to fetch notifications.",
        });
    }
});

// PATCH /api/notifications/:id/read
// Mark one notification as read.

router.patch("/:id/read", async (req, res) => {
    try {
        const result = await prisma.notification.updateMany({
            where: {
                id: req.params.id,
                userId: req.user.id,
                isRead: false,
            },
            data: {
                isRead: true,
            },
        });

        if (result.count === 0) {
            const notification = await prisma.notification.findFirst({
                where: {
                    id: req.params.id,
                    userId: req.user.id,
                },
            });

            if (!notification) {
                return res.status(404).json({
                    message: "Notification not found.",
                });
            }
        }

        return res.status(200).json({
            message: "Notification marked as read.",
        });
    } catch (error) {
        console.error("Mark notification read error:", error);

        return res.status(500).json({
            message: "Failed to update notification.",
        });
    }
});

// PATCH /api/notifications/read-all
// Mark all notifications as read.

router.patch("/read-all", async (req, res) => {
    try {
        await prisma.notification.updateMany({
            where: {
                userId: req.user.id,
                isRead: false,
            },
            data: {
                isRead: true,
            },
        });

        return res.status(200).json({
            message: "All notifications marked as read.",
        });
    } catch (error) {
        console.error("Mark all notifications read error:", error);

        return res.status(500).json({
            message: "Failed to update notifications.",
        });
    }
});

module.exports = router;