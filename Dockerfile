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
RUN apk add --no-cache nodejs npm

# Copy Railway-specific nginx config (proxies to localhost instead of separate container)
COPY nginx-railway.conf /etc/nginx/conf.d/default.conf

# Copy built client
COPY --from=client-builder /app/client/dist /usr/share/nginx/html

# Copy API
WORKDIR /app
COPY --from=api-builder /app/api ./

# Create data directory for SQLite
RUN mkdir -p /data

# Environment defaults
ENV NODE_ENV=production
ENV PORT=3001
ENV DATABASE_FILE=/data/database.db
ENV COOKIE_SECURE=true

# Create startup script that runs API in background and nginx in foreground
RUN echo '#!/bin/sh' > /start.sh && \
    echo 'echo "Starting API server on port 3001..."' >> /start.sh && \
    echo 'cd /app && node server.js &' >> /start.sh && \
    echo 'API_PID=$!' >> /start.sh && \
    echo 'echo "API started with PID $API_PID"' >> /start.sh && \
    echo 'sleep 2' >> /start.sh && \
    echo 'echo "Starting Nginx..."' >> /start.sh && \
    echo 'nginx -g "daemon off;"' >> /start.sh && \
    chmod +x /start.sh

EXPOSE 80
CMD ["/start.sh"]
