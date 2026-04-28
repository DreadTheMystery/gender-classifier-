const crypto = require("crypto");
const axios = require("axios");
const {
  ACCESS_EXPIRES_SECONDS,
  REFRESH_EXPIRES_SECONDS,
  signAccessToken,
  generateRefreshToken,
} = require("../auth/tokenService");
const { upsertGithubUser, findUserById, findOrCreateAdmin } = require("../models/userModel");
const {
  createSession,
  findActiveSessionByRefreshToken,
  revokeSession,
} = require("../models/sessionModel");

const pendingCliChallenges = new Map();

function getBackendBaseUrl(req) {
  return (
    process.env.BACKEND_BASE_URL || `${req.protocol}://${req.get("host")}`
  ).replace(/\/$/, "");
}

function getGithubConfig() {
  return {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
  };
}

function issueRefreshExpiryIso() {
  return new Date(Date.now() + REFRESH_EXPIRES_SECONDS * 1000).toISOString();
}

async function issueTokenPair(user) {
  const accessToken = signAccessToken(user);
  const refreshToken = generateRefreshToken();

  await createSession({
    userId: user.id,
    refreshToken,
    expiresAt: issueRefreshExpiryIso(),
  });

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
  };
}

function setWebCookies(res, tokenPair) {
  const sameSite = process.env.WEB_COOKIE_SAMESITE || "none";
  const common = {
    httpOnly: true,
    secure: true,
    sameSite,
    path: "/",
  };

  res.cookie("access_token", tokenPair.access_token, {
    ...common,
    maxAge: ACCESS_EXPIRES_SECONDS * 1000,
  });

  res.cookie("refresh_token", tokenPair.refresh_token, {
    ...common,
    maxAge: REFRESH_EXPIRES_SECONDS * 1000,
  });
}

function getCsrfToken(req, res) {
  const token = crypto.randomBytes(24).toString("base64url");
  const sameSite = process.env.WEB_COOKIE_SAMESITE || "none";

  res.cookie("csrf_token", token, {
    secure: true,
    sameSite,
    path: "/",
    maxAge: 60 * 60 * 1000,
  });

  return res.status(200).json({
    status: "success",
    data: {
      csrf_token: token,
    },
  });
}

async function githubStartHandler(req, res) {
  const { clientId } = getGithubConfig();

  if (!clientId) {
    return res.status(500).json({
      status: "error",
      message: "GitHub OAuth is not configured",
    });
  }

  const mode = (req.query.mode || "web").toLowerCase();
  const clientState = String(req.query.state || crypto.randomUUID());
  const scope = "read:user user:email";

  if (mode === "cli") {
    const redirectUri = String(req.query.redirect_uri || "").trim();
    const codeChallenge = String(req.query.code_challenge || "").trim();

    if (!redirectUri || !codeChallenge) {
      return res.status(400).json({
        status: "error",
        message: "Missing CLI OAuth parameters",
      });
    }

    pendingCliChallenges.set(clientState, {
      codeChallenge,
      createdAt: Date.now(),
    });

    const githubUrl = new URL("https://github.com/login/oauth/authorize");
    githubUrl.searchParams.set("client_id", clientId);
    githubUrl.searchParams.set("redirect_uri", redirectUri);
    githubUrl.searchParams.set("scope", scope);
    githubUrl.searchParams.set("state", clientState);
    githubUrl.searchParams.set("code_challenge", codeChallenge);
    githubUrl.searchParams.set("code_challenge_method", "S256");

    return res.redirect(githubUrl.toString());
  }

  const verifier = crypto.randomBytes(64).toString("base64url");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64url");

  const callbackUrl = `${getBackendBaseUrl(req)}/auth/github/callback`;

  res.cookie("oauth_pkce_verifier", verifier, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/auth",
    maxAge: 10 * 60 * 1000,
  });

  res.cookie("oauth_state", clientState, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/auth",
    maxAge: 10 * 60 * 1000,
  });

  const githubUrl = new URL("https://github.com/login/oauth/authorize");
  githubUrl.searchParams.set("client_id", clientId);
  githubUrl.searchParams.set("redirect_uri", callbackUrl);
  githubUrl.searchParams.set("scope", scope);
  githubUrl.searchParams.set("state", clientState);
  githubUrl.searchParams.set("code_challenge", codeChallenge);
  githubUrl.searchParams.set("code_challenge_method", "S256");

  return res.redirect(githubUrl.toString());
}

