-- Migration: Create Schemas
-- Description: Create database schemas for logical separation

CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS documents;
CREATE SCHEMA IF NOT EXISTS chat;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS system;

COMMENT ON SCHEMA auth IS 'Authentication and user management';
COMMENT ON SCHEMA documents IS 'Document storage and management';
COMMENT ON SCHEMA chat IS 'Chat and conversation management';
COMMENT ON SCHEMA audit IS 'Audit logging and compliance';
COMMENT ON SCHEMA system IS 'System configuration and management';