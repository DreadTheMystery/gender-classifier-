const express = require("express");
const { classifyName } = require("../controllers/classifyController");

const router = express.Router();

router.get("/classify", classifyName);

module.exports = router;
