

# ── Stage 1: Dependencies ──
FROM node:20-alpine AS deps

WORKDIR /app

# Install build tools for native modules (bcrypt, etc.)
RUN apk add --no-cache python3 make g++

# Copy package files
COPY backend/package.json backend/package-lock.json* ./

# Install production dependencies only
RUN npm install --omit=dev && \
    npm cache clean --force

# ── Stage 2: Builder ──
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install ALL dependencies (including dev)
COPY backend/package.json backend/package-lock.json* ./
RUN apk add --no-cache python3 make g++ && \
    npm install && \
    npm cache clean --force

# Copy source code
COPY backend/src ./src

# ── Stage 3: Production ──
FROM node:20-alpine AS production

LABEL maintainer="Secure RAG Team"
LABEL description="Secure Enterprise RAG Knowledge Base — Backend API"
LABEL version="1.0.0"

# Security: run as non-root
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

WORKDIR /app

# Install security updates and runtime dependencies
RUN apk add --no-cache \
    dumb-init \
    curl \
    && apk upgrade --no-cache

# Copy production dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source from builder stage
COPY --from=builder /app/src ./src
COPY --from=builder /app/package.json ./

# Create required directories
RUN mkdir -p logs uploads && \
    chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "src/server.js"]
