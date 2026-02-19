# In-Kind Tracker Monorepo

This repository combines the three projects that power In-Kind Tracker:

- `db` - PostgreSQL schema, migrations, and seed scripts
- `api` - Express API (port `3001`)
- `web` - Vite + React frontend (port `5173`)

## Local Run (single repo)

1. Ensure PostgreSQL is running and has the `in_kind_tracker` schema/data.
2. Configure env files:
   - `api/.env` (see `api/.env.example`)
   - `db/.env` (optional, only needed for `db` scripts; see `db/.env.example`)
3. Install dependencies:
   - `npm run install:all`
4. Start both API + web:
   - `npm run dev`
5. Open:
   - `http://localhost:5173`

The web dev server proxies `/api/*` requests to `http://localhost:3001`.

## Common Commands

- `npm run dev` - start API + web together
- `npm run dev:api` - start API only
- `npm run dev:web` - start web only
- `npm run test:api` - run API tests
- `npm run test:web` - run web tests
- `npm run db:migrate` - apply DB delta scripts

## Notes

- Nested git repositories inside `api`, `db`, and `web` were removed so this root repo is the only git repository.
- The DB scripts include a dev app role `in_kind_tracker_app` with password `password` in `db/user/in_kind_tracker_app.sql`.
