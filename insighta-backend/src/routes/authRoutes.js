const express = require("express");
const {
  getCsrfToken,
  githubStartHandler,
  githubCallbackHandler,
  githubCliExchangeHandler,
  refreshHandler,
  logoutHandler,
  testCodeHandler,
  whoamiHandler,
} = require("../controllers/authController");
const { requireAuth } = require("../middleware/authMiddleware");
const { authRateLimit } = require("../middleware/rateLimitMiddleware");
const { requireCsrf } = require("../middleware/csrfMiddleware");

const router = express.Router();

router.get("/csrf-token", authRateLimit, getCsrfToken);
router.get("/github", authRateLimit, githubStartHandler);
router.get("/github/callback", authRateLimit, githubCallbackHandler);
router.get("/test_code", authRateLimit, testCodeHandler);
router.post("/github/cli/exchange", authRateLimit, githubCliExchangeHandler);
router.post("/refresh", authRateLimit, requireCsrf, refreshHandler);
router.post("/logout", authRateLimit, requireCsrf, logoutHandler);
router.get("/whoami", requireAuth, whoamiHandler);

// Enforce POST-only for logout
router.all("/logout", (req, res, next) => {
  if (req.method !== "POST") {
    return res.status(405).json({
      status: "error",
      message: "Method not allowed",
    });
  }
  next();
});

module.exports = router;
