# Multi-stage Dockerfile for Next.js (Next 16)
# Builds the app and runs it in production with `next start`.

FROM node:20-alpine AS builder

# Required for some native deps during install
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package manifests first and install dependencies (cache-able layer)
COPY package.json package-lock.json ./

# Install all deps for build
RUN npm ci --silent

# Copy rest of the sources
COPY . .

# Build the Next.js app
RUN npm run build

# Remove devDependencies to reduce size (prunes node_modules)
RUN npm prune --production --silent || true

# Runtime image
FROM node:20-alpine AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# Copy only what's needed to run the app
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["npm", "start"]
