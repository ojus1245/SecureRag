-- Migration: Create Extensions
-- Description: Create required PostgreSQL extensions

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Cryptographic functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Vector similarity search (requires pgvector)
CREATE EXTENSION IF NOT EXISTS "vector";

-- Full-text search improvements
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Trigram matching for fuzzy search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";