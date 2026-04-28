const { verifyAccessToken } = require("../auth/tokenService");
const { findUserById } = require("../models/userModel");

function getAccessToken(req) {
  const authHeader = req.headers.authorization || "";

  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }

  return req.cookies && req.cookies.access_token;
}

async function requireAuth(req, res, next) {
  try {
    const token = getAccessToken(req);

    if (!token) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized",
      });
    }

    const payload = verifyAccessToken(token);
    const user = await findUserById(payload.sub);

    if (!user) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized",
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        status: "error",
        message: "Forbidden",
      });
    }

    req.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      is_active: user.is_active,
    };

    return next();
  } catch (_error) {
    return res.status(401).json({
      status: "error",
      message: "Unauthorized",
    });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: "error",
        message: "Forbidden",
      });
    }

    return next();
  };
}

module.exports = {
  requireAuth,
  requireRole,
};
