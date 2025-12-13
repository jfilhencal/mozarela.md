# Multi-stage Dockerfile for Railway (all-in-one)
# This combines API + Client + Nginx into a single container

# Stage 1: Build the client
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY Client/package*.json ./
RUN npm install
COPY Client/ ./
ARG VITE_API_BASE=/api
ARG VITE_ADSENSE_PUBLISHER_ID=ca-pub-0000000000000000
ENV VITE_API_BASE=$VITE_API_BASE
ENV VITE_ADSENSE_PUBLISHER_ID=$VITE_ADSENSE_PUBLISHER_ID
RUN npm run build

# Stage 2: Build the API
FROM node:20-bullseye-slim AS api-builder
WORKDIR /app/api
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential python3 ca-certificates && \
    rm -rf /var/lib/apt/lists/*
COPY API/package*.json ./
RUN npm install --omit=dev
COPY API/ ./
RUN npm rebuild sqlite3 --build-from-source || true

# Stage 3: Final production image with nginx + node
FROM nginx:stable-alpine
# Install build dependencies for native modules
RUN apk add --no-cache \
    nodejs \
    npm \
    gettext \
    python3 \
    py3-setuptools \
    make \
    g++

# Copy Railway-specific nginx config (will substitute PORT at runtime)
COPY nginx-railway.conf /etc/nginx/conf.d/default.conf.template

# Copy built client
COPY --from=client-builder /app/client/dist /usr/share/nginx/html

# Copy API (without node_modules initially)
WORKDIR /app
COPY --from=api-builder /app/api/package*.json ./
COPY --from=api-builder /app/api/*.js ./

# Reinstall dependencies and rebuild sqlite3 for Alpine
RUN npm install --omit=dev && \
    npm rebuild sqlite3 --build-from-source

# Create data directory for SQLite
RUN mkdir -p /data

# Environment defaults
ENV NODE_ENV=production
ENV API_PORT=3001
ENV DATABASE_FILE=/data/database.db
ENV COOKIE_SECURE=true

# Create startup script that handles Railway's dynamic PORT
RUN echo '#!/bin/sh' > /start.sh && \
    echo 'export PORT=${PORT:-80}' >> /start.sh && \
    echo 'echo "Container will listen on port $PORT"' >> /start.sh && \
    echo 'echo "Starting API server on port 3001..."' >> /start.sh && \
    echo 'cd /app && node server.js &' >> /start.sh && \
    echo 'API_PID=$!' >> /start.sh && \
    echo 'echo "API started with PID $API_PID"' >> /start.sh && \
    echo 'sleep 3' >> /start.sh && \
    echo 'echo "Configuring Nginx to listen on port $PORT..."' >> /start.sh && \
    echo 'envsubst '"'"'$PORT'"'"' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf' >> /start.sh && \
    echo 'echo "Starting Nginx..."' >> /start.sh && \
    echo 'nginx -g "daemon off;"' >> /start.sh && \
    chmod +x /start.sh

EXPOSE 80
CMD ["/start.sh"]
