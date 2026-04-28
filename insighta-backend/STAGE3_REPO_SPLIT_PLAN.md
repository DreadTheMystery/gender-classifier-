# Stage 3 Repo Split Plan

This project currently contains backend, CLI, and web portal in one workspace. For final Stage 3 submission, split into three repositories.

## Target repositories

1. `insighta-backend`
2. `insighta-cli`
3. `insighta-web-portal`

## Backend repo contents

Copy from current workspace:

- `src/`
- `scripts/`
- `api/`
- `package.json`
- `package-lock.json`
- `.env.example`
- `vercel.json`
- `.github/workflows/backend-ci.yml`
- `README.md` (backend-focused)

## CLI repo contents

Copy from current workspace `cli/` root:

- `bin/`
- `src/`
- `package.json`
- `package-lock.json`
- `.github/workflows/cli-ci.yml`
- `README.md`

## Web portal repo contents

Copy from current workspace `web-portal/` root:

- `index.html`
- `app.js`
- `styles.css`
- `package.json`
- `package-lock.json`
- `vercel.json`
- `.github/workflows/web-portal-ci.yml`
- `README.md`

## Branch + PR workflow (each repo)

- Create feature branches: `feat/<area>` or `fix/<area>`
- Open PRs to `main`
- Ensure CI passes before merge
- Use conventional commits, e.g.:
  - `feat(auth): add github oauth callback handling`
  - `fix(cli): handle ora esm default export`

## Deployment targets

- Backend: Vercel (or equivalent)
- Web portal: Vercel static deployment
- CLI: npm package or local global install from repo

## Submission checklist

- Backend repo URL
- CLI repo URL
- Web portal repo URL
- Live backend URL
- Live web portal URL
- README in backend includes:
  - system architecture
  - authentication flow
  - CLI usage
  - token handling approach
  - role enforcement logic
  - natural language parsing approach
