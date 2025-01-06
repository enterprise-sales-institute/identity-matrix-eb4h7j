# Stage 1: Build stage
FROM node:18.17-alpine3.18 AS builder

# Set working directory
WORKDIR /app

# Install build dependencies and security updates
RUN apk update && \
    apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    && rm -rf /var/cache/apk/*

# Copy package files for dependency installation
COPY package*.json ./

# Install dependencies with strict security and integrity checks
RUN npm ci --production=false \
    && npm audit \
    && npm cache clean --force

# Copy source code and configuration files
COPY . .

# Set build-time variables
ARG API_BASE_URL
ARG BUILD_VERSION
ENV VITE_API_BASE_URL=${API_BASE_URL}
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Build production bundle with optimization flags
RUN npm run build \
    && npm prune --production

# Generate compressed static assets
RUN cd dist && \
    find . -type f -regex '.*\.\(js\|css\|html\|svg\)$' -exec gzip -9 -k {} \; \
    && find . -type f -regex '.*\.\(js\|css\|html\|svg\)$' -exec brotli -9 -k {} \;

# Stage 2: Production stage
FROM nginx:1.25.3-alpine3.18

# Install security updates and create nginx user
RUN apk update && \
    apk upgrade && \
    apk add --no-cache curl tzdata && \
    rm -rf /var/cache/apk/*

# Create nginx user and group with restricted permissions
RUN addgroup -g 101 -S nginx && \
    adduser -S -D -H -u 101 -h /var/cache/nginx -s /sbin/nologin -G nginx -g nginx nginx

# Copy nginx configuration with security enhancements
COPY nginx.conf /etc/nginx/nginx.conf
COPY --chown=nginx:nginx --from=builder /app/dist /usr/share/nginx/html

# Set proper permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 500 /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx /var/log/nginx && \
    chmod -R 500 /var/cache/nginx && \
    touch /var/run/nginx.pid && \
    chown nginx:nginx /var/run/nginx.pid && \
    rm /etc/nginx/conf.d/default.conf

# Configure security headers and other settings
RUN echo 'add_header X-Frame-Options "DENY";' >> /etc/nginx/conf.d/security.conf && \
    echo 'add_header X-Content-Type-Options "nosniff";' >> /etc/nginx/conf.d/security.conf && \
    echo 'add_header X-XSS-Protection "1; mode=block";' >> /etc/nginx/conf.d/security.conf && \
    echo 'add_header Referrer-Policy "strict-origin-when-cross-origin";' >> /etc/nginx/conf.d/security.conf && \
    echo 'add_header Content-Security-Policy "default-src '\''self'\''; script-src '\''self'\'' '\''unsafe-inline'\''; style-src '\''self'\'' '\''unsafe-inline'\'';";' >> /etc/nginx/conf.d/security.conf

# Set environment variables
ENV TZ=UTC
ENV NGINX_PORT=80

# Expose port
EXPOSE 80

# Configure volumes
VOLUME ["/etc/nginx/conf.d", "/var/cache/nginx"]

# Set up healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl --fail http://localhost:80/health || exit 1

# Set security options
USER nginx
WORKDIR /usr/share/nginx/html

# Add metadata labels
LABEL maintainer="DevOps Team <devops@company.com>" \
    application="attribution-analytics-web" \
    version="${BUILD_VERSION}" \
    security.scan-date="${BUILD_DATE}" \
    org.opencontainers.image.source="https://github.com/company/attribution-analytics" \
    org.opencontainers.image.licenses="proprietary"

# Start nginx
CMD ["nginx", "-g", "daemon off;"]