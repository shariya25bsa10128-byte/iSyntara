
const prisma = require("../prisma");

// ==========================================
// CREATE NOTIFICATION
// ==========================================

const createNotification = async ({
    userId,
    title,
    message,
    type = "GENERAL",
    link = null,
}) => {
    if (!userId || !title || !message) {
        throw new Error(
            "userId, title and message are required."
        );
    }

    return prisma.notification.create({
        data: {
            userId,
            title,
            message,
            type,
            link,
        },
    });
};

// ==========================================
// APPLICATION STATUS NOTIFICATION
// ==========================================

const notifyApplicationStatus = async ({
    userId,
    applicationId,
    opportunityTitle,
    status,
}) => {
    const statusMessages = {
        REVIEWED: "Your application has been reviewed.",
        SHORTLISTED: "Congratulations! You have been shortlisted.",
        INTERVIEW: "You have been selected for an interview.",
        ACCEPTED: "Congratulations! Your application has been accepted.",
        REJECTED: "Your application was not selected this time.",
        WITHDRAWN: "Your application has been withdrawn.",
    };

    const message = statusMessages[status];

    if (!message) {
        throw new Error(
            `Unsupported application status: ${status}`
        );
    }

    return createNotification({
        userId,
        title: `Application ${status.toLowerCase()}`,
        message: `${message} Opportunity: ${opportunityTitle}.`,
        type: "APPLICATION_STATUS",
        link: "/student/applications",
    });
};

// ==========================================
// EXPORT
// ==========================================

module.exports = {
    createNotification,
    notifyApplicationStatus,
};
