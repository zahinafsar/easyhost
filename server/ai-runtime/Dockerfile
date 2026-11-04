FROM node:22-alpine
WORKDIR /srv
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force
COPY start.sh /usr/local/bin/easyhost-start
RUN chmod +x /usr/local/bin/easyhost-start && mkdir -p /srv/app
WORKDIR /srv/app
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0 HOSTNAME=0.0.0.0
EXPOSE 3000
CMD ["easyhost-start"]
