const express = require("express");
const {
  createProfileHandler,
  getSingleProfileHandler,
  getAllProfilesHandler,
  searchProfilesHandler,
  exportProfilesHandler,
  deleteProfileHandler,
} = require("../controllers/profileController");
const { requireRole } = require("../middleware/authMiddleware");
const { requireCsrf } = require("../middleware/csrfMiddleware");

const router = express.Router();

router.post("/", requireCsrf, requireRole("admin"), createProfileHandler);
router.get("/", getAllProfilesHandler);
router.get("/search", searchProfilesHandler);
router.get("/export", exportProfilesHandler);
router.get("/:id", getSingleProfileHandler);
router.delete("/:id", requireCsrf, requireRole("admin"), deleteProfileHandler);

module.exports = router;
