# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
# Pin npm to v11 in this stage so lockfile v3 (authored locally with npm@11)
# parses correctly. Does not affect package versions — `npm ci` is
# deterministic; only the npm CLI tool is upgraded.
RUN npm install -g npm@11
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Do not bake a production domain in the image: pass these as build args (e.g. Dokploy).
# Defaults are localhost-only so local `docker build` still works; empty ARG would break SuperTokens at build.
ARG NEXT_PUBLIC_APP_NAME="Lisent CRM"
ARG NEXT_PUBLIC_API_DOMAIN=http://localhost:3011
ARG NEXT_PUBLIC_WEBSITE_DOMAIN=http://localhost:3011
ARG NEXT_PUBLIC_API_BASE_PATH=/api/auth
ARG NEXT_PUBLIC_WEBSITE_BASE_PATH=/auth
ARG NEXT_PUBLIC_UI_ONLY_MODE=false
# Feature flags — baked into the client bundle at build time. Default off so
# production builds without the arg stay safe.
ARG NEXT_PUBLIC_INTEGRATIONS_HUB_ENABLED=false
ARG NEXT_PUBLIC_INTRANET_INTEGRATION_ENABLED=false
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
ENV NEXT_PUBLIC_API_DOMAIN=$NEXT_PUBLIC_API_DOMAIN
ENV NEXT_PUBLIC_WEBSITE_DOMAIN=$NEXT_PUBLIC_WEBSITE_DOMAIN
ENV NEXT_PUBLIC_API_BASE_PATH=$NEXT_PUBLIC_API_BASE_PATH
ENV NEXT_PUBLIC_WEBSITE_BASE_PATH=$NEXT_PUBLIC_WEBSITE_BASE_PATH
ENV NEXT_PUBLIC_UI_ONLY_MODE=$NEXT_PUBLIC_UI_ONLY_MODE
ENV NEXT_PUBLIC_INTEGRATIONS_HUB_ENABLED=$NEXT_PUBLIC_INTEGRATIONS_HUB_ENABLED
ENV NEXT_PUBLIC_INTRANET_INTEGRATION_ENABLED=$NEXT_PUBLIC_INTRANET_INTEGRATION_ENABLED

RUN mkdir -p public
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3011
ENV HOSTNAME=0.0.0.0
# Set at deploy time (Dokploy env): APP_PUBLIC_ORIGIN=https://your.domain (no trailing slash)

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3011
CMD ["node", "server.js"]
