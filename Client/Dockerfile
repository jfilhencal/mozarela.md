# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Accept build-time env so Vite can pick up the API base and AdSense ID when building the static bundle
ARG VITE_API_BASE
ARG VITE_ADSENSE_PUBLISHER_ID
ENV VITE_API_BASE=$VITE_API_BASE
ENV VITE_ADSENSE_PUBLISHER_ID=$VITE_ADSENSE_PUBLISHER_ID

COPY package.json package-lock.json* ./
RUN npm install
COPY . .
# Build the client with the injected environment variables
RUN npm run build

# Production stage
FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# Copy custom nginx config to proxy API requests to the api service
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
