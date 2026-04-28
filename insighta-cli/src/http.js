const axios = require("axios");
const oraImport = require("ora");
const { BASE_URL } = require("./config");
const {
  readCredentials,
  writeCredentials,
  clearCredentials,
} = require("./storage");

const ora = oraImport.default || oraImport;

async function refreshIfNeeded() {
  const creds = readCredentials();
  if (!creds || !creds.refresh_token) return null;

  try {
    const response = await axios.post(`${BASE_URL}/auth/refresh`, {
      refresh_token: creds.refresh_token,
    });

    const nextCreds = {
      ...creds,
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
    };

    writeCredentials(nextCreds);
    return nextCreds;
  } catch (_error) {
    clearCredentials();
    return null;
  }
}

async function request({
  method,
  path,
  params,
  data,
  headers = {},
  spinnerText,
  responseType,
}) {
  const spinner = spinnerText ? ora(spinnerText).start() : null;
  const creds = readCredentials();

  const call = async (token) =>
    axios({
      method,
      url: `${BASE_URL}${path}`,
      params,
      data,
      responseType,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(headers || {}),
      },
    });

  try {
    const response = await call(creds && creds.access_token);
    if (spinner) spinner.succeed();
    return response;
  } catch (error) {
    if (
      error.response &&
      error.response.status === 401 &&
      creds &&
      creds.refresh_token
    ) {
      const refreshed = await refreshIfNeeded();
      if (refreshed && refreshed.access_token) {
        const response = await call(refreshed.access_token);
        if (spinner) spinner.succeed();
        return response;
      }
    }

    if (spinner) spinner.fail();
    throw error;
  }
}

function apiRequest(config) {
  return request({
    ...config,
    headers: {
      "X-API-Version": "1",
      ...(config.headers || {}),
    },
  });
}

module.exports = {
  request,
  apiRequest,
};
