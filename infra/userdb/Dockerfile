FROM postgres:16-alpine
RUN apk add --no-cache openssl
COPY init-access.sh /docker-entrypoint-initdb.d/10-access.sh
COPY tls-entrypoint.sh /usr/local/bin/tls-entrypoint.sh
ENTRYPOINT ["/usr/local/bin/tls-entrypoint.sh"]
CMD []
