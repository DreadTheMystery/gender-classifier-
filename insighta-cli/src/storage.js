const fs = require("fs");
const { CREDENTIALS_DIR, CREDENTIALS_PATH } = require("./config");

function ensureDir() {
  if (!fs.existsSync(CREDENTIALS_DIR)) {
    fs.mkdirSync(CREDENTIALS_DIR, { recursive: true, mode: 0o700 });
  }
}

function readCredentials() {
  try {
    if (!fs.existsSync(CREDENTIALS_PATH)) return null;
    return JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf8"));
  } catch (_error) {
    return null;
  }
}

function writeCredentials(data) {
  ensureDir();
  fs.writeFileSync(CREDENTIALS_PATH, JSON.stringify(data, null, 2), {
    mode: 0o600,
  });
}

function clearCredentials() {
  if (fs.existsSync(CREDENTIALS_PATH)) {
    fs.unlinkSync(CREDENTIALS_PATH);
  }
}

module.exports = {
  readCredentials,
  writeCredentials,
  clearCredentials,
  CREDENTIALS_PATH,
};
