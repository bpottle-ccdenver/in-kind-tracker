# In-Kind Tracker Web

This is the Vite + React front-end for In-Kind Tracker. The template is trimmed down to authentication, user, role, and permission management while keeping the shared UI building blocks ready for future modules.

This README is meant to be the “bus factor” guide so another engineer can get productive quickly.

## Tech stack

- **Framework:** React 18 with React Router
- **Build tooling:** Vite 6
- **Styling:** Tailwind CSS + Radix UI primitives + custom components
- **State/data:** REST calls to the In-Kind Tracker API via the `src/api/*` modules
- **Testing:** Vitest + Testing Library (see `src/test/setup.ts`)

## Repo layout

```
src/
  api/          # thin REST clients for the API
  components/   # UI building blocks + feature components
  contexts/     # auth/theme context providers
  hooks/        # client-side hooks (permissions, responsive helpers)
  pages/        # routed screens
  permissions.js# central map of resource->permission strings
  test/setup.ts # global test setup (polyfills, jest-dom)
```

Key entry points:
- `src/main.jsx` bootstraps the React app and providers.
- `src/app.jsx` defines route configuration.
- API wrappers in `src/api/` hit the backend service that powers the tracker (configure `VITE_API_BASE_URL`).

## Prerequisites

- Node.js **20.x** or newer
- npm 10+
- A running instance of the In-Kind Tracker API (configure `VITE_API_BASE_URL` accordingly)

## Environment configuration

Client configuration is handled via Vite environment variables. The helper in `src/api/config.js` reads `import.meta.env.VITE_API_BASE_URL` and falls back to `/api` in development. To point the UI at a different API server, create a `.env.local` file in this repo:

```env
VITE_API_BASE_URL=https://api.example.com
```

Remember to restart the dev server after changing env vars.

## Install & run locally

```bash
npm install
npm run dev
```

This starts Vite on the default port (5173). During development we proxy API calls through the Vite dev server (see `vite.config.js` if you need to tweak the proxy).

To build for production:

```bash
npm run build
```

## Testing

```bash
npm test          # run the Vitest suite once
```

Vitest uses `src/test/setup.ts` to load the necessary DOM polyfills (ResizeObserver, pointer capture, etc.).

## Common tasks

- **Add a new API surface:** create the wrapper in `src/api/`, export it from `src/api/entities.js` if it’s part of the entity set, and update any consumers.
- **Create a new routed page:** add the page component under `src/pages/` and wire it up in the router (see `src/main.jsx` or the relevant layout component).
- **Adjust permissions:** update `src/permissions.js` and any checks in contexts/hooks. Keep the API’s permission strings in sync.
- **Theme or layout changes:** global layout lives in `src/pages/Layout.jsx`, theme handling is under `src/contexts/ThemeContext.jsx`.

## Deployment notes

The web app is built as a static bundle via `npm run build`. The resulting `dist/` directory can be hosted on any static hosting platform (Netlify, Vercel, S3 + CloudFront, etc.). Ensure the host rewrites non-file routes (the app is client-side routed).

When deploying alongside the API, configure the API base URL appropriately (either via environment variables during build or a runtime configuration script).

## Troubleshooting

- **API requests failing locally:** verify the API service is running and that `VITE_API_BASE_URL` is correct. During dev, make sure the Vite proxy matches the API port.
- **Tests fail due to missing DOM APIs:** ensure you’re importing from `src/test/setup.ts` (Vitest config does this automatically) or add additional polyfills if you introduce new browser APIs.
- **Styling issues after dependency bump:** run `npm run lint` and check Tailwind config updates. Some Radix components require CSS variables—consult `src/components/ui/*` for examples.

If you evolve the build process or add new tooling, please update this README so the next person has an up-to-date field guide.
