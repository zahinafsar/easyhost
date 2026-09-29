FROM node:22-alpine AS dashboard
WORKDIR /repo/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
ARG VITE_PUBLIC_API_URL
RUN test -n "$VITE_PUBLIC_API_URL" || (echo "VITE_PUBLIC_API_URL build arg is required" && exit 1)
ENV VITE_PUBLIC_API_URL=$VITE_PUBLIC_API_URL
RUN npx vite build

FROM node:22-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY server/package.json server/package-lock.json ./
RUN npm ci
COPY server/prisma ./prisma
COPY server/tsconfig.json ./
COPY server/src ./src
RUN npx prisma generate && npx tsc && npm prune --omit=dev

FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY --from=pgsty/mc:RELEASE.2026-09-16T00-00-00Z /usr/bin/mc /usr/bin/mc
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY server/package.json ./
COPY marketing ./public/marketing
COPY --from=dashboard /repo/client/dist ./public/dashboard
EXPOSE 48710
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
