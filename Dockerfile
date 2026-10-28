# Multi-stage build for Ahumados del Valle Frontend
# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package manifests
COPY package.json package-lock.json* ./

# Install all dependencies for build
RUN npm ci --legacy-peer-deps

# Copy source files
COPY . .

# Build application with TanStack Start & Nitro
RUN npm run build

# Stage 2: Production Runner
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# Copy built server and static assets from builder stage
COPY --from=builder /app/.output ./.output

# Expose web port
EXPOSE 3000

# Run as non-root user
USER node

# Launch production server
CMD ["node", ".output/server/index.mjs"]

