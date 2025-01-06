# syntax=docker/dockerfile:1.4

# Build stage
FROM node:18-alpine AS builder

# Install build essentials and dumb-init
RUN apk add --no-cache \
    dumb-init=1.2.5-r1 \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies with exact versions
RUN npm ci --ignore-scripts

# Copy source code
COPY src/ ./src/

# Build TypeScript code with optimizations
RUN npm run build \
    && npm run security:audit \
    && npm run test \
    && npm prune --production

# Production stage
FROM node:18-alpine

# Install dumb-init for proper process management
RUN apk add --no-cache dumb-init=1.2.5-r1 \
    && rm -rf /var/cache/apk/*

# Create app directory and set permissions
WORKDIR /app

# Copy production dependencies and compiled assets
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Set secure file permissions
RUN chown -R node:node /app \
    && chmod -R 550 /app \
    && chmod -R 770 /app/node_modules \
    && mkdir -p /tmp/attribution-analytics \
    && chown -R node:node /tmp/attribution-analytics \
    && chmod 770 /tmp/attribution-analytics

# Configure environment
ENV NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=4096" \
    PORT=3000

# Set up health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/health || exit 1

# Switch to non-root user
USER node

# Expose application ports
EXPOSE 3000
EXPOSE 9229

# Configure volumes
VOLUME ["/app/node_modules", "/tmp/attribution-analytics"]

# Set security options
LABEL org.opencontainers.image.source="https://github.com/org/attribution-analytics"
LABEL org.opencontainers.image.description="Multi-Touch Attribution Analytics Backend Service"
LABEL org.opencontainers.image.version="1.0.0"

# Use dumb-init as entrypoint for proper signal handling
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start the application
CMD ["node", "dist/server.js"]