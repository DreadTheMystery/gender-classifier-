function isCookieAuthRequest(req) {
  const authHeader = req.headers.authorization || "";
  const hasBearer = authHeader.startsWith("Bearer ");
  const hasAccessCookie = !!(req.cookies && req.cookies.access_token);
  const hasRefreshCookie = !!(req.cookies && req.cookies.refresh_token);

  return !hasBearer && (hasAccessCookie || hasRefreshCookie);
}

function requireCsrf(req, res, next) {
  if (!isCookieAuthRequest(req)) {
    return next();
  }

  const cookieToken = req.cookies && req.cookies.csrf_token;
  const headerToken = req.headers["x-csrf-token"];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({
      status: "error",
      message: "CSRF validation failed",
    });
  }

  return next();
}

module.exports = {
  requireCsrf,
};
