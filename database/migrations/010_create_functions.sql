-- Migration: Create Functions
-- Description: Create database functions for common operations

-- Function to get user permissions
CREATE OR REPLACE FUNCTION auth.get_user_permissions(user_id UUID)
RETURNS TEXT[] AS $$
DECLARE
    permissions TEXT[];
BEGIN
    SELECT array_agg(DISTINCT p) INTO permissions
    FROM (
        SELECT unnest(r.permissions) as p
        FROM auth.user_roles ur
        JOIN auth.roles r ON ur.role_id = r.id
        WHERE ur.user_id = user_id AND r.is_active = TRUE
    ) as user_perms;
    
    RETURN COALESCE(permissions, ARRAY[]::text[]);
END;
$$ LANGUAGE plpgsql;

-- Function to check document access
CREATE OR REPLACE FUNCTION documents.check_document_access(
    doc_id UUID,
    user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    has_access BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1
        FROM documents.documents d
        WHERE d.id = doc_id
        AND d.status = 'published'
        AND (
            d.owner_id = user_id
            OR d.classification = 'public'
            OR EXISTS(
                SELECT 1
                FROM documents.document_acl acl
                WHERE acl.document_id = d.id
                AND acl.user_id = user_id
                AND acl.is_active = TRUE
                AND (acl.expires_at IS NULL OR acl.expires_at > NOW())
            )
        )
    ) INTO has_access;
    
    RETURN has_access;
END;
$$ LANGUAGE plpgsql;

-- Function to get document access level
CREATE OR REPLACE FUNCTION documents.get_document_access_level(
    doc_id UUID,
    user_id UUID
)
RETURNS VARCHAR(20) AS $$
DECLARE
    access_level VARCHAR(20);
    doc_owner UUID;
    doc_classification VARCHAR(20);
    doc_department VARCHAR(100);
    user_department VARCHAR(100);
BEGIN
    SELECT owner_id, classification, department 
    INTO doc_owner, doc_classification, doc_department
    FROM documents.documents 
    WHERE id = doc_id;
    
    SELECT department INTO user_department
    FROM auth.users 
    WHERE id = user_id;
    
    IF doc_owner = user_id THEN
        access_level := 'owner';
    ELSIF EXISTS(
        SELECT 1 FROM documents.document_acl 
        WHERE document_id = doc_id AND user_id = user_id AND is_active = TRUE
    ) THEN
        access_level := 'explicit';
    ELSIF doc_classification = 'public' THEN
        access_level := 'public';
    ELSIF doc_department = user_department AND doc_classification = 'internal' THEN
        access_level := 'department';
    ELSE
        access_level := 'none';
    END IF;
    
    RETURN access_level;
END;
$$ LANGUAGE plpgsql;

-- Function to search documents
CREATE OR REPLACE FUNCTION documents.search_documents(
    search_query TEXT,
    user_id UUID,
    max_results INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    title VARCHAR(200),
    department VARCHAR(100),
    classification VARCHAR(20),
    relevance FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.title,
        d.department,
        d.classification,
        ts_rank(to_tsvector('english', d.title || ' ' || COALESCE(d.content, '')), 
                to_tsquery('english', search_query)) as relevance
    FROM documents.documents d
    WHERE d.status = 'published'
    AND d.is_latest_version = TRUE
    AND (
        d.owner_id = user_id
        OR d.classification = 'public'
        OR EXISTS(
            SELECT 1 FROM documents.document_acl acl
            WHERE acl.document_id = d.id
            AND acl.user_id = user_id
            AND acl.is_active = TRUE
            AND (acl.expires_at IS NULL OR acl.expires_at > NOW())
        )
    )
    AND to_tsvector('english', d.title || ' ' || COALESCE(d.content, '')) @@ 
        to_tsquery('english', search_query)
    ORDER BY relevance DESC
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;