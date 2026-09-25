

# ── Stage 1: Dependencies ──
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package files
COPY frontend/package.json frontend/package-lock.json* ./

# Install dependencies
RUN npm install --legacy-peer-deps && npm cache clean --force

# ── Stage 2: Builder ──
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY frontend/package.json ./package.json
COPY frontend/src ./src
COPY frontend/public ./public
COPY frontend/index.html ./index.html
COPY frontend/vite.config.js ./vite.config.js
COPY frontend/tsconfig.json ./tsconfig.json

# Set build-time environment variables
ARG VITE_API_URL=/api
ARG VITE_APP_VERSION=1.0.0
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_APP_VERSION=${VITE_APP_VERSION}

# Build production bundle
RUN npm run build

# ── Stage 3: Production (Nginx) ──
FROM nginx:1.25-alpine AS production

LABEL maintainer="Secure RAG Team"
LABEL description="Secure Enterprise RAG Knowledge Base — Frontend"
LABEL version="1.0.0"

# Remove default nginx config
RUN rm -rf /etc/nginx/conf.d/default.conf /usr/share/nginx/html/*

# Custom nginx configuration
COPY --from=builder /app/dist /usr/share/nginx/html

# Create nginx config for SPA routing and security headers
RUN cat > /etc/nginx/conf.d/default.conf << 'EOF'
server {
listen 80;
server_name _;
root /usr/share/nginx/html;
index index.html;

# Security headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' http://localhost:5000" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

# Gzip compression
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_types
text/plain
text/css
text/xml
text/javascript
application/json
application/javascript
application/xml
application/rss+xml
image/svg+xml;

# Cache static assets aggressively
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
expires 1y;
add_header Cache-Control "public, immutable";
access_log off;
}

# API proxy — forward to backend
location /api/ {
proxy_pass http://backend:5000/api/;
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_connect_timeout 30s;
proxy_send_timeout 60s;
proxy_read_timeout 60s;
}

# SPA fallback — serve index.html for all routes
location / {
try_files $uri $uri/ /index.html;
}

# Deny access to hidden files
location ~ /\. {
deny all;
access_log off;
log_not_found off;
}
}
EOF

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:80/ || exit 1

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
