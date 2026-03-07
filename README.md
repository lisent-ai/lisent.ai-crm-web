This is the browser-facing web app for Lisent CRM. It is responsible for:

- user authentication with SuperTokens
- tenant-aware app flows
- backend-for-frontend routes that call the internal Go CRM service

The Go CRM service stays in the separate `lisent.ai-CRM-service` repo.

Detailed handoff docs:

- `docs/DEVELOPER_CONTEXT.md`

## Environment

Create `.env.local` from `.env.example`.

Required variables:

```env
NEXT_PUBLIC_APP_NAME=Lisent CRM
NEXT_PUBLIC_API_DOMAIN=http://localhost:3010
NEXT_PUBLIC_WEBSITE_DOMAIN=http://localhost:3010
NEXT_PUBLIC_API_BASE_PATH=/api/auth
NEXT_PUBLIC_WEBSITE_BASE_PATH=/auth

SUPERTOKENS_CONNECTION_URI=http://localhost:3567
SUPERTOKENS_API_KEY=

CRM_BASE_URL=http://localhost:9090
CRM_INTERNAL_API_KEY=
```

Notes:

- `SUPERTOKENS_CONNECTION_URI` points to your SuperTokens Core instance.
- `CRM_INTERNAL_API_KEY` must remain server-side only.
- The dev server is pinned to port `3010`.

## Getting started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3010](http://localhost:3010) with your browser to see the result.

Auth routes live under:

- frontend auth UI: `/auth`
- backend auth APIs: `/api/auth/*`

## Current status

Implemented:

- Next.js 16 App Router + TypeScript
- Tailwind CSS 4
- SuperTokens frontend init
- SuperTokens backend init
- App Router auth route handler
- Auth catch-all page

Next steps:

1. connect a running SuperTokens Core instance
2. add protected app routes and session checks
3. add backend-for-frontend CRM routes
4. resolve `user_id`, `company_id`, and `role` per session

## References

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [SuperTokens Next.js App Router guide](https://supertokens.com/docs/quickstart/integrations/nextjs/app-directory/init)
