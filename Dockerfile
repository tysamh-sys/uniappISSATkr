# Stage 1: Build & Dependencies
FROM node:20-alpine AS builder

# Install OpenSSL and libc compatibility for Prisma engine binaries on Alpine
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Copy dependency manifests and Prisma schema first for layer caching
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy application source code and compile TypeScript
COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# Stage 2: Production Runtime
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

ENV NODE_ENV=production

# Copy package manifests, Prisma schema & seed script
COPY package*.json ./
COPY prisma ./prisma/

# Copy dependencies and Prisma generated client from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 5000

# Automatically push database schema on start, then launch backend
CMD ["sh", "-c", "npx prisma db push && node dist/server.js"]
