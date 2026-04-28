const http = require("http");
const crypto = require("crypto");
const open = require("open");
const axios = require("axios");
const { BASE_URL } = require("./config");
const { writeCredentials } = require("./storage");

function createPkcePair() {
  const codeVerifier = crypto.randomBytes(64).toString("base64url");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");

  return { codeVerifier, codeChallenge };
}

async function loginCli() {
  const state = crypto.randomUUID();
  const { codeVerifier, codeChallenge } = createPkcePair();

  const callbackPort = 9777;
  const redirectUri = `http://127.0.0.1:${callbackPort}/callback`;

  const authUrl = `${BASE_URL}/auth/github?mode=cli&state=${encodeURIComponent(state)}&code_challenge=${encodeURIComponent(codeChallenge)}&redirect_uri=${encodeURIComponent(redirectUri)}`;

  const code = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://127.0.0.1:${callbackPort}`);
      if (url.pathname !== "/callback") {
        res.statusCode = 404;
        res.end("Not found");
        return;
      }

      const incomingState = url.searchParams.get("state");
      const incomingCode = url.searchParams.get("code");

      if (!incomingCode || incomingState !== state) {
        res.statusCode = 400;
        res.end("Invalid OAuth callback");
        server.close();
        reject(new Error("OAuth callback validation failed"));
        return;
      }

      res.statusCode = 200;
      res.end("Login complete. You can return to the terminal.");
      server.close();
      resolve(incomingCode);
    });

    server.listen(callbackPort, "127.0.0.1", async () => {
      await open(authUrl);
    });
  });

  const exchange = await axios.post(`${BASE_URL}/auth/github/cli/exchange`, {
    code,
    state,
    code_verifier: codeVerifier,
    redirect_uri: redirectUri,
  });

  const data = exchange.data;
  writeCredentials({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    user: data.user,
  });

  return data.user;
}

module.exports = {
  loginCli,
};
