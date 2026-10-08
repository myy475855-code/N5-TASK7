# Access-Control Matrix

| Role | Resource | Action | Rule |
|---|---|---|---|
| Student | Internship | Read active | Role = student |
| Student | Internship | Apply | Role = student |
| Student | Application | Read | `application.student_id == req.user.id` |
| Student | Application | Withdraw | `application.student_id == req.user.id` |
| Company | Internship | Create | Role = company |
| Company | Internship | Read | Active internships |
| Company | Internship | Update | `internship.company_id == req.user.id` |
| Company | Internship | Delete | `internship.company_id == req.user.id` |
| Company | Application | Read dashboard data | `internship.company_id == req.user.id` |
| Company | Application | Update status | `application.company_id == req.user.id` |
| Admin | Any moderated resource | Read/update/deactivate | Role = admin |
| Unauthenticated | Protected resources | Any protected action | 401 |

## Route coverage

| Route | Auth | Role | Ownership / scope |
|---|---|---|---|
| `GET /api/internships` | Yes | Any authenticated | Active only |
| `POST /api/internships` | Yes | company/admin | Company identity derived server-side |
| `PATCH /api/internships/:id` | Yes | company/admin | Company owner or admin |
| `DELETE /api/internships/:id` | Yes | company/admin | Company owner or admin |
| `POST /api/internships/:id/apply` | Yes | student | Applicant = `req.user.id` |
| `GET /api/applications/:id` | Yes | student/company/admin | Student owner / company posting owner / admin |
| `PATCH /api/applications/:id/status` | Yes | company/admin | Company owns related internship / admin |
| `POST /api/applications/:id/withdraw` | Yes | student | Student owns application |
| `GET /api/dashboard/company` | Yes | company | Current company only |
| `GET /api/dashboard/student` | Yes | student | Current student only |
| `GET /api/admin/users` | Yes | admin | Admin-only |
| `GET /api/admin/internships` | Yes | admin | Admin-only |
| `PATCH /api/admin/users/:id/status` | Yes | admin | Admin-only |
| `PATCH /api/admin/internships/:id/status` | Yes | admin | Admin-only |

## Principles

1. **Deny by default.**
2. **Authenticate before authorization.**
3. **Use role checks for coarse capabilities.**
4. **Use ownership checks for individual records.**
5. **Use admin override only where explicitly required.**
6. **Never trust frontend visibility as security.**
7. **Never trust a stale role claim for sensitive operations.**
8. **Return 401 for missing/invalid authentication and 403 for authenticated-but-forbidden requests.**
