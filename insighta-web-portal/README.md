# Insighta Web Portal

Minimal deployable browser client for Insighta Labs+.

## Included pages

- Login (`#/login`)
- Dashboard (`#/dashboard`)
- Profiles list (`#/profiles`)
- Profile detail (`#/profiles/:id`)
- Search (`#/search`)
- Account (`#/account`)

## Run locally

1. Start backend first.
2. Open this folder and run:

   npm start

3. Open `http://localhost:5173`.
4. Set API base URL in the top field if backend is not at `http://localhost:3000`.

## Security model

- Uses backend cookie auth (`access_token`, `refresh_token`) over CORS with credentials.
- Gets CSRF token from `/auth/csrf-token` before logout.
- Sends `X-API-Version: 1` on `/api/*` requests.

## Deploy

- Deploy as static app (Vercel supported via local `vercel.json`).
- Set backend `WEB_PORTAL_URL` to this deployed URL.
