const crypto = require("crypto");

function generateUuidV7() {
  const bytes = crypto.randomBytes(16);

  // Set version to 7 (UUIDv7)
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  // Set variant to RFC 4122 (10xx xxxx)
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = bytes.toString("hex");

  return (
    hex.substring(0, 8) +
    "-" +
    hex.substring(8, 12) +
    "-" +
    hex.substring(12, 16) +
    "-" +
    hex.substring(16, 20) +
    "-" +
    hex.substring(20)
  );
}

module.exports = {
  generateUuidV7,
};
