FROM node:20-bullseye-slim

WORKDIR /usr/src/app

# Install build deps for native modules
RUN apt-get update && apt-get install -y --no-install-recommends build-essential python3 ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY . .

# Ensure any host node_modules accidentally copied are removed, then install inside the image
# This guarantees native addons (sqlite3) are built for the container's Linux platform.
RUN if [ -d node_modules ]; then rm -rf node_modules; fi
RUN npm install --omit=dev
RUN npm rebuild sqlite3 --build-from-source || true

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "server.js"]
