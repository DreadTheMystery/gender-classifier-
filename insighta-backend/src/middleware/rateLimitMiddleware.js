const stores = {
  auth: new Map(),
  api: new Map(),
};

function now() {
  return Date.now();
}

function getKey(req, scope) {
  if (scope === "api" && req.user && req.user.id) {
    return `user:${req.user.id}`;
  }

  const forwardedFor = req.headers["x-forwarded-for"];
  const ip = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : String(forwardedFor || req.ip || "unknown")
        .split(",")[0]
        .trim();

  return `ip:${ip}`;
}

function enforceLimit(scope, limit, windowMs) {
  return (req, res, next) => {
    const key = getKey(req, scope);
    const store = stores[scope];
    const current = store.get(key);
    const ts = now();

    if (!current || ts > current.resetAt) {
      store.set(key, {
        count: 1,
        resetAt: ts + windowMs,
      });
      return next();
    }

    current.count += 1;

    if (current.count > limit) {
      return res.status(429).json({
        status: "error",
        message: "Too many requests",
      });
    }

    return next();
  };
}

const authRateLimit = enforceLimit("auth", 50, 60 * 1000);
const apiRateLimit = enforceLimit("api", 200, 60 * 1000);

module.exports = {
  authRateLimit,
  apiRateLimit,
};
