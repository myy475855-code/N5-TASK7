# Internship Portal — Task 6: Backend Authorization / RBAC

A complete full-stack internship portal demonstrating **authentication + backend authorization** for three roles:

- `student`
- `company`
- `admin`

The frontend is intentionally treated as a UX layer. **Every sensitive backend request independently authenticates and authorizes the caller.**

## Stack

- Backend: Node.js, Express, SQLite (`better-sqlite3`), JWT, bcrypt
- Frontend: HTML, CSS, vanilla JavaScript
- Tests: Jest + Supertest
- API documentation: OpenAPI 3.0
- Database: SQLite with foreign keys and constrained role values

## Security requirements implemented

- RBAC with `requireRole(...)`
- Ownership authorization with `requireOwnership(...)`
- Composable middleware
- `401 Unauthorized` vs `403 Forbidden`
- Role in JWT **and** database re-verification for sensitive operations
- Company can only edit/delete its own internships
- Student can only view/withdraw their own applications
- Company can only update applications belonging to its own postings
- Admin can moderate any resource
- Admin can deactivate users and internships
- Deny-by-default behavior
- Role-aware frontend views
- Clear forbidden state
- Automated authorization tests
- OpenAPI documents 401/403
- Access-control matrix
- Postman collection
- OWASP notes

## Quick start

```bash
cd backend
npm install
npm run seed
npm start
```

Open:

http://localhost:3000

Demo accounts:

| Role | Email | Password |
|---|---|---|
| Student | student@example.com | Password123! |
| Student | student2@example.com | Password123! |
| Company | company@example.com | Password123! |
| Company | company2@example.com | Password123! |
| Admin | admin@example.com | Password123! |

The seed creates two companies, two students, three internships and sample applications.

## Run tests

```bash
cd backend
npm test
```

The tests explicitly prove:

1. Company A cannot edit Company B's internship.
2. Student A cannot view Student B's application.
3. A company cannot update an application belonging to another company's posting.
4. Admin can moderate another user's resource.

## API

Base URL:

`http://localhost:3000/api`

Main endpoints:

- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/internships`
- `POST /api/internships`
- `PATCH /api/internships/:id`
- `DELETE /api/internships/:id`
- `GET /api/applications`
- `GET /api/applications/:id`
- `POST /api/internships/:id/apply`
- `PATCH /api/applications/:id/status`
- `POST /api/applications/:id/withdraw`
- `GET /api/company/dashboard`
- `GET /api/student/dashboard`
- `GET /api/admin/users`
- `GET /api/admin/internships`
- `PATCH /api/admin/users/:id/status`
- `PATCH /api/admin/internships/:id/status`

## Authorization model

The server uses both **role-based** and **ownership/attribute-based** checks.

- RBAC answers: "May this role perform this kind of action?"
- Ownership checks answer: "Does this particular resource belong to this authenticated user/company?"
- Admin is an explicit override role for moderation routes.

For critical mutations, the JWT is not considered sufficient evidence of current role. The middleware loads the current user from SQLite and verifies the role and active status again.

## 401 vs 403

- `401 Unauthorized`: no valid authentication credentials were supplied.
- `403 Forbidden`: authentication succeeded, but the authenticated user is not permitted to perform the requested action.

All API errors use:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You are not authorized to perform this action."
  }
}
```

## Access-control matrix

| Resource / Action | Student | Company | Admin |
|---|---|---|---|
| View active internships | Allow | Allow | Allow |
| Create internship | Deny | Allow | Allow |
| Edit internship | Deny | Own only | Any |
| Delete internship | Deny | Own only | Any |
| Apply to internship | Allow | Deny | Deny |
| View own application | Own only | Deny | Any |
| Withdraw application | Own only | Deny | Any |
| Update application status | Deny | Own posting only | Any |
| Company dashboard | Deny | Own data only | Deny |
| Student dashboard | Own data only | Deny | Deny |
| List users | Deny | Deny | Allow |
| Deactivate user | Deny | Deny | Allow |
| Deactivate internship | Deny | Deny | Allow |

## Why both RBAC and ownership?

Role alone is too coarse. If every company can edit every internship, a role check is technically present but authorization is still broken. Ownership adds the resource-level constraint.

Ownership alone is also insufficient because a student should not become a company simply by owning a record. The domain therefore combines role + ownership, with admin override.

## Defense in depth

The frontend hides irrelevant navigation and buttons, but this is **not security**. A user can directly call the API with curl/Postman. The backend therefore performs authorization on every protected route.

Example:

```bash
curl -X PATCH http://localhost:3000/api/internships/2 \
  -H "Authorization: Bearer <company-A-token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Attempted takeover"}'
```

If internship 2 belongs to another company, the API returns `403`.

## Manual boundary testing

See `postman/Internship-RBAC.postman_collection.json`.

Recommended boundary tests:

1. No token -> 401
2. Student token -> company create endpoint -> 403
3. Company A -> Company B internship PATCH -> 403
4. Company A -> Company B internship DELETE -> 403
5. Student A -> Student B application GET -> 403
6. Company A -> application for Company B posting -> 403
7. Admin -> any user/internship moderation -> 200

## OWASP research

This project follows OWASP A01:2025 Broken Access Control guidance: enforce access control in trusted server-side code, deny by default, enforce record ownership, and test authorization behavior. OWASP's 2025 page notes that broken access control remains A01 and explicitly describes URL manipulation, missing POST/PUT/DELETE controls, privilege escalation, JWT metadata manipulation, and frontend-only authorization as common failure modes.

Two real-world examples discussed in OWASP material relevant to this topic include:

- **Parler** — predictable identifiers contributed to exposure of public user metadata in an API breach discussion.
- **Johns Hopkins** — an IDOR issue in an internal system exposed sensitive academic/medical-related data in the same OWASP API security breach examples.

See `docs/OWASP_NOTES.md` for the written study notes and links.

## Project structure

```text
internship-rbac-app/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── app.js
│   │   └── server.js
│   ├── tests/
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── docs/
│   ├── openapi.yaml
│   ├── ACCESS_CONTROL_MATRIX.md
│   └── OWASP_NOTES.md
└── postman/
    └── Internship-RBAC.postman_collection.json
```

## Production notes

This educational project uses localStorage for the demo token and a seeded JWT secret. For production, use HTTPS, secure HttpOnly cookies or a hardened token strategy, short-lived access tokens + refresh token rotation where appropriate, CSRF protections for cookie-based auth, rate limiting, structured security logs, secret management, and database migrations.

## License

Educational use.
