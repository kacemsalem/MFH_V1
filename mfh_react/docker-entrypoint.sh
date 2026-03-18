#!/bin/sh
# Injecte PORT et DJANGO_API_URL dans la config nginx au démarrage
export PORT="${PORT:-80}"
export DJANGO_API_URL="${DJANGO_API_URL:-http://localhost:8000}"

envsubst '${PORT} ${DJANGO_API_URL}' \
  < /etc/nginx/conf.d/default.conf.template \
  > /etc/nginx/conf.d/default.conf

exec nginx -g "daemon off;"
