const express = require("express");
const db = require("../db/database");
const { authenticate, requireRole, requireOwnership } = require("../middleware/auth");

const router = express.Router();

function loadApplication(req) {
  return db.prepare(`
    SELECT a.*, i.company_id
    FROM applications a
    JOIN internships i ON i.id = a.internship_id
    WHERE a.id = ?
  `).get(req.params.id);
}

router.get("/", authenticate, (req, res) => {
  if (req.user.role === "admin") {
    const applications = db.prepare(`
      SELECT a.*, i.title, i.company_id, s.name AS student_name
      FROM applications a
      JOIN internships i ON i.id=a.internship_id
      JOIN users s ON s.id=a.student_id
      ORDER BY a.id DESC
    `).all();
    return res.json({ applications });
  }

  if (req.user.role === "student") {
    const applications = db.prepare(`
      SELECT a.*, i.title, i.company_id, c.name AS company_name
      FROM applications a
      JOIN internships i ON i.id=a.internship_id
      JOIN users c ON c.id=i.company_id
      WHERE a.student_id=?
      ORDER BY a.id DESC
    `).all(req.user.id);
    return res.json({ applications });
  }

  const applications = db.prepare(`
    SELECT a.*, i.title, a.student_id, s.name AS student_name
    FROM applications a
    JOIN internships i ON i.id=a.internship_id
    JOIN users s ON s.id=a.student_id
    WHERE i.company_id=?
    ORDER BY a.id DESC
  `).all(req.user.id);

  res.json({ applications });
});

router.get("/:id",
  authenticate,
  (req, res) => {
    const application = loadApplication(req);
    if (!application) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Application not found." }
      });
    }

    const allowed =
      req.user.role === "admin" ||
      (req.user.role === "student" && application.student_id === req.user.id) ||
      (req.user.role === "company" && application.company_id === req.user.id);

    if (!allowed) {
      return res.status(403).json({
        error: { code: "FORBIDDEN", message: "You cannot view this application." }
      });
    }

    res.json({ application });
  }
);

router.patch("/:id/status",
  authenticate,
  requireRole("company", "admin"),
  (req, res) => {
    const application = loadApplication(req);
    if (!application) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Application not found." }
      });
    }

    if (req.user.role !== "admin" && application.company_id !== req.user.id) {
      return res.status(403).json({
        error: { code: "FORBIDDEN", message: "You can only update applications to your own postings." }
      });
    }

    const allowed = ["pending", "reviewing", "accepted", "rejected", "withdrawn"];
    if (!allowed.includes(req.body?.status)) {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "Invalid application status." }
      });
    }

    db.prepare("UPDATE applications SET status=? WHERE id=?")
      .run(req.body.status, application.id);

    res.json({
      application: loadApplication(req)
    });
  }
);

router.post("/:id/withdraw",
  authenticate,
  requireRole("student"),
  requireOwnership(loadApplication, "student_id"),
  (req, res) => {
    db.prepare("UPDATE applications SET status='withdrawn' WHERE id=?")
      .run(req.authorizedResource.id);

    res.json({ application: loadApplication(req) });
  }
);

module.exports = router;
