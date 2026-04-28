const axios = require("axios");
const { getCountryNameFromId } = require("../utils/country");

const GENDERIZE_URL = "https://api.genderize.io";
const AGIFY_URL = "https://api.agify.io";
const NATIONALIZE_URL = "https://api.nationalize.io";
const UPSTREAM_REQUEST_OPTIONS = {
  timeout: 10000,
  family: 4,
};

async function fetchGender(name) {
  const response = await axios.get(GENDERIZE_URL, {
    params: { name },
    ...UPSTREAM_REQUEST_OPTIONS,
  });
  const data = response.data || {};

  if (data.gender === null || data.count === 0) {
    const error = new Error("Genderize returned an invalid response");
    error.statusCode = 502;
    error.externalApi = "Genderize";
    throw error;
  }

  return {
    gender: data.gender,
    gender_probability: data.probability,
    sample_size: data.count,
  };
}

async function fetchAge(name) {
  const response = await axios.get(AGIFY_URL, {
    params: { name },
    ...UPSTREAM_REQUEST_OPTIONS,
  });
  const data = response.data || {};

  if (data.age === null || data.age === undefined) {
    const error = new Error("Agify returned an invalid response");
    error.statusCode = 502;
    error.externalApi = "Agify";
    throw error;
  }

  return {
    age: data.age,
  };
}

async function fetchNationality(name) {
  const response = await axios.get(NATIONALIZE_URL, {
    params: { name },
    ...UPSTREAM_REQUEST_OPTIONS,
  });
  const data = response.data || {};

  const countries = Array.isArray(data.country) ? data.country : [];

  if (!countries.length) {
    const error = new Error("Nationalize returned an invalid response");
    error.statusCode = 502;
    error.externalApi = "Nationalize";
    throw error;
  }

  const top = countries.reduce((max, current) =>
    current.probability > max.probability ? current : max,
  );

  return {
    country_id: top.country_id,
    country_name: getCountryNameFromId(top.country_id) || top.country_id,
    country_probability: top.probability,
  };
}

async function fetchProfileData(name) {
  try {
    // eslint-disable-next-line no-console
    console.log(`[API] Starting fetch for name: ${name}`);

    const gender = await fetchGender(name);
    // eslint-disable-next-line no-console
    console.log(`[API] Genderize OK`);

    const age = await fetchAge(name);
    // eslint-disable-next-line no-console
    console.log(`[API] Agify OK`);

    const nationality = await fetchNationality(name);
    // eslint-disable-next-line no-console
    console.log(`[API] Nationalize OK`);

    return { ...gender, ...age, ...nationality };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("REAL ERROR:", error);
    const knownNetworkCodes = new Set([
      "ETIMEDOUT",
      "ECONNABORTED",
      "ECONNRESET",
      "ENOTFOUND",
      "EAI_AGAIN",
      "EHOSTUNREACH",
      "ENETUNREACH",
    ]);

    if (error && error.statusCode === 502 && error.externalApi) {
      throw error;
    }

    if (error && error.isAxiosError) {
      const status = error.response && error.response.status;

      if (status) {
        const wrapped = new Error(`Upstream service returned HTTP ${status}`);
        wrapped.statusCode = 502;
        throw wrapped;
      }

      if (knownNetworkCodes.has(error.code)) {
        const wrapped = new Error(
          `Upstream timeout/network error (${error.code})`,
        );
        wrapped.statusCode = 502;
        throw wrapped;
      }
    }

    const generic = new Error("Upstream service failure");
    generic.statusCode = 502;
    throw generic;
  }
}

module.exports = {
  fetchProfileData,
};
