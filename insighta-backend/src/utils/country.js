const fs = require("fs");
const path = require("path");

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const countryNameToCode = new Map();
const countryCodeToName = new Map();

function loadCountryMaps() {
  try {
    const seedPath = path.join(__dirname, "..", "seed_profiles.json");
    const raw = fs.readFileSync(seedPath, "utf8");
    const parsed = JSON.parse(raw);
    const profiles = Array.isArray(parsed.profiles) ? parsed.profiles : [];

    profiles.forEach((profile) => {
      const code = String(profile.country_id || "").toUpperCase();
      const name = String(profile.country_name || "").trim();
      if (!code || !name) return;

      if (!countryCodeToName.has(code)) {
        countryCodeToName.set(code, name);
      }

      const normalizedName = normalizeText(name);
      if (normalizedName) {
        countryNameToCode.set(normalizedName, code);
      }
    });
  } catch (_error) {
    // Ignore seed loading errors; map functions will gracefully fallback.
  }
}

loadCountryMaps();

function getCountryIdFromName(name) {
  return countryNameToCode.get(normalizeText(name)) || null;
}

function getCountryNameFromId(countryId) {
  return countryCodeToName.get(String(countryId || "").toUpperCase()) || null;
}

function getAllCountryNames() {
  return [...countryNameToCode.keys()];
}

module.exports = {
  normalizeText,
  getCountryIdFromName,
  getCountryNameFromId,
  getAllCountryNames,
};
