# Insighta CLI

CLI client for Insighta Labs+ backend.

## Setup

1. Install dependencies:

   npm install

2. Optional API base URL (defaults to `http://localhost:3000`):

   export INSIGHTA_API_BASE_URL="https://your-backend-domain"

3. Link globally for local use:

   npm link

## Commands

- `insighta login`
- `insighta logout`
- `insighta whoami`
- `insighta profiles list [--gender male] [--page 1] [--limit 10]`
- `insighta profiles get <id>`
- `insighta profiles search "female adults in US"`
- `insighta profiles create --name "Ada Lovelace"` (admin only)
- `insighta profiles export --format csv`

## Auth and storage

- Uses OAuth with PKCE through backend auth routes.
- Stores credentials in `~/.insighta/credentials.json`.
- Auto-refreshes access token via `/auth/refresh` on 401.
