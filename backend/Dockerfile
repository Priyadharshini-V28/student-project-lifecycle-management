# ==============================================================================
# Stage 1: Build Application
# ==============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency specifications
COPY package*.json ./

# Install all dependencies including devDependencies for TypeScript compilation
RUN npm ci

# Copy source and configurations
COPY tsconfig.json ./
COPY src/ ./src/

# Compile TypeScript to JavaScript in /app/dist
RUN npm run build

# ==============================================================================
# Stage 2: Production Runtime
# ==============================================================================
FROM node:20-alpine AS runner

WORKDIR /app

# Install wget for container health checks
RUN apk add --no-cache wget

# Copy package manifests and install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled artifacts from builder stage
COPY --from=builder /app/dist ./dist

# Create uploads storage directory and configure ownership for node user
RUN mkdir -p /app/uploads && chown -R node:node /app

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=5000
ENV UPLOAD_DIR=uploads

# Mount volume for persistent document storage
VOLUME ["/app/uploads"]

# Run as non-privileged node user for security
USER node

EXPOSE 5000

# Container healthcheck against /api/health
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

CMD ["node", "dist/server.js"]
