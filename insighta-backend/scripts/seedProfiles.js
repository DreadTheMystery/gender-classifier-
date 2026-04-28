require("dotenv").config();

const fs = require("fs");
const path = require("path");
const supabase = require("../src/database/supabase");
const { generateUuidV7 } = require("../src/utils/uuid");

function loadSeedProfiles() {
  const seedPath = path.join(__dirname, "..", "src", "seed_profiles.json");
  const raw = fs.readFileSync(seedPath, "utf8");
  const parsed = JSON.parse(raw);

  if (!parsed || !Array.isArray(parsed.profiles)) {
    throw new Error("Invalid seed file format");
  }

  return parsed.profiles;
}

function sanitizeProfile(profile) {
  return {
    id: generateUuidV7(),
    name: String(profile.name || "").trim(),
    gender: String(profile.gender || "")
      .trim()
      .toLowerCase(),
    gender_probability: Number(profile.gender_probability),
    age: Number(profile.age),
    age_group: String(profile.age_group || "")
      .trim()
      .toLowerCase(),
    country_id: String(profile.country_id || "")
      .trim()
      .toUpperCase(),
    country_name: String(profile.country_name || "").trim(),
    country_probability: Number(profile.country_probability),
    created_at: new Date().toISOString(),
  };
}

function validateProfile(profile) {
  if (!profile.name) return false;
  if (!["male", "female"].includes(profile.gender)) return false;
  if (!["child", "teenager", "adult", "senior"].includes(profile.age_group)) {
    return false;
  }
  if (!Number.isInteger(profile.age) || profile.age < 0) return false;
  if (!/^[A-Z]{2}$/.test(profile.country_id)) return false;
  if (!profile.country_name) return false;
  if (
    !Number.isFinite(profile.gender_probability) ||
    profile.gender_probability < 0 ||
    profile.gender_probability > 1
  ) {
    return false;
  }
  if (
    !Number.isFinite(profile.country_probability) ||
    profile.country_probability < 0 ||
    profile.country_probability > 1
  ) {
    return false;
  }
  return true;
}

async function seed() {
  const sourceProfiles = loadSeedProfiles();
  const prepared = sourceProfiles.map(sanitizeProfile).filter(validateProfile);

  if (!prepared.length) {
    throw new Error("No valid profiles found in seed file");
  }

  let inserted = 0;
  const chunkSize = 300;

  for (let i = 0; i < prepared.length; i += chunkSize) {
    const chunk = prepared.slice(i, i + chunkSize);

    const { error } = await supabase
      .from("profiles")
      .upsert(chunk, { onConflict: "name", ignoreDuplicates: true });

    if (error) {
      throw error;
    }

    inserted += chunk.length;
  }

  // eslint-disable-next-line no-console
  console.log(`Seed complete. Processed ${inserted} records.`);
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error("Seed failed:", error);
    process.exit(1);
  });
