FROM node:22-alpine AS dashboard
WORKDIR /repo/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
ARG VITE_PUBLIC_API_URL
RUN test -n "$VITE_PUBLIC_API_URL" || (echo "VITE_PUBLIC_API_URL build arg is required" && exit 1)
ENV VITE_PUBLIC_API_URL=$VITE_PUBLIC_API_URL
RUN npx vite build

FROM caddy:2-alpine
COPY infra/caddy/caddy.prod.json /etc/caddy/caddy.json
COPY marketing /srv/marketing
COPY --from=dashboard /repo/client/dist /srv/app
CMD ["sh", "-c", "mkdir -p /run/caddy && rm -f /run/caddy/admin.sock && caddy run --config /etc/caddy/caddy.json"]
