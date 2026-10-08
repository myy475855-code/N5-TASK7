const express = require("express");
const db = require("../db/database");
const {
  authenticate,
  requireRole,
  requireOwnership
} = require("../middleware/auth");

const router = express.Router();

router.get("/", authenticate, (req, res) => {
  const rows = db.prepare(`
    SELECT i.id, i.company_id, i.title, i.description, i.location,
           i.is_active, i.created_at, u.name AS company_name
    FROM internships i
    JOIN users u ON u.id = i.company_id
    WHERE i.is_active = 1
    ORDER BY i.id DESC
  `).all();
  res.json({ internships: rows });
});

router.post("/", authenticate, requireRole("company", "admin"), (req, res) => {
  const { title, description, location } = req.body || {};
  if (!title || !description || !location) {
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "title, description and location are required." }
    });
  }

  const companyId = req.user.role === "company" ? req.user.id : Number(req.body.company_id);
  const company = db.prepare("SELECT id FROM users WHERE id = ? AND role = 'company' AND is_active = 1").get(companyId);
  if (!company) {
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "A valid active company_id is required." }
    });
  }

  const result = db.prepare(`
    INSERT INTO internships (company_id,title,description,location)
    VALUES (?,?,?,?)
  `).run(companyId, title, description, location);

  res.status(201).json({
    internship: db.prepare("SELECT * FROM internships WHERE id = ?").get(result.lastInsertRowid)
  });
});

function loadInternship(req) {
  return db.prepare("SELECT * FROM internships WHERE id = ?").get(req.params.id);
}

router.patch("/:id",
  authenticate,
  requireRole("company", "admin"),
  requireOwnership(loadInternship, "company_id"),
  (req, res) => {
    const current = req.authorizedResource;
    const { title, description, location } = req.body || {};

    const updated = {
      title: title ?? current.title,
      description: description ?? current.description,
      location: location ?? current.location
    };

    db.prepare(`
      UPDATE internships
      SET title=?, description=?, location=?
      WHERE id=?
    `).run(updated.title, updated.description, updated.location, current.id);

    res.json({
      internship: db.prepare("SELECT * FROM internships WHERE id = ?").get(current.id)
    });
  }
);

router.delete("/:id",
  authenticate,
  requireRole("company", "admin"),
  requireOwnership(loadInternship, "company_id"),
  (req, res) => {
    db.prepare("DELETE FROM internships WHERE id = ?").run(req.authorizedResource.id);
    res.json({ message: "Internship deleted." });
  }
);

router.post("/:id/apply",
  authenticate,
  requireRole("student"),
  (req, res) => {
    const internship = db.prepare(`
      SELECT * FROM internships WHERE id=? AND is_active=1
    `).get(req.params.id);

    if (!internship) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Active internship not found." }
      });
    }

    try {
      const result = db.prepare(`
        INSERT INTO applications (internship_id,student_id)
        VALUES (?,?)
      `).run(internship.id, req.user.id);

      res.status(201).json({
        application: db.prepare("SELECT * FROM applications WHERE id=?").get(result.lastInsertRowid)
      });
    } catch {
      res.status(409).json({
        error: { code: "CONFLICT", message: "You have already applied to this internship." }
      });
    }
  }
);

module.exports = router;
