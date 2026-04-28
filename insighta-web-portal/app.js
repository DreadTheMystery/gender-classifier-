const appEl = document.getElementById("app");
const apiBaseInput = document.getElementById("apiBaseInput");
const saveBaseUrlBtn = document.getElementById("saveBaseUrlBtn");

function getApiBaseUrl() {
  return (
    localStorage.getItem("insighta_api_base_url") ||
    window.INSIGHTA_API_BASE_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function setApiBaseUrl(value) {
  localStorage.setItem("insighta_api_base_url", value.replace(/\/$/, ""));
}

apiBaseInput.value = getApiBaseUrl();
saveBaseUrlBtn.addEventListener("click", () => {
  const value = apiBaseInput.value.trim();
  if (!value) return;
  setApiBaseUrl(value);
  render();
});

async function callApi(path, options = {}) {
  const headers = {
    ...(options.headers || {}),
  };

  if (path.startsWith("/api/")) {
    headers["X-API-Version"] = "1";
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: options.method || "GET",
    headers,
    credentials: "include",
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      (payload && payload.message) ||
      (typeof payload === "string" ? payload : "Request failed");
    throw new Error(message);
  }

  return payload;
}

async function getCsrfToken() {
  const payload = await callApi("/auth/csrf-token");
  return payload.data && payload.data.csrf_token;
}

async function getCurrentUser() {
  try {
    const payload = await callApi("/auth/whoami");
    return payload.data;
  } catch (_error) {
    return null;
  }
}

function pageLayout(title, innerHtml) {
  return `<div class="card"><h2>${title}</h2>${innerHtml}</div>`;
}

async function renderLogin() {
  appEl.innerHTML = pageLayout(
    "Login",
    `<p class="muted">Authenticate with GitHub to access the portal.</p>
     <button id="loginBtn" type="button">Continue with GitHub</button>`,
  );

  document.getElementById("loginBtn").addEventListener("click", () => {
    window.location.href = `${getApiBaseUrl()}/auth/github?mode=web`;
  });
}

async function renderDashboard() {
  const user = await getCurrentUser();
  if (!user) {
    window.location.hash = "#/login";
    return;
  }

  let total = "-";
  try {
    const payload = await callApi("/api/profiles?page=1&limit=1");
    total = payload.total;
  } catch (_error) {
    total = "error";
  }

  appEl.innerHTML = `
    ${pageLayout(
      "Dashboard",
      `<div class="row"><strong>User:</strong> ${user.username} (${user.role})</div>
       <div class="row"><strong>Total Profiles:</strong> ${total}</div>`,
    )}
  `;
}

function renderProfilesTable(payload) {
  const rows = (payload.data || [])
    .map(
      (p) => `
      <tr>
        <td><a href="#/profiles/${p.id}">${p.id}</a></td>
        <td>${p.name || ""}</td>
        <td>${p.gender || ""}</td>
        <td>${p.age ?? ""}</td>
        <td>${p.country_id || ""}</td>
      </tr>`,
    )
    .join("");

  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>ID</th><th>Name</th><th>Gender</th><th>Age</th><th>Country</th></tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="5">No results</td></tr>'}</tbody>
      </table>
    </div>
    <p class="muted">Page ${payload.page}/${payload.total_pages} • Total ${payload.total}</p>
  `;
}

async function renderProfiles() {
  const user = await getCurrentUser();
  if (!user) {
    window.location.hash = "#/login";
    return;
  }

  const hash = new URLSearchParams(window.location.hash.split("?")[1] || "");
  const page = hash.get("page") || "1";
  const limit = hash.get("limit") || "10";
  const gender = hash.get("gender") || "";

  let payload;
  let message = "";

  try {
    const qs = new URLSearchParams({ page, limit });
    if (gender) qs.set("gender", gender);
    payload = await callApi(`/api/profiles?${qs.toString()}`);
  } catch (error) {
    message = `<p class="error">${error.message}</p>`;
    payload = { data: [], page: 1, total_pages: 1, total: 0 };
  }

  appEl.innerHTML = pageLayout(
    "Profiles",
    `
      <div class="controls">
        <input id="genderFilter" placeholder="gender" value="${gender}" />
        <input id="pageInput" placeholder="page" value="${page}" />
        <input id="limitInput" placeholder="limit" value="${limit}" />
        <button id="applyFilterBtn" type="button">Apply</button>
      </div>
      ${message}
      ${renderProfilesTable(payload)}
    `,
  );

  document.getElementById("applyFilterBtn").addEventListener("click", () => {
    const nGender = document.getElementById("genderFilter").value.trim();
    const nPage = document.getElementById("pageInput").value.trim() || "1";
    const nLimit = document.getElementById("limitInput").value.trim() || "10";
    const qs = new URLSearchParams({ page: nPage, limit: nLimit });
    if (nGender) qs.set("gender", nGender);
    window.location.hash = `#/profiles?${qs.toString()}`;
  });
}

