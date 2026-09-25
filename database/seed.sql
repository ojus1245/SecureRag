-- Secure Enterprise RAG Knowledge Base
-- Complete Seed Data
-- Version: 1.0.0

\echo 'Seeding Secure RAG Database...'

-- Include seed migration
\i migrations/011_seed_data.sql

-- ============================================
-- Additional Seed Data
-- ============================================

-- Create admin user (password: Admin@123456)
INSERT INTO auth.users (username, email, password_hash, full_name, department, 
                       security_clearance, is_active, token_version) 
VALUES ('admin', 'admin@secure-rag.com', 
        '$2a$12$LJ3m4y3YJ3m4y3YJ3m4y3u3m4y3YJ3m4y3YJ3m4y3YJ3m4y3YJ3m4y3e', 
        'System Administrator', 'IT', 'restricted', TRUE, 0)
ON CONFLICT (email) DO NOTHING;

-- Assign admin role
INSERT INTO auth.user_roles (user_id, role_id)
SELECT u.id, r.id FROM auth.users u, auth.roles r 
WHERE u.username = 'admin' AND r.name = 'admin'
ON CONFLICT DO NOTHING;

-- Create sample documents
DO $$
DECLARE
    admin_id UUID;
BEGIN
    SELECT id INTO admin_id FROM auth.users WHERE username = 'admin';
    
    IF admin_id IS NOT NULL THEN
        -- Sample document 1
        INSERT INTO documents.documents (
            title, content, content_hash, encrypted_content, 
            encryption_key_id, encrypted_embedding, embedding_key_id,
            vector_id, file_type, file_size, mime_type,
            owner_id, department, classification, tags, metadata
        ) VALUES (
            'Company Security Policy',
            'This document outlines the security policies for the organization...',
            encode(digest('Company Security Policy Content', 'sha256'), 'hex'),
            'encrypted_content_placeholder',
            'key-001',
            'encrypted_embedding_placeholder',
            'key-002',
            'vector-001',
            'txt', 1024, 'text/plain',
            admin_id, 'IT', 'confidential',
            ARRAY['security', 'policy'],
            '{"author": "Security Team", "year": 2024}'
        ) ON CONFLICT DO NOTHING;
        
        -- Sample document 2
        INSERT INTO documents.documents (
            title, content, content_hash, encrypted_content, 
            encryption_key_id, encrypted_embedding, embedding_key_id,
            vector_id, file_type, file_size, mime_type,
            owner_id, department, classification, tags, metadata
        ) VALUES (
            'Employee Handbook',
            'Welcome to the organization. This handbook contains...',
            encode(digest('Employee Handbook Content', 'sha256'), 'hex'),
            'encrypted_content_placeholder',
            'key-003',
            'encrypted_embedding_placeholder',
            'key-004',
            'vector-002',
            'txt', 2048, 'text/plain',
            admin_id, 'HR', 'internal',
            ARRAY['hr', 'handbook'],
            '{"author": "HR Team", "year": 2024}'
        ) ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Database seed completed successfully!';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Created:';
    RAISE NOTICE '  - 5 roles';
    RAISE NOTICE '  - 1 admin user (admin@secure-rag.com)';
    RAISE NOTICE '  - 2 sample documents';
    RAISE NOTICE '  - 8 system settings';
    RAISE NOTICE '=========================================';
END $$;