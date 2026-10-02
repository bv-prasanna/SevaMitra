# Multi-stage build per docs/ARCHITECTURE.md §14.

FROM node:20-slim AS builder
WORKDIR /app
# Prisma's query engine can't detect libssl on the bare node:20-slim image
# without this — silent without it in some environments, hard failures in
# others. Installed in both stages since `prisma generate` (builder) and
# the actual query engine at runtime (runtime) both need it.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# prisma.config.ts resolves DATABASE_URL eagerly even for `generate` (which
# doesn't need a live connection) — a placeholder satisfies it at build time.
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=auth"
RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev

FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/package.json ./package.json

RUN useradd --system --uid 1001 nodeapp
USER nodeapp

EXPOSE 3000
CMD ["node", "dist/main"]
