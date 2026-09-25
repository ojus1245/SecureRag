-- Secure Enterprise RAG Knowledge Base
-- Complete Database Schema
-- Version: 1.0.0

-- This file combines all migrations into a single schema definition
-- For production, use migrations directory for version control

\echo 'Creating Secure RAG Database Schema...'

-- Include all migrations
\i migrations/001_create_extensions.sql
\i migrations/002_create_schemas.sql
\i migrations/003_create_auth_tables.sql
\i migrations/004_create_document_tables.sql
\i migrations/005_create_chat_tables.sql
\i migrations/006_create_audit_tables.sql
\i migrations/007_create_system_tables.sql
\i migrations/008_create_triggers.sql
\i migrations/009_create_views.sql
\i migrations/010_create_functions.sql

\echo 'Database schema created successfully!'