# ============================================
# AI Service Dockerfile — Python FastAPI + ML
# Multi-stage build with optional GPU support
# ============================================

# ── Stage 1: Builder ──
FROM python:3.11-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    g++ \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy and install requirements
COPY ai-service/requirement.txt ./requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir --default-timeout=1000 --extra-index-url https://download.pytorch.org/whl/cpu --prefix=/install -r requirements.txt

# ── Stage 2: Production ──
FROM python:3.11-slim AS production

LABEL maintainer="Secure RAG Team"
LABEL description="Secure Enterprise RAG Knowledge Base — AI Service"
LABEL version="1.0.0"

# Security: create non-root user
RUN groupadd -g 1001 appgroup && \
    useradd -u 1001 -g appgroup -s /bin/bash -m appuser

WORKDIR /app

# Install runtime dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy installed Python packages from builder
COPY --from=builder /install /usr/local

# Copy application code
COPY ai-service/app ./app
COPY ai-service/requirement.txt ./requirements.txt

# Copy model config
COPY models/safety-classifier/config.json ./models/safety-classifier/config.json

# Create directories for model cache and logs
RUN mkdir -p /app/models/cache /app/logs && \
    chown -R appuser:appgroup /app

# Environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app \
    TRANSFORMERS_CACHE=/app/models/cache \
    HF_HOME=/app/models/cache \
    TOKENIZERS_PARALLELISM=false

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=15s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start application with uvicorn
CMD ["python", "-m", "uvicorn", "app.main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--workers", "2", \
     "--log-level", "info", \
     "--access-log"]
