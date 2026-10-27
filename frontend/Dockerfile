# ==============================================================================
# Stage 1: Build Frontend Assets with Vite
# ==============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency specifications
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application source and build configuration
COPY tsconfig.json tsconfig.app.json tsconfig.node.json* vite.config.ts index.html postcss.config.js tailwind.config.js ./
COPY src/ ./src/
COPY public/ ./public/

# Build static production bundle into /app/dist
RUN npm run build

# ==============================================================================
# Stage 2: Serve Bundle with Nginx Reverse Proxy
# ==============================================================================
FROM nginx:alpine AS runner

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom Nginx configuration with /api reverse proxy and SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/nginx-health || exit 1

CMD ["nginx", "-g", "daemon off;"]
