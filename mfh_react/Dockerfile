# ── Étape 1 : build React ───────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# VITE_DJANGO_ADMIN_URL est injecté en arg de build (variable Railway)
ARG VITE_DJANGO_ADMIN_URL
ENV VITE_DJANGO_ADMIN_URL=$VITE_DJANGO_ADMIN_URL

RUN npm run build

# ── Étape 2 : nginx pour servir le build ────────────────────────────────────
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# Template nginx : DJANGO_API_URL et PORT injectés au démarrage
COPY nginx.conf.template /etc/nginx/conf.d/default.conf.template

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
