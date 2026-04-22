# Developer Context

## Purpose

`lisent.ai-crm-web` is the browser-facing application for Lisent CRM.

It is not the core CRM API. That lives in the separate Go service repo:

- `lisent.ai-CRM-service`

This repo is responsible for:

- user authentication and session handling
- tenant-aware application shell
- future backend-for-frontend (BFF) routes
- CRM pages and flows used by signed-in company users

This repo should not become a second source of truth for CRM business logic.

## Current Lead UI Status

Lead management now has a real dashboard surface in this repo.

Implemented in web:

- `/dashboard/leads`
- lead list + filters
- lead detail panel
- create/edit/delete lead flows
- manual assignment UI
- round-robin assignment UI
- lead conversion UI:
  - convert to customer
  - optionally create a deal

Important boundary:

- lead records remain source-of-truth data in `lisent.ai-CRM-service`
- company memberships remain source-of-truth access data in the web app / SuperTokens
- because of that split, round-robin assignment is orchestrated in the web app and then persisted back to CRM as lead assignee fields

## Current Deal UI Status

Deal management now also has a real dedicated surface in this repo.

Implemented in web:

- `/dashboard/deals`
- kanban-style deal board
- deal create/edit/delete flows
- deal detail popup
- deal stage history display
- shared deal comments
- related record display:
  - company
  - customer
  - source lead

Important boundary:

- deal records, stage history, and deal comments remain source-of-truth CRM data in `lisent.ai-CRM-service`
- the web app is responsible for session validation, tenant access, and BFF forwarding only

## Current Task UI Status

Task workflow now has a dedicated page in this repo.

Implemented in web:

- `/dashboard/tasks`
- publish to one teammate
- publish to everyone in the selected company
- broadcast task grouping in the UI
- response inbox via `Open Tickets`
- accepted-work queue via `My Tasks`
- creator delete flow for mistakenly published tasks

Current interaction model:

- `Open Tickets` shows tasks still waiting for acceptance
- `My Tasks` shows tasks only after the signed-in user accepts them
- individual task visibility is restricted to creator and assignee
- broadcast tasks are still grouped for the creator so outcome counts stay readable

## System Boundary

Current intended architecture:

1. Browser talks to `lisent.ai-crm-web`
2. `lisent.ai-crm-web` validates user session with SuperTokens
3. web app resolves user + company + role context
4. web app calls `lisent.ai-CRM-service` through server-side BFF routes
5. browser never receives the internal CRM API key

This boundary is important.

Do not make the browser call the Go CRM service directly with internal credentials.

## Relationship To The CRM Service

The Go repo already contains:

- CRM domain APIs
- companies/customers/leads/deals/tasks/calls
- import profile onboarding:
  - suggest
  - approve
  - active
  - apply
- Groq-backed mapping suggestion flow

This web repo will later provide the UI for those features.

Examples of future BFF routes this repo should own:

- `src/app/api/crm/customers/...`
- `src/app/api/crm/companies/...`
- `src/app/api/crm/import-profiles/...`

Current notable BFF behavior already implemented:

- company/customer authorization
- lead authorization by company
- deal authorization by company
- task authorization with creator/assignee visibility rules
- lead/deal/task forwarding through `/api/crm/[...path]`

Those routes should:

- validate the signed-in session
- resolve tenant/company context
- enforce role-based access
- forward trusted server-side requests to the Go CRM service

## Current Tech Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS 4
- SuperTokens:
  - `supertokens-node`
  - `supertokens-auth-react`
  - `supertokens-web-js`

## Current Status

Implemented now:

- app scaffold
- custom auth UI
- SuperTokens frontend init
- SuperTokens backend init
- `/api/auth/[...path]` route
- `/auth/[[...path]]` page
- `/dashboard` protected shell
- `/api/session` test route
- `/api/account` profile route
- signed-in user name rendering in the dashboard shell and home page
- `/dashboard/account` settings page backed by SuperTokens User Metadata
- company creation forwards creator user id and display name to the CRM service
- company/customer authorization in `/api/crm/[...path]`
- lead/deal authorization in `/api/crm/[...path]`
- task authorization in `/api/crm/[...path]`
- owner membership assignment on company creation
- company memberships stored in SuperTokens User Metadata
- dedicated leads dashboard page
- dedicated deals dashboard page
- dedicated tasks dashboard page
- round-robin lead assignment using company memberships
- lead conversion flow from web UI to CRM service
- deal kanban board with comments and stage history
- task publish / accept / reject / done workflow

Validated:

- `npm run lint`
- `npm run build`

## Folder Structure

Current relevant structure:

