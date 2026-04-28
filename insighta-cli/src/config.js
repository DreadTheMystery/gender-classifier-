const path = require("path");
const os = require("os");

const BASE_URL = process.env.INSIGHTA_API_BASE_URL || "http://localhost:3000";
const CREDENTIALS_DIR = path.join(os.homedir(), ".insighta");
const CREDENTIALS_PATH = path.join(CREDENTIALS_DIR, "credentials.json");

module.exports = {
  BASE_URL,
  CREDENTIALS_DIR,
  CREDENTIALS_PATH,
};
