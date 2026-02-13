# syntax=docker/dockerfile:1

# Multi-stage build for the AerialCast Next.js dashboard
FROM node:20-alpine AS base

ENV PNPM_HOME="/pnpm" \
    PATH="$PNPM_HOME:$PATH"

RUN corepack enable \
    && apk add --no-cache libc6-compat

WORKDIR /app

# Install all dependencies (including dev) for building
FROM base AS deps

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Build the Next.js application
FROM deps AS build

COPY . .
RUN pnpm build

# Prune to production dependencies only
FROM deps AS prod-deps

RUN pnpm prune --prod

# Final runtime image
FROM base AS runner

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000

WORKDIR /app

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/public ./public
COPY --from=build /app/.next ./.next
COPY package.json ./

EXPOSE 3000

CMD ["node", "node_modules/next/dist/bin/next", "start", "-H", "0.0.0.0", "-p", "3000"]
