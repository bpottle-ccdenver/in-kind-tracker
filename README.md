# In-Kind Tracker Monorepo

This repository combines the three projects that power In-Kind Tracker:

- `db` - PostgreSQL schema, migrations, and seed scripts
- `api` - Express API (port `3001`)
- `web` - Vite + React frontend (port `5173`)
- `.devcontainer` - GitHub Codespaces definition with Postgres

## Local setup

1. Ensure PostgreSQL is running.
2. Run:
   - `npm run setup:local`
3. Start the app:
   - `npm run dev`
4. Open:
   - `http://localhost:5173`

Default local DB bootstrap mode is `migrate` (non-destructive). To force a fresh DB rebuild:
- `BOOTSTRAP_MODE=reset npm run setup:local`

## Codespaces setup

1. Open this repository in GitHub Codespaces.
2. Run:
   - `npm run setup:codespaces`
3. Start the app:
   - `npm run dev:codespaces`
4. Open port `5173` in Codespaces.

The web dev server proxies `/api/*` requests to `http://localhost:3001`.

## Common Commands

- `npm run dev` - start API + web together
- `npm run dev:codespaces` - start API + web for Codespaces (`0.0.0.0` web host)
- `npm run dev:api` - start API only
- `npm run dev:web` - start web only
- `npm run setup:local` - create env files, install deps, bootstrap DB
- `npm run setup:codespaces` - local setup plus Codespaces DB/service defaults
- `npm run db:setup` - run DB bootstrap directly (`db/setup_db_local.sh`)
- `npm run test:api` - run API tests
- `npm run test:web` - run web tests
- `npm run db:migrate` - apply DB delta scripts
