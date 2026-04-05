# Lisent.ai CRM Web

## Project Overview

Browser-facing web application for the Lisent CRM platform. Acts as a Backend-for-Frontend (BFF) — authenticates users via SuperTokens, then proxies requests to the internal Go CRM service with server-side API keys. The browser never sees internal credentials.

## Tech Stack

- **Framework:** Next.js 16.1.6 (App Router, standalone output)
- **Language:** TypeScript 5 (strict mode)
- **UI:** React 19.2.3
- **Styling:** Tailwind CSS 4 (custom components, no UI library)
- **Auth:** SuperTokens (supertokens-node 24, supertokens-auth-react 0.51, Email/Password recipe)
- **Build:** Node 20, standalone Next.js build
- **React Compiler:** Enabled (babel-plugin-react-compiler)

## Architecture

```
Browser → Next.js App (port 3010)
              ├── SuperTokens Core (auth, sessions)
              ├── Go CRM Service (via BFF proxy at /api/crm/*)
              ├── Qualifier Service (via /api/qualifier/*)
              └── Engine Service (via /api/engine/*)
```

**BFF Pattern:** All `/api/crm/[...path]` routes validate the user session, check company membership authorization, then forward to the Go CRM service with `CRM_INTERNAL_API_KEY`. User never receives the internal key.

## Project Structure

```
src/
  app/
    api/
      auth/[...path]/        → SuperTokens auth endpoints
      crm/[...path]/         → BFF proxy to CRM service
      account/               → User profile API
      session/               → Session validation
      qualifier/[...path]/   → Qualifier service proxy
      engine/                → Engine service proxy
      health/                → Health checks
    auth/[[...path]]/        → Auth UI pages (sign-up, sign-in)
    dashboard/
      page.tsx               → Home/overview
      companies/             → Company workspace
      customers/             → Customer directory
      imports/               → CSV import flow
      account/               → Account settings
      engine/                → Engine dashboard
    layout.tsx               → Root layout with SuperTokens provider
    globals.css              → Tailwind base styles
  components/
    auth/                    → Auth shell, form card, brand panel, provider
    dashboard/
      shared/                → Dashboard shell, session cards
      home/                  → Hero, overview, session panel
      companies/             → Workspace, directory, create/delete modals, WhatsApp panel, qualifier panel
      customers/             → Directory, form modal, detail drawer, list section
      account/               → Account settings
      engine/                → Engine components
  lib/
    supertokens/
      backend.ts             → SuperTokens Node init
      frontend.ts            → SuperTokens React init
    auth/
      company-memberships.ts → Company access control
      account-server.ts      → Profile loading
      sign-up-fields.ts      → Sign-up validation
    crm/client.ts            → CRM API client
    account/client.ts        → Account API client
    qualifier/client.ts      → Qualifier API client
    imports/csv.ts           → CSV parsing
    engine/                  → Engine integration
  config/
    app-info.ts              → Domain resolution, app config
```

## Key Routes

**Pages:**
- `/auth/sign-up`, `/auth/sign-in` — Authentication
- `/dashboard` — Home overview
- `/dashboard/companies` — Company CRUD workspace
- `/dashboard/customers` — Customer directory (company-scoped)
- `/dashboard/imports` — CSV import workflow
- `/dashboard/account` — User profile settings

**API (BFF):**
- `/api/auth/*` — SuperTokens endpoints
- `/api/session` — Session validation
- `/api/account` — Profile GET/PATCH
- `/api/crm/*` — Proxy to Go CRM service (protected)
- `/api/qualifier/*` — Proxy to Qualifier service
- `/api/health`, `/api/health/supertokens` — Health checks

## Authorization Model

- SuperTokens manages user sessions and metadata
- User metadata stores `companyMemberships` array: `[{companyId, role, createdAt}]`
- BFF routes check membership before forwarding to CRM service
- Currently only `owner` role exists

## Development

```bash
# Install
npm install

# Dev server (port 3010)
npm run dev

# Production build
npm run build
npm start

# Lint
npm run lint
```

## Configuration

Key environment variables (see `.env.example`):

**Public (embedded in build):**
- `NEXT_PUBLIC_APP_NAME=Lisent CRM`
- `NEXT_PUBLIC_API_DOMAIN=http://localhost:3010`
- `NEXT_PUBLIC_WEBSITE_DOMAIN=http://localhost:3010`

**Server-side:**
- `SUPERTOKENS_CONNECTION_URI` — SuperTokens Core URL (default: `http://localhost:3567`)
- `AUTH_DB_DSN` — Auth PostgreSQL connection
- `CRM_BASE_URL=http://localhost:9090` — Go CRM service
- `CRM_INTERNAL_API_KEY` — API key for CRM service (never exposed to browser)
- `QUALIFIER_BASE_URL` — AI Qualifier service (optional)
- `ENGINE_BASE_URL` — Engine service (optional)
- `APP_PUBLIC_ORIGIN` — Override for reverse-proxy scenarios

## Docker

```bash
# Build (pass public vars as build args)
docker build \
  --build-arg NEXT_PUBLIC_API_DOMAIN=https://crm.lisent.ai \
  --build-arg NEXT_PUBLIC_WEBSITE_DOMAIN=https://crm.lisent.ai .

# SuperTokens + pgAdmin
docker-compose -f docker-compose.supertokens.yml up
```

Multi-stage build: node:20-alpine, standalone output, runs as non-root `nextjs` user, port 3010.

## External Services

| Service | Purpose |
|---------|---------|
| SuperTokens Core | User auth, sessions, metadata |
| Go CRM Service | All CRM business logic (companies, customers, leads, etc.) |
| PostgreSQL | Auth database (managed by SuperTokens) |
| Qualifier Service | AI lead qualification (optional) |
| Engine Service | Conversational AI, knowledge base (optional) |

## Design System

- **Fonts:** Space Grotesk (sans), IBM Plex Mono (mono)
- **Theme:** Dark purples/slates with violet/cyan/magenta accents; light mode with white/slate
- **Components:** All custom Tailwind — no external component library
- **Patterns:** Controlled form inputs, client-side pagination, loading skeletons, modal dialogs via boolean state
- **Path alias:** `@/*` → `./src/*`