async function renderProfileDetail(id) {
  const user = await getCurrentUser();
  if (!user) {
    window.location.hash = "#/login";
    return;
  }

  try {
    const payload = await callApi(`/api/profiles/${encodeURIComponent(id)}`);
    const p = payload.data;
    appEl.innerHTML = pageLayout(
      "Profile Detail",
      `<pre>${JSON.stringify(p, null, 2)}</pre>`,
    );
  } catch (error) {
    appEl.innerHTML = pageLayout(
      "Profile Detail",
      `<p class="error">${error.message}</p>`,
    );
  }
}

async function renderSearch() {
  const user = await getCurrentUser();
  if (!user) {
    window.location.hash = "#/login";
    return;
  }

  const hash = new URLSearchParams(window.location.hash.split("?")[1] || "");
  const q = hash.get("q") || "";

  let payload = null;
  let message = "";

  if (q) {
    try {
      payload = await callApi(
        `/api/profiles/search?q=${encodeURIComponent(q)}`,
      );
    } catch (error) {
      message = `<p class="error">${error.message}</p>`;
    }
  }

  appEl.innerHTML = pageLayout(
    "Search",
    `
      <div class="row">
        <input id="searchInput" placeholder="e.g. female adults in US" value="${q}" style="min-width:300px" />
        <button id="searchBtn" type="button">Search</button>
      </div>
      ${message}
      ${payload ? renderProfilesTable(payload) : '<p class="muted">Run a natural language search.</p>'}
    `,
  );

  document.getElementById("searchBtn").addEventListener("click", () => {
    const query = document.getElementById("searchInput").value.trim();
    if (!query) return;
    window.location.hash = `#/search?q=${encodeURIComponent(query)}`;
  });
}

async function renderAccount() {
  const user = await getCurrentUser();
  if (!user) {
    window.location.hash = "#/login";
    return;
  }

  appEl.innerHTML = pageLayout(
    "Account",
    `<pre>${JSON.stringify(user, null, 2)}</pre>
     <button id="logoutBtn" type="button">Logout</button>`,
  );

  document.getElementById("logoutBtn").addEventListener("click", async () => {
    try {
      const csrf = await getCsrfToken();
      await callApi("/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrf,
        },
        body: {},
      });
      window.location.hash = "#/login";
    } catch (error) {
      alert(error.message);
    }
  });
}

function getCurrentRoute() {
  if (window.location.hash) {
    return window.location.hash.replace(/^#/, "");
  }

  const path = window.location.pathname || "/dashboard";
  const query = window.location.search || "";
  return `${path}${query}`;
}

async function render() {
  const route = getCurrentRoute();

  if (route.startsWith("/profiles/")) {
    const id = route.split("/")[2].split("?")[0];
    await renderProfileDetail(id);
    return;
  }

  if (route.startsWith("/login")) return renderLogin();
  if (route.startsWith("/dashboard")) return renderDashboard();
  if (route.startsWith("/profiles")) return renderProfiles();
  if (route.startsWith("/search")) return renderSearch();
  if (route.startsWith("/account")) return renderAccount();

  window.location.hash = "#/dashboard";
}

window.addEventListener("hashchange", render);
render();
