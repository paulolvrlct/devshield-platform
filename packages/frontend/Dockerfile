# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve static files
FROM caddy:2-alpine
COPY --from=build /app/dist /srv
COPY Caddyfile.frontend /etc/caddy/Caddyfile
EXPOSE 5173
