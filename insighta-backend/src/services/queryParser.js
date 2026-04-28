const {
  normalizeText,
  getAllCountryNames,
  getCountryIdFromName,
} = require("../utils/country");

function parseAgeComparators(normalizedQuery) {
  const result = {};

  const betweenMatch = normalizedQuery.match(
    /\bbetween\s+(\d{1,3})\s+and\s+(\d{1,3})\b/,
  );
  if (betweenMatch) {
    const first = Number(betweenMatch[1]);
    const second = Number(betweenMatch[2]);
    result.min_age = Math.min(first, second);
    result.max_age = Math.max(first, second);
  }

  const minMatch = normalizedQuery.match(
    /\b(?:above|over|older than|greater than|at least)\s+(\d{1,3})\b/,
  );
  if (minMatch) {
    result.min_age = Number(minMatch[1]);
  }

  const maxMatch = normalizedQuery.match(
    /\b(?:below|under|younger than|less than|at most)\s+(\d{1,3})\b/,
  );
  if (maxMatch) {
    result.max_age = Number(maxMatch[1]);
  }

  return result;
}

function parseCountryId(normalizedQuery) {
  const names = getAllCountryNames().sort((a, b) => b.length - a.length);

  for (const countryName of names) {
    const escaped = countryName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`\\b${escaped}\\b`);

    if (pattern.test(normalizedQuery)) {
      return getCountryIdFromName(countryName);
    }
  }

  return null;
}

function parseNaturalLanguageQuery(query) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return null;

  const filters = {};
  let interpretedTokens = 0;

  const hasMale = /\b(male|males|man|men|boy|boys)\b/.test(normalizedQuery);
  const hasFemale = /\b(female|females|woman|women|girl|girls)\b/.test(
    normalizedQuery,
  );

  if (hasMale && !hasFemale) {
    filters.gender = "male";
    interpretedTokens += 1;
  } else if (hasFemale && !hasMale) {
    filters.gender = "female";
    interpretedTokens += 1;
  } else if (hasMale && hasFemale) {
    interpretedTokens += 1;
  }

  if (/\b(teen|teens|teenager|teenagers)\b/.test(normalizedQuery)) {
    filters.age_group = "teenager";
    interpretedTokens += 1;
  } else if (/\b(child|children)\b/.test(normalizedQuery)) {
    filters.age_group = "child";
    interpretedTokens += 1;
  } else if (/\b(adult|adults)\b/.test(normalizedQuery)) {
    filters.age_group = "adult";
    interpretedTokens += 1;
  } else if (/\b(senior|seniors|elderly|old)\b/.test(normalizedQuery)) {
    filters.age_group = "senior";
    interpretedTokens += 1;
  }

  if (/\byoung\b/.test(normalizedQuery)) {
    filters.min_age = 16;
    filters.max_age = 24;
    interpretedTokens += 1;
  }

  const ageComparators = parseAgeComparators(normalizedQuery);
  if (ageComparators.min_age !== undefined) {
    filters.min_age = ageComparators.min_age;
    interpretedTokens += 1;
  }
  if (ageComparators.max_age !== undefined) {
    filters.max_age = ageComparators.max_age;
    interpretedTokens += 1;
  }

  const countryId = parseCountryId(normalizedQuery);
  if (countryId) {
    filters.country_id = countryId;
    interpretedTokens += 1;
  }

  if (
    filters.min_age !== undefined &&
    filters.max_age !== undefined &&
    filters.min_age > filters.max_age
  ) {
    return null;
  }

  if (interpretedTokens === 0) {
    return null;
  }

  return filters;
}

module.exports = {
  parseNaturalLanguageQuery,
};