```txt
src/
  app/
    api/
      auth/[...path]/route.ts
      account/route.ts
      session/route.ts
    auth/[[...path]]/page.tsx
    dashboard/account/page.tsx
    dashboard/deals/page.tsx
    dashboard/leads/page.tsx
    dashboard/tasks/page.tsx
    dashboard/page.tsx
    globals.css
    layout.tsx
    page.tsx
  components/
    auth/
      auth-brand-panel.tsx
      auth-form-card.tsx
      auth-page.tsx
      auth-shell.tsx
      auth-types.ts
      supertokens-provider.tsx
    dashboard/
      account/
        account-settings.tsx
      companies/
        company-workspace.tsx
      customers/
        customer-directory.tsx
      deals/
        ...
      leads/
        lead-directory.tsx
      tasks/
        ...
      home/
        dashboard-hero.tsx
        dashboard-overview.tsx
        session-panel.tsx
        session-panel-skeleton.tsx
      shared/
        dashboard-shell.tsx
        session-payload-card.tsx
        session-status-card.tsx
  config/
    app-info.ts
  lib/
    supertokens/
      backend.ts
      frontend.ts
docs/
  README.md
  DEVELOPER_CONTEXT.md
```

This structure is intentionally split by responsibility:

- `app/`: routes
- `components/`: UI
- `config/`: app config
- `lib/`: integrations and shared non-UI logic

## Auth Design

### What is implemented

Frontend:

- `src/lib/supertokens/frontend.ts`
- `src/components/auth/supertokens-provider.tsx`

Backend:

- `src/lib/supertokens/backend.ts`
- `src/app/api/auth/[...path]/route.ts`

### Current auth model

Right now the app supports the foundation for:

- sign up
- sign in
- session persistence
- protected client-side dashboard shell
- signed-in user profile metadata
- account settings update flow

It does not yet implement the full tenant membership model.

### Profile data

SuperTokens User Metadata currently stores two distinct concerns:

- `profile`
  - `firstName`
  - `lastName`
  - `phoneNumber`
  - `gender`
- `companyMemberships`

`profile` is used by:

- `/api/account`
- dashboard account settings
- signed-in user display in the dashboard shell and overview page

## Tenant Model

Planned identity context:

- `user_id`
- `company_id`
- `role`

Important:

- user signs in as themselves
- company is tenant scope
- role defines authorization inside that tenant

Current implementation note:

- the first authorization pass stores company memberships in SuperTokens User Metadata
- `companyMemberships[]` is the current source of truth for which companies a signed-in user can access
- the BFF reads that metadata before forwarding company/customer CRM requests
- when creating a company, the BFF also forwards creator audit fields (`X-User-Id`, `X-User-Name`) to the CRM service

This is intentionally simpler than a dedicated membership table, but it still enforces tenant boundaries today.

## Lead Assignment Model

Current implementation:

- manual assignee selection is supported
- round-robin assignment is supported
- assignable people are derived from company memberships
- `viewer` members are excluded from assignment
- the web app stores the last round-robin assignee in company `extra_data`
- the chosen assignee is then written onto the lead in CRM

Why this currently lives in the web layer:

- CRM service does not own company membership data
- the web app already has trusted access to company-member metadata
- this avoids duplicating membership state in CRM

If assignment rules become more advanced later, this may deserve a dedicated assignment service or CRM-side policy model.

## Lead Conversion Model

Current implemented behavior:

- selected lead is sent to CRM `POST /leads/:id/convert`
- CRM creates or reuses a company-scoped customer
- CRM can also create a deal in the same conversion request
- lead status becomes `converted`
- lead stores:
  - `customer_id`
  - `converted_customer_id`
  - `converted_deal_id`
  - `converted_at`

This gives the UI a clear transition from prospect tracking to customer/deal tracking without manually recreating records.

## Deal Workflow Model

Current implemented behavior:

- deals are shown in a kanban-style board by stage
- detail opens in a popup instead of expanding the page layout
- stage history is displayed from CRM data
- comments are shared through CRM so teammates can see each other's updates
- deal conversion from leads can pre-fill downstream deal context

The current deal board is not drag-and-drop yet.

Stage changes still happen through explicit edit flows that write back to CRM.

## Task Workflow Model

Current implemented behavior:

- publisher can create:
  - individual task
  - broadcast task
- broadcast publish is implemented as one CRM task per recipient plus a shared `broadcast_group_id`
- `Open Tickets` is the response inbox for pending assignments
- `My Tasks` is the accepted-work queue for the current user
- after acceptance:
  - task leaves `Open Tickets`
  - task appears in `My Tasks`
- publisher can delete a task they created
- for broadcast tasks, delete removes every task copy in that publish group

Current access rule:

- creator and assignee can see an individual task
- unrelated company members should not see that task
- creator can still monitor grouped outcomes for broadcast tasks

## Recommended Next Improvements

Useful next professionalization items for leads:

- activity timeline
- stage timestamps and time-in-stage reporting
- lost reason capture
- duplicate detection
- bulk actions
- saved views
- kanban board
- more advanced assignment policies

## Why This Repo Uses SuperTokens

The current direction is:

- browser-facing auth lives in the web app
- core CRM API remains internal

That is safer than exposing internal CRM authentication directly to the browser.