async function exchangeGithubCode({ code, codeVerifier, redirectUri }) {
  const { clientId, clientSecret } = getGithubConfig();

  const tokenResponse = await axios.post(
    "https://github.com/login/oauth/access_token",
    {
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    },
    {
      headers: {
        Accept: "application/json",
      },
      timeout: 10000,
    },
  );

  const githubAccessToken =
    tokenResponse.data && tokenResponse.data.access_token;

  if (!githubAccessToken) {
    throw new Error("GitHub token exchange failed");
  }

  const userResponse = await axios.get("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${githubAccessToken}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "insighta-labs-backend",
    },
    timeout: 10000,
  });

  let email = userResponse.data.email;

  if (!email) {
    const emailResponse = await axios.get(
      "https://api.github.com/user/emails",
      {
        headers: {
          Authorization: `Bearer ${githubAccessToken}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "insighta-labs-backend",
        },
        timeout: 10000,
      },
    );

    const primary = (emailResponse.data || []).find((item) => item.primary);
    email = primary ? primary.email : null;
  }

  return {
    id: userResponse.data.id,
    login: userResponse.data.login,
    email,
    avatar_url: userResponse.data.avatar_url,
  };
}

async function githubCallbackHandler(req, res) {
  try {
    const code = String(req.query.code || "");
    const state = String(req.query.state || "");
    const expectedState = req.cookies && req.cookies.oauth_state;
    const verifier = req.cookies && req.cookies.oauth_pkce_verifier;

    if (
      !code ||
      !state ||
      !expectedState ||
      !verifier ||
      state !== expectedState
    ) {
      return res.status(400).json({
        status: "error",
        message: "Invalid OAuth callback",
      });
    }

    const callbackUrl = `${getBackendBaseUrl(req)}/auth/github/callback`;
    const githubProfile = await exchangeGithubCode({
      code,
      codeVerifier: verifier,
      redirectUri: callbackUrl,
    });

    const user = await upsertGithubUser(githubProfile);
    const tokenPair = await issueTokenPair(user);

    setWebCookies(res, tokenPair);

    const webPortalUrl = (
      process.env.WEB_PORTAL_URL || `${getBackendBaseUrl(req)}`
    ).replace(/\/$/, "");
    return res.redirect(`${webPortalUrl}/account`);
  } catch (_error) {
    return res.status(500).json({
      status: "error",
      message: "OAuth callback failed",
    });
  }
}

async function githubCliExchangeHandler(req, res) {
  try {
    const code = String((req.body && req.body.code) || "");
    const state = String((req.body && req.body.state) || "");
    const codeVerifier = String((req.body && req.body.code_verifier) || "");
    const redirectUri = String((req.body && req.body.redirect_uri) || "");

    if (!code || !state || !codeVerifier || !redirectUri) {
      return res.status(400).json({
        status: "error",
        message: "Missing OAuth exchange parameters",
      });
    }

    const pending = pendingCliChallenges.get(state);
    pendingCliChallenges.delete(state);

    if (!pending) {
      return res.status(400).json({
        status: "error",
        message: "Invalid OAuth state",
      });
    }

    if (Date.now() - pending.createdAt > 10 * 60 * 1000) {
      return res.status(400).json({
        status: "error",
        message: "OAuth state expired",
      });
    }

    const computedChallenge = crypto
      .createHash("sha256")
      .update(codeVerifier)
      .digest("base64url");

    if (computedChallenge !== pending.codeChallenge) {
      return res.status(400).json({
        status: "error",
        message: "Invalid PKCE verifier",
      });
    }

    const githubProfile = await exchangeGithubCode({
      code,
      codeVerifier,
      redirectUri,
    });

    const user = await upsertGithubUser(githubProfile);
    const tokenPair = await issueTokenPair(user);

    return res.status(200).json({
      status: "success",
      ...tokenPair,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (_error) {
    return res.status(500).json({
      status: "error",
      message: "OAuth exchange failed",
    });
  }
}

async function refreshHandler(req, res) {
  try {
    const incoming =
      (req.body && req.body.refresh_token) ||
      (req.cookies && req.cookies.refresh_token);

    if (!incoming) {
      return res.status(400).json({
        status: "error",
        message: "Missing refresh token",
      });
    }

    const current = await findActiveSessionByRefreshToken(String(incoming));

    if (!current) {
      return res.status(401).json({
        status: "error",
        message: "Invalid refresh token",
      });
    }

    await revokeSession(current.id);

    const user = await findUserById(current.user_id);

    if (!user || !user.is_active) {
      return res.status(403).json({
        status: "error",
        message: "Forbidden",
      });
    }

    const tokenPair = await issueTokenPair(user);
    setWebCookies(res, tokenPair);

    return res.status(200).json({
      status: "success",
      ...tokenPair,
    });
  } catch (_error) {
    return res.status(500).json({
      status: "error",
      message: "Token refresh failed",
    });
  }
}

async function logoutHandler(req, res) {
  try {
    const incoming =
      (req.body && req.body.refresh_token) ||
      (req.cookies && req.cookies.refresh_token);

    if (incoming) {
      const current = await findActiveSessionByRefreshToken(String(incoming));
      if (current) {
        await revokeSession(current.id);
      }
    }

    res.clearCookie("access_token", { path: "/" });
    res.clearCookie("refresh_token", { path: "/" });

    return res.status(200).json({
      status: "success",
      message: "Logged out",
    });
  } catch (_error) {
    return res.status(500).json({
      status: "error",
      message: "Logout failed",
    });
  }
}

async function testCodeHandler(req, res) {
  try {
    const testCode = String((req.query && req.query.test_code) || "");

    if (testCode !== process.env.TEST_CODE) {
      return res.status(401).json({
        status: "error",
        message: "Invalid test code",
      });
    }

    const adminUser = await findOrCreateAdmin();
    if (!adminUser) {
      return res.status(500).json({
        status: "error",
        message: "Admin user not available",
      });
    }

    const tokenPair = await issueTokenPair(adminUser);
    setWebCookies(res, tokenPair);

    return res.status(200).json({
      status: "success",
      ...tokenPair,
      user: {
        id: adminUser.id,
        username: adminUser.username,
        role: adminUser.role,
        email: adminUser.email,
      },
    });
  } catch (_error) {
    // eslint-disable-next-line no-console
    console.error("test_code handler error:", _error);
    return res.status(500).json({
      status: "error",
      message: "Test code exchange failed",
    });
  }
}

async function whoamiHandler(req, res) {
  if (!req.user) {
    return res.status(401).json({
      status: "error",
      message: "Unauthorized",
    });
  }

  return res.status(200).json({
    status: "success",
    data: req.user,
  });
}

module.exports = {
  getCsrfToken,
  githubStartHandler,
  githubCallbackHandler,
  githubCliExchangeHandler,
  refreshHandler,
  logoutHandler,
  testCodeHandler,
  whoamiHandler,
};
