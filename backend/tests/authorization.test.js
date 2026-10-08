process.env.JWT_SECRET = "test-secret";
process.env.DB_FILE = "./data/test.sqlite";

const fs = require("fs");
const path = require("path");
const request = require("supertest");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const dbPath = path.resolve(__dirname, "../data/test.sqlite");
if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

const db = require("../src/db/database");
const app = require("../src/app");

beforeEach(() => {
  db.exec("DELETE FROM applications; DELETE FROM internships; DELETE FROM users;");
  const hash = bcrypt.hashSync("Password123!", 4);

  const insert = db.prepare(`
    INSERT INTO users(name,email,password_hash,role,is_active)
    VALUES(?,?,?,?,1)
  `);

  insert.run("Student A", "studentA@test.com", hash, "student");
  insert.run("Student B", "studentB@test.com", hash, "student");
  insert.run("Company A", "companyA@test.com", hash, "company");
  insert.run("Company B", "companyB@test.com", hash, "company");
  insert.run("Admin", "admin@test.com", hash, "admin");

  db.prepare(`
    INSERT INTO internships(company_id,title,description,location)
    VALUES(3,'Company A Job','A','Remote')
  `).run();

  db.prepare(`
    INSERT INTO internships(company_id,title,description,location)
    VALUES(4,'Company B Job','B','Remote')
  `).run();

  db.prepare(`
    INSERT INTO applications(internship_id,student_id,status)
    VALUES(1,1,'pending')
  `).run();

  db.prepare(`
    INSERT INTO applications(internship_id,student_id,status)
    VALUES(2,2,'pending')
  `).run();
});

afterAll(() => {
  db.close();
});

async function login(email) {
  const res = await request(app).post("/api/auth/login")
    .send({ email, password: "Password123!" });
  return res.body.token;
}

test("company cannot edit another company's internship", async () => {
  const token = await login("companyA@test.com");

  const res = await request(app)
    .patch("/api/internships/2")
    .set("Authorization", `Bearer ${token}`)
    .send({ title: "Hacked" });

  expect(res.status).toBe(403);
  expect(res.body.error.code).toBe("FORBIDDEN");
});

test("company cannot delete another company's internship", async () => {
  const token = await login("companyA@test.com");

  const res = await request(app)
    .delete("/api/internships/2")
    .set("Authorization", `Bearer ${token}`);

  expect(res.status).toBe(403);
});

test("student cannot view another student's application", async () => {
  const token = await login("studentA@test.com");

  const res = await request(app)
    .get("/api/applications/2")
    .set("Authorization", `Bearer ${token}`);

  expect(res.status).toBe(403);
});

test("company cannot update an application for another company's posting", async () => {
  const token = await login("companyA@test.com");

  const res = await request(app)
    .patch("/api/applications/2/status")
    .set("Authorization", `Bearer ${token}`)
    .send({ status: "accepted" });

  expect(res.status).toBe(403);
});

test("admin can moderate another company's internship", async () => {
  const token = await login("admin@test.com");

  const res = await request(app)
    .patch("/api/admin/internships/2/status")
    .set("Authorization", `Bearer ${token}`)
    .send({ is_active: false });

  expect(res.status).toBe(200);
  expect(res.body.internship.is_active).toBe(0);
});

test("missing token is 401, wrong role is 403", async () => {
  const unauthenticated = await request(app).get("/api/dashboard/company");
  expect(unauthenticated.status).toBe(401);

  const studentToken = await login("studentA@test.com");
  const forbidden = await request(app)
    .get("/api/dashboard/company")
    .set("Authorization", `Bearer ${studentToken}`);

  expect(forbidden.status).toBe(403);
});

test("sensitive role is re-read from database instead of trusting stale JWT role", async () => {
  const companyId = 3;
  const staleToken = jwt.sign(
    { sub: companyId, role: "admin" },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  db.prepare("UPDATE users SET role='student' WHERE id=?").run(companyId);

  const res = await request(app)
    .patch("/api/internships/1")
    .set("Authorization", `Bearer ${staleToken}`)
    .send({ title: "Should not work" });

  expect(res.status).toBe(403);
});
