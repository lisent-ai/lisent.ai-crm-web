# Local Development vs Production

This note explains the current environment split for the CRM system.

The current situation is:
- production-style deployment exists already
- local development should use the `docker-compose.dev.yml` files only
- the biggest risk is accidentally running the CRM service production-style compose files against the production-like database/network

## Repos

There are two repos involved:
- `lisent.ai-crm-web`
- `lisent.ai-CRM-service`

## Production-style files

These files are for the deployed/shared environment and should not be used for normal local development work.

### CRM service
- [docker-compose.yml](</home/berkay/allGathered/lisent.ai-CRM-service/docker-compose.yml>)
- [docker-compose.migrate.yml](</home/berkay/allGathered/lisent.ai-CRM-service/docker-compose.migrate.yml>)

Important details:
- they use `dokploy-network`
- they expect real env values like `${DB_DSN}`
- they are meant to connect to the production-like CRM database and runtime

### CRM web
- [docker-compose.prod.yml](</home/berkay/allGathered/lisent.ai-crm-web/docker-compose.prod.yml>)
- [docker-compose.supertokens.yml](</home/berkay/allGathered/lisent.ai-crm-web/docker-compose.supertokens.yml>)

Important details:
- they also use `dokploy-network`
- they expect real env values for auth, CRM base URL, and internal keys

## Development files

These are the safe files for local work.

### CRM service dev
- [docker-compose.dev.yml](</home/berkay/allGathered/lisent.ai-CRM-service/docker-compose.dev.yml>)

This starts:
- CRM Postgres on host port `5532`
- CRM migration job
- CRM API on host port `9190`
- CRM pgAdmin on host port `8181`

Network:
- `lisent-dev-network`

Database:
- local dev database name is `lisent_crm_dev`

### CRM web dev
- [docker-compose.dev.yml](</home/berkay/allGathered/lisent.ai-crm-web/docker-compose.dev.yml>)

This starts:
- auth Postgres on host port `5533`
- SuperTokens on host port `3667`
- CRM web on host port `3111`
- auth pgAdmin on host port `8182`

Network:
- `lisent-dev-network`

## Important networking detail

In local development:
- from your browser, CRM web runs at `http://localhost:3111`
- from your browser, CRM API runs at `http://localhost:9190`

But inside Docker, the web app talks to the CRM service using:
- `CRM_BASE_URL=http://crm-service:9090`

This is correct in development because:
- the CRM dev compose service name is `crm-service`
- containers on `lisent-dev-network` resolve each other by service name

So:
- host machine -> `localhost:9190`
- web container -> `http://crm-service:9090`

## Safe local workflow

Create the shared dev network once:

```bash
docker network create lisent-dev-network
```

Start CRM service dev:

```bash
cd /home/berkay/allGathered/lisent.ai-CRM-service
docker compose -f docker-compose.dev.yml up -d --build
```

Start CRM web dev:

```bash
cd /home/berkay/allGathered/lisent.ai-crm-web
docker compose -f docker-compose.dev.yml up -d --build
```

Stop CRM service dev:

```bash
cd /home/berkay/allGathered/lisent.ai-CRM-service
docker compose -f docker-compose.dev.yml down
```

Stop CRM web dev:

```bash
cd /home/berkay/allGathered/lisent.ai-crm-web
docker compose -f docker-compose.dev.yml down
```

If you intentionally want to wipe local dev data:

```bash
docker compose -f docker-compose.dev.yml down -v
```

Run that only in the repo whose local dev volumes you want to delete.

## What not to run for local development

Do not use these for ordinary local development:
- `lisent.ai-CRM-service/docker-compose.yml`
- `lisent.ai-CRM-service/docker-compose.migrate.yml`
- `lisent.ai-crm-web/docker-compose.prod.yml`
- `lisent.ai-crm-web/docker-compose.supertokens.yml`

Especially avoid:

```bash
cd /home/berkay/allGathered/lisent.ai-CRM-service
docker compose up
```

Why this is risky:
- default compose behavior will use `docker-compose.yml`
- that file is wired to `dokploy-network`
- it may point to the production-like CRM environment depending on env values

## Main risk summary

The dev/prod split is mostly correct.

The main operational risk is human error:
- running the wrong compose file
- running production-style migration against the wrong database
- assuming host ports and container-to-container ports are the same

## Recommended team rule

For local development, always use:
- `docker compose -f docker-compose.dev.yml ...`

For anything production-like, treat it as separate and deliberate:
- use the non-dev compose files only when you explicitly intend to work with the deployed/shared environment
