require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

require("./db/database");

const authRoutes = require("./routes/auth");
const internshipRoutes = require("./routes/internships");
const applicationRoutes = require("./routes/applications");
const dashboardRoutes = require("./routes/dashboards");
const adminRoutes = require("./routes/admin");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "internship-rbac-api" });
});

app.use("/api/auth", authRoutes);
app.use("/api/internships", internshipRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/admin", adminRoutes);

app.use(express.static(path.resolve(__dirname, "../../frontend")));

app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({
      error: { code: "NOT_FOUND", message: "API route not found." }
    });
  }
  res.sendFile(path.resolve(__dirname, "../../frontend/index.html"));
});

module.exports = app;
