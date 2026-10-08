const express = require("express");
const db = require("../db/database");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate, requireRole("admin"));

router.get("/users", (req, res) => {
  const users = db.prepare(`
    SELECT id,name,email,role,is_active,created_at
    FROM users ORDER BY id DESC
  `).all();
  res.json({ users });
});

router.get("/internships", (req, res) => {
  const internships = db.prepare(`
    SELECT i.*, u.name AS company_name, u.email AS company_email
    FROM internships i
    JOIN users u ON u.id=i.company_id
    ORDER BY i.id DESC
  `).all();
  res.json({ internships });
});

router.patch("/users/:id/status", (req, res) => {
  const user = db.prepare("SELECT id FROM users WHERE id=?").get(req.params.id);
  if (!user) return res.status(404).json({
    error: { code: "NOT_FOUND", message: "User not found." }
  });

  const isActive = req.body?.is_active ? 1 : 0;
  db.prepare("UPDATE users SET is_active=? WHERE id=?").run(isActive, user.id);

  res.json({
    user: db.prepare("SELECT id,name,email,role,is_active FROM users WHERE id=?").get(user.id)
  });
});

router.patch("/internships/:id/status", (req, res) => {
  const internship = db.prepare("SELECT id FROM internships WHERE id=?").get(req.params.id);
  if (!internship) return res.status(404).json({
    error: { code: "NOT_FOUND", message: "Internship not found." }
  });

  const isActive = req.body?.is_active ? 1 : 0;
  db.prepare("UPDATE internships SET is_active=? WHERE id=?")
    .run(isActive, internship.id);

  res.json({
    internship: db.prepare("SELECT * FROM internships WHERE id=?").get(internship.id)
  });
});

module.exports = router;
