# OWASP Broken Access Control Study Notes

## A01:2025 Broken Access Control

OWASP keeps Broken Access Control at #1 in the 2025 Top 10. The guidance emphasizes server-side enforcement, deny-by-default behavior, record ownership, testing of access-control behavior, and protection against URL manipulation, privilege escalation and token metadata manipulation.

Official source:
https://top10.owasp.org/2025/A01_2025-Broken_Access_Control/

## Two real-world examples from OWASP API breach material

### 1. Parler

OWASP's API Security material lists Parler among examples where predictable identifiers were associated with exposure of public user metadata. The lesson for this project is that an object identifier is not proof of authorization: the API must verify that the requester is allowed to access the referenced object.

### 2. Johns Hopkins

The same OWASP material lists Johns Hopkins as an IDOR example involving an internal system and sensitive data. The relevant lesson is to perform authorization at the object/data level, not merely at the endpoint or UI level.

Source:
https://owasp.org/www-chapter-... (see the OWASP API Security / Broken Object Level Authorization material referenced in the README)

## Role-based vs ownership/attribute-based authorization

### RBAC

Role-Based Access Control maps permissions to roles.

Example:
- student can apply
- company can create internships
- admin can moderate

RBAC is simple and works well for coarse-grained rules.

### Ownership / attribute-based authorization

Ownership or attribute-based rules consider properties of the current user and resource.

Example:
- company can edit an internship only when `internship.company_id === req.user.id`
- student can view an application only when `application.student_id === req.user.id`

This is necessary because two users with the same role do not necessarily have the same rights over every record.

### Why the combination fits this domain

Internship systems have both global role permissions and per-record relationships. Therefore this project uses:

`authenticate -> requireRole -> ownership/resource check`

Admins receive explicit override permissions where moderation requires them.

## Defense in depth

The UI hides unavailable buttons to reduce confusion. The backend does not rely on that behavior. A malicious client can call APIs directly, change URLs, alter IDs, or use Postman. Therefore every sensitive route independently checks authorization.

## 401 vs 403

- `401`: the server cannot establish a valid authenticated identity.
- `403`: the identity is known, but that identity lacks permission.

The API implements this distinction consistently.
