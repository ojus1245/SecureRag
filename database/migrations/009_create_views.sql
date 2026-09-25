-- Migration: Create Views
-- Description: Create database views for common queries

-- Active users view
CREATE OR REPLACE VIEW auth.active_users AS
SELECT 
    u.id,
    u.username,
    u.email,
    u.full_name,
    u.department,
    u.security_clearance,
    u.is_active,
    u.last_login,
    r.name as role_name,
    r.permissions as role_permissions,
    r.access_level
FROM auth.users u
JOIN auth.user_roles ur ON u.id = ur.user_id
JOIN auth.roles r ON ur.role_id = r.id
WHERE u.is_active = TRUE AND r.is_active = TRUE;

-- Published documents view
CREATE OR REPLACE VIEW documents.published_documents AS
SELECT 
    d.id,
    d.title,
    d.department,
    d.classification,
    d.tags,
    d.version,
    d.created_at,
    d.updated_at,
    u.username as owner_username,
    u.full_name as owner_full_name,
    d.access_count
FROM documents.documents d
JOIN auth.users u ON d.owner_id = u.id
WHERE d.status = 'published' AND d.is_latest_version = TRUE;

-- Document access view
CREATE OR REPLACE VIEW documents.document_access AS
SELECT 
    d.id as document_id,
    d.title,
    d.classification,
    d.department,
    d.owner_id,
    u.id as user_id,
    u.username,
    u.security_clearance,
    CASE 
        WHEN d.owner_id = u.id THEN 'owner'
        WHEN d.classification = 'public' THEN 'public'
        WHEN acl.user_id = u.id THEN 'explicit'
        WHEN d.department = u.department AND d.classification = 'internal' THEN 'department'
        ELSE 'none'
    END as access_type,
    CASE 
        WHEN d.owner_id = u.id THEN ARRAY['read', 'write', 'delete', 'share', 'download']::text[]
        WHEN d.classification = 'public' THEN ARRAY['read']::text[]
        WHEN acl.user_id = u.id THEN acl.permissions
        WHEN d.department = u.department AND d.classification = 'internal' THEN ARRAY['read']::text[]
        ELSE ARRAY[]::text[]
    END as permissions
FROM documents.documents d
CROSS JOIN auth.users u
LEFT JOIN documents.document_acl acl ON d.id = acl.document_id 
    AND u.id = acl.user_id 
    AND acl.is_active = TRUE 
    AND (acl.expires_at IS NULL OR acl.expires_at > NOW())
WHERE d.status = 'published';

-- User activity summary view
CREATE OR REPLACE VIEW audit.user_activity_summary AS
SELECT 
    u.id as user_id,
    u.username,
    u.full_name,
    COUNT(al.id) as total_actions,
    MAX(al.timestamp) as last_activity,
    MIN(al.timestamp) as first_activity,
    COUNT(DISTINCT al.action) as unique_actions,
    COUNT(*) FILTER (WHERE al.status = 'success') as successful_actions,
    COUNT(*) FILTER (WHERE al.status = 'failure') as failed_actions
FROM auth.users u
LEFT JOIN audit.audit_logs al ON u.id = al.user_id
GROUP BY u.id, u.username, u.full_name;