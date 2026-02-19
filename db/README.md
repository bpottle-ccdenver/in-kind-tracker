# In-Kind Tracker Database

This repository tracks the PostgreSQL schema, DDL, and seed data for the In-Kind Tracker application. It supplies the tables used by the app’s API and front-end.

The goal of this guide is to make it easy to understand the layout, run migrations, and bring up a clean database without tribal knowledge.

## Schema overview

- Everything lives in the `in_kind_tracker` schema by default (override with `SCHEMA_NAME`).
- Table DDL lives under `create/`.
- Incremental migrations live under `alter/` with the files listed in the `delta` manifest.
- Seed/data scripts live under `data/`.
- The `full` manifest contains the scripts required to rebuild the schema from scratch (used by `db_reset.sh`).

Core tables retained for this app:
- `location`
- `permission`
- `role`
- `role_permission`
- `user_account`
- `user_session`

## Directory structure

```
create/           # baseline table creation scripts
alter/            # incremental migrations (referenced by delta)
data/             # seed data (only run when instructed)
full              # manifest for complete rebuild
user/             # SQL helpers for local testing/local users
delta             # migration manifest for db_migrate.sh

# helper scripts
DB_HOST/PORT/NAME/USER/PASSWORD env vars are required for both scripts

db_migrate.sh     # executes the SQL files listed in delta
 db_reset.sh      # wipes and recreates the schema using the full manifest
 deploy-prod-db.sh# helper for production deployment
```

## Prerequisites

- PostgreSQL 14+ server (local or remote)
- `psql` client installed (`brew install libpq` on macOS)
- Environment variables for connectivity:
  - `DB_HOST`
  - `DB_PORT`
  - `DB_NAME`
  - `DB_USER`
  - `DB_PASSWORD`
- Optional: `SCHEMA_NAME` (defaults to `in_kind_tracker`) if you want to target a different schema.

These env vars are the same ones referenced by the helper scripts in the API repo.

## Initial setup / full reset

> ⚠️ `db_reset.sh` **drops the schema** and rebuilds it. Do NOT run this in production unless you intend to erase all data. (ie, for a new initial run)

```bash
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=in-kind-tracker
export DB_USER=postgres
export DB_PASSWORD=secret


./db_reset.sh
```

`db_reset.sh` will:
1. Prompt for confirmation (you must type the database name to continue).
2. Drop the target schema and recreate it.
3. Execute the SQL scripts listed in the `full` manifest (order matters, so keep that file up to date when adding tables).

After the reset you’ll have a clean schema ready for the app.

## Applying incremental migrations

When you only need to apply the latest deltas (e.g., after pulling a branch that added an `alter/*.sql` file), use `db_migrate.sh`.

1. Ensure the new SQL files are referenced in `delta` (one relative path per line).
2. Run the script:

```bash
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=in-kind-tracker
export DB_USER=postgres
export DB_PASSWORD=secret

./db_migrate.sh
```

The script reads `delta`, removes comments/blank lines, and executes each SQL file once. It logs each file as it executes and prints the tables present in the schema when finished. If nothing runs, double-check that `delta` includes your file and that it isn’t commented out.

When making changes, make sure to put the changes in the `full` file as well, so any new deployment (for instance a new dev box) will reflect them. Scripts in delta should be run **once** and then commented out. 

## Typical workflow

1. **Add new table or column**
   - Create a new SQL file under `alter/` (for incremental change to existing table) or `create/` (for new tables).
   - Append the relative path to the `delta` file.
   - Add it to the `full` manifest at the appropriate position.

2. **Run migrations locally**
   - `./db_migrate.sh` to apply just the new deltas.
   - If you need a clean slate, run `./db_reset.sh`. (Again, only the first time for env)

3. **Update API expectations**
   - Ensure the API reflects the new columns or tables.
   - Update seed data in `data/` if new reference data is required.

4. **Commit & share**
   - Commit the SQL files and manifest changes (`delta`, `full`).


## Deployment & prod notes

- `deploy-prod-db.sh` is the helper used internally to apply migrations in the production environment. Review the script before using it in case the process changes. This copies files to a staging directory - you must ssh to the server and copy them and run the migration.
- Always back up the production database before running `db_reset.sh` (which you almost never need in prod). Stick to `db_migrate.sh` for incremental changes.
- Secrets and connection info for production live in Azure Secret Vault
