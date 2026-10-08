const jwt = require("jsonwebtoken");
const db = require("../db/database");

function unauthorized(res, message = "Authentication required.") {
  return res.status(401).json({
    error: { code: "UNAUTHORIZED", message }
  });
}

function forbidden(res, message = "You are not authorized to perform this action.") {
  return res.status(403).json({
    error: { code: "FORBIDDEN", message }
  });
}

function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    return unauthorized(res);
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    const user = db.prepare(`
      SELECT id, name, email, role, is_active
      FROM users WHERE id = ?
    `).get(payload.sub);

    if (!user || !user.is_active) {
      return unauthorized(res, "Account is inactive or no longer exists.");
    }

    // Critical security property:
    // the role is re-read from the database rather than trusted solely from JWT claims.
    req.user = user;
    req.jwtClaims = payload;
    next();
  } catch {
    return unauthorized(res, "Invalid or expired token.");
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return unauthorized(res);
    if (!roles.includes(req.user.role)) {
      return forbidden(res, `Role '${req.user.role}' is not allowed for this action.`);
    }
    next();
  };
}

function requireOwnership(resourceLoader, ownerField = "owner_id") {
  return (req, res, next) => {
    const resource = resourceLoader(req);
    if (!resource) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Resource not found." }
      });
    }

    if (req.user.role === "admin") {
      req.authorizedResource = resource;
      return next();
    }

    if (Number(resource[ownerField]) !== Number(req.user.id)) {
      return forbidden(res, "You do not own this resource.");
    }

    req.authorizedResource = resource;
    next();
  };
}

function requireOwnershipOrAdmin(resourceLoader, ownerField = "owner_id") {
  return requireOwnership(resourceLoader, ownerField);
}

module.exports = {
  authenticate,
  requireRole,
  requireOwnership,
  requireOwnershipOrAdmin,
  unauthorized,
  forbidden
};
