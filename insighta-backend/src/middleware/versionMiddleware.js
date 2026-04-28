function requireApiVersion(req, res, next) {
  const version = req.header("X-API-Version");

  if (version !== "1") {
    return res.status(400).json({
      status: "error",
      message: "API version header required",
    });
  }

  return next();
}

module.exports = {
  requireApiVersion,
};