SuperTokens is being used for:

- app auth/session mechanics
- not for CRM business data

## Current Auth UI

The auth UI intentionally uses:

- dark purple / neon glow theme
- grid and orbit-like branded panel
- Tailwind-only styling
- component-based structure

This was chosen to stay close to the Lisent visual direction without copying the intro page literally.

## Hydration Notes

There was a hydration warning during local testing.

Root cause:

- browser extension modified DOM before React hydration

Evidence:

- extra attributes injected on `<body>`:
  - `data-new-gr-c-s-check-loaded`
  - `data-gr-ext-installed`

This is typically caused by Grammarly or similar extensions.

Current code already avoids the app-side mismatch pattern by using stable client guards for auth/session-heavy components.

If the warning appears again:

1. test in incognito
2. disable extensions on localhost

## Environment Variables

The repo expects:

```env
NEXT_PUBLIC_APP_NAME=Lisent CRM
NEXT_PUBLIC_API_DOMAIN=http://localhost:3011
NEXT_PUBLIC_WEBSITE_DOMAIN=http://localhost:3011
NEXT_PUBLIC_API_BASE_PATH=/api/auth
NEXT_PUBLIC_WEBSITE_BASE_PATH=/auth

SUPERTOKENS_CONNECTION_URI=http://localhost:3567
SUPERTOKENS_API_KEY=

CRM_BASE_URL=http://localhost:9090
CRM_INTERNAL_API_KEY=
PLATFORM_SUPER_ADMIN_EMAILS=
```

Important:

- `CRM_INTERNAL_API_KEY` must stay server-side only
- browser code must not call the Go CRM directly with this key
- `PLATFORM_SUPER_ADMIN_EMAILS` and `PLATFORM_SUPER_ADMIN_USER_IDS` can bootstrap internal `super_admin` users

## Important Files

### App entry

- `src/app/layout.tsx`
- `src/app/page.tsx`

### Auth routes

- `src/app/api/auth/[...path]/route.ts`
- `src/app/auth/[[...path]]/page.tsx`

### Session test route

- `src/app/api/session/route.ts`

### Auth UI

- `src/components/auth/auth-page.tsx`
- `src/components/auth/auth-shell.tsx`
- `src/components/auth/auth-brand-panel.tsx`
- `src/components/auth/auth-form-card.tsx`

### Dashboard shell

- `src/components/dashboard/shared/dashboard-shell.tsx`
- `src/components/dashboard/home/session-panel.tsx`
- `src/components/dashboard/companies/company-workspace.tsx`
- `src/components/dashboard/customers/customer-directory.tsx`
- `src/app/dashboard/page.tsx`

### SuperTokens config

- `src/config/app-info.ts`
- `src/lib/supertokens/frontend.ts`
- `src/lib/supertokens/backend.ts`

## What Still Needs To Be Built

High priority:

1. BFF CRM route layer
2. tenant membership resolution
3. user/company/role-aware route protection
4. protected app shell with nav/sidebar
5. customer/companies/import-profile screens

Recommended next backend-facing work in this repo:

### 1. Add CRM client helpers

Suggested future path:

- `src/lib/crm/client.ts`
- `src/lib/crm/customers.ts`
- `src/lib/crm/companies.ts`
- `src/lib/crm/import-profiles.ts`

### 2. Add BFF routes

Suggested future path:

- `src/app/api/crm/customers/...`
- `src/app/api/crm/companies/...`
- `src/app/api/crm/import-profiles/...`

### 3. Add auth/tenant utilities

Suggested future path:

- `src/lib/auth/session.ts`
- `src/lib/auth/tenant-context.ts`
- `src/lib/auth/roles.ts`

## Coding Rules For Future Changes

1. Keep CRM business logic out of page components
2. Put API-calling logic in `lib/` or BFF routes, not random UI files
3. Keep browser code free of internal CRM secrets
4. Split route/controller/layout/form concerns early
5. Prefer deterministic server-side tenant scoping over client-side assumptions

## AI Handoff Notes

If another AI or developer continues from here, the correct mental model is:

- this repo is the web shell, not the CRM core
- auth is handled here
- tenant/company context will be resolved here
- trusted server-to-server CRM calls should happen here
- the Go CRM repo remains the source of truth for domain logic

Do not reintroduce these anti-patterns:

- direct browser calls to CRM with internal API key
- large all-in-one route/page files
- duplicated CRM business logic in React components
- storing tenant rules only on the client

## Runbook

Local dev:

```bash
npm run dev
```

Checks:

```bash
npm run lint
npm run build
```

Default dev URL:

- `http://localhost:3011`

## Recommended Reading Order For New Developers

1. `docs/DEVELOPER_CONTEXT.md`
2. `README.md`
3. `src/config/app-info.ts`
4. `src/lib/supertokens/frontend.ts`
5. `src/lib/supertokens/backend.ts`
6. `src/app/api/auth/[...path]/route.ts`
7. `src/components/auth/*`
