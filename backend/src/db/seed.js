require("dotenv").config();
const bcrypt = require("bcryptjs");
const db = require("./database");

db.exec("DELETE FROM applications; DELETE FROM internships; DELETE FROM users;");

const passwordHash = bcrypt.hashSync("Password123!", 10);

const insertUser = db.prepare(`
  INSERT INTO users (name,email,password_hash,role,is_active)
  VALUES (@name,@email,@password_hash,@role,@is_active)
`);

const users = [
  { name: "Alice Student", email: "student@example.com", role: "student" },
  { name: "Bob Student", email: "student2@example.com", role: "student" },
  { name: "Acme Technologies", email: "company@example.com", role: "company" },
  { name: "Beta Software", email: "company2@example.com", role: "company" },
  { name: "System Admin", email: "admin@example.com", role: "admin" }
];

const ids = {};
for (const u of users) {
  const result = insertUser.run({
    ...u,
    password_hash: passwordHash,
    is_active: 1
  });
  ids[u.email] = Number(result.lastInsertRowid);
}

const internshipStmt = db.prepare(`
  INSERT INTO internships (company_id,title,description,location,is_active)
  VALUES (?,?,?,?,?)
`);
const internship1 = Number(internshipStmt.run(
  ids["company@example.com"],
  "Backend Developer Intern",
  "Work on Node.js APIs, authentication and authorization.",
  "Remote",
  1
).lastInsertRowid);
const internship2 = Number(internshipStmt.run(
  ids["company2@example.com"],
  "Frontend Developer Intern",
  "Build accessible interfaces with JavaScript and CSS.",
  "Lahore",
  1
).lastInsertRowid);
const internship3 = Number(internshipStmt.run(
  ids["company@example.com"],
  "Security Engineering Intern",
  "Practice secure API design and authorization testing.",
  "Islamabad",
  1
).lastInsertRowid);

const applicationStmt = db.prepare(`
  INSERT INTO applications (internship_id,student_id,status)
  VALUES (?,?,?)
`);
applicationStmt.run(internship1, ids["student@example.com"], "pending");
applicationStmt.run(internship2, ids["student2@example.com"], "reviewing");
applicationStmt.run(internship3, ids["student2@example.com"], "pending");

console.log("Database seeded.");
console.log("Demo password for all users: Password123!");
