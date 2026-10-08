const express = require("express");
const db = require("../db/database");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/company", authenticate, requireRole("company"), (req, res) => {
  const internships = db.prepare(`
    SELECT * FROM internships WHERE company_id=? ORDER BY id DESC
  `).all(req.user.id);

  const applications = db.prepare(`
    SELECT a.*, i.title, s.name AS student_name, s.email AS student_email
    FROM applications a
    JOIN internships i ON i.id=a.internship_id
    JOIN users s ON s.id=a.student_id
    WHERE i.company_id=?
    ORDER BY a.id DESC
  `).all(req.user.id);

  res.json({ internships, applications });
});

router.get("/student", authenticate, requireRole("student"), (req, res) => {
  const applications = db.prepare(`
    SELECT a.*, i.title, i.location, c.name AS company_name
    FROM applications a
    JOIN internships i ON i.id=a.internship_id
    JOIN users c ON c.id=i.company_id
    WHERE a.student_id=?
    ORDER BY a.id DESC
  `).all(req.user.id);

  res.json({ applications });
});

module.exports = router;
