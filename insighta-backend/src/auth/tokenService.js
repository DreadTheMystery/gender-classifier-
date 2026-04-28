const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const ACCESS_EXPIRES_SECONDS = 3 * 60;
const REFRESH_EXPIRES_SECONDS = 5 * 60;

function getJwtSecret() {
  return process.env.JWT_SECRET || "dev-insecure-secret-change-me";
}

function signAccessToken(user) {
  return jwt.sign(
    {
      role: user.role,
      username: user.username,
    },
    getJwtSecret(),
    {
      subject: user.id,
      expiresIn: ACCESS_EXPIRES_SECONDS,
      issuer: "insighta-labs",
      audience: "insighta-api",
    },
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, getJwtSecret(), {
    issuer: "insighta-labs",
    audience: "insighta-api",
  });
}

function generateRefreshToken() {
  return crypto.randomBytes(48).toString("base64url");
}

module.exports = {
  ACCESS_EXPIRES_SECONDS,
  REFRESH_EXPIRES_SECONDS,
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
};
