# Insighta Labs+ Backend (Stage 3)

## System Architecture

This repository is the backend core for Insighta Labs+.

- **Backend API (this repo)**: auth, role enforcement, profile intelligence, CSV export
- **CLI (separate repo target)**: user/power-user interface using OAuth PKCE
- **Web Portal (separate repo target)**: browser UI with HTTP-only cookie sessions

All interfaces share the same backend and database as the source of truth.

## What Stage 3 Adds

- GitHub OAuth (web + CLI PKCE flow support)
- Access + refresh token lifecycle with rotation
- Role-based access control (`admin`, `analyst`)
- API version header requirement for `/api/*`
- Updated paginated response shape (`total_pages`, `links`)
- CSV profile export endpoint
- Rate limiting
- Request logging

## Stage 2 Compatibility

Existing Stage 2 capabilities are preserved:

- Filtering
- Sorting
- Pagination
- Natural language query parsing

## Environment Variables

Required:

- `SUPABASE_URL`
- `SUPABASE_KEY`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `JWT_SECRET`

Optional:

- `BACKEND_BASE_URL`
- `WEB_PORTAL_URL`

## Database Setup

Run both SQL scripts in Supabase SQL editor:

1. `scripts/createProfilesTable.sql`
2. `scripts/createAuthTables.sql`

Then seed profiles:

- `npm run seed`

## Auth Flow

### Web OAuth

1. User starts at `GET /auth/github?mode=web`
2. Backend generates PKCE verifier/challenge and state (cookie-based)
3. Redirect to GitHub
4. GitHub callback to `GET /auth/github/callback`
5. Backend exchanges code, upserts user, issues token pair
6. Tokens set as HTTP-only cookies

### CLI OAuth with PKCE

1. CLI calls `GET /auth/github?mode=cli&state=...&code_challenge=...&redirect_uri=...`
2. User logs in via browser and returns to CLI local callback
3. CLI sends code exchange to `POST /auth/github/cli/exchange` with `code_verifier`
4. Backend validates PKCE + state, issues token pair
5. CLI stores credentials at `~/.insighta/credentials.json`

## Token Handling Approach

- Access token (JWT): **3 minutes**
- Refresh token (opaque): **5 minutes**
- Refresh rotation: every `/auth/refresh` request invalidates old refresh token and issues a new pair
- Logout: refresh token is revoked server-side

## Role Enforcement Logic

Role model:

- `admin`: create/delete profiles + all read/search
- `analyst`: read/search only

Enforcement:

- Global auth middleware protects `/api/*`
- Role middleware enforces admin-only endpoints:
  - `POST /api/profiles`
  - `DELETE /api/profiles/:id`

If user is inactive (`is_active = false`): `403 Forbidden`

## API Versioning

All `/api/*` requests must include:

- `X-API-Version: 1`

Without it:

```json
{ "status": "error", "message": "API version header required" }
```

## Pagination Shape

`GET /api/profiles` and `GET /api/profiles/search` now return:

- `page`
- `limit`
- `total`
- `total_pages`
- `links.self`
- `links.next`
- `links.prev`
- `data`

## CSV Export

Endpoint:

- `GET /api/profiles/export?format=csv`

Supports the same filters and sorting as list endpoint.
Returns downloadable CSV with required columns.

## Natural Language Parsing Approach

Rule-based parser in `src/services/queryParser.js`.

Supported mappings include:

- gender keywords
- age groups
- `young` => `min_age=16`, `max_age=24`
- age comparators (`above`, `below`, `between`)
- country name to ISO code mapping using seeded dataset

Returns null when query is not interpretable; controller returns:

```json
{ "status": "error", "message": "Unable to interpret query" }
```

## Rate Limiting & Logging

Rate limits:

- `/auth/*`: 10 req/min (IP)
- `/api/*`: 60 req/min per authenticated user

Logging:

- method
- endpoint
- status code
- response time

## CLI Usage

The backend supports these CLI command flows (implemented in `cli/`):

- `insighta login`
- `insighta logout`
- `insighta whoami`
- `insighta profiles list ...`
- `insighta profiles get <id>`
- `insighta profiles search "..."`
- `insighta profiles create --name "..."`
- `insighta profiles export --format csv`

CLI quick start:

- `cd cli && npm install`
- optional `export INSIGHTA_API_BASE_URL="https://your-backend-domain"`
- `npm link`
- `insighta --help`

## Web Portal (Minimal Deployable)

A minimal browser client is available in `web-portal/` with:

- Login
- Dashboard
- Profiles list/detail
- Search
- Account + logout

Web portal quick start:

- `cd web-portal && npm start`
- Open `http://localhost:5173`
- Configure API base URL in the page header if needed

## Run

- `npm install`
- `npm start`
- `npm run seed`

## Error Format

All errors use:

```json
{ "status": "error", "message": "<message>" }
```
