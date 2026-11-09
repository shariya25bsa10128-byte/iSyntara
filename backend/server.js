
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

// ==========================================
// ROUTES
// ==========================================

const authRoutes = require("./routes/auth");
const studentRoutes = require("./routes/student");
const employerRoutes = require("./routes/employer");
const internshipRoutes = require("./routes/internship");
const applicationRoutes = require("./routes/applications");
const notificationRoutes = require("./routes/notifications");

// ==========================================
// GLOBAL MIDDLEWARE
// ==========================================

app.use(cors());
app.use(express.json());


// ==========================================
// API HEALTH CHECK
// ==========================================

app.get("/", (req, res) => {
    res.json({
        message: "Welcome to the iSyntara API 🚀",
        status: "Backend is running",
    });
});

// ==========================================
// AUTHENTICATION
// ==========================================

app.use("/api/auth", authRoutes);

// ==========================================
// STUDENT ROUTES
// ==========================================

app.use("/api/student", studentRoutes);

// ==========================================
// EMPLOYER ROUTES
// ==========================================

app.use("/api/employer", employerRoutes);

// ==========================================
// OPPORTUNITY ROUTES
// ==========================================

// New unified opportunity endpoint
app.use("/api/opportunities", internshipRoutes);

// Legacy internship endpoint (backward compatibility)
app.use("/api/internships", internshipRoutes);

// ==========================================
// APPLICATION ROUTES
// ==========================================

app.use("/api/applications", applicationRoutes);
app.use("/api/notifications", notificationRoutes);

// ==========================================
// SERVER
// ==========================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`iSyntara backend running on http://localhost:${PORT}`);
});
