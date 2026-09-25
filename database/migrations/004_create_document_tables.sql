-- Migration: Create Document Tables
-- Description: Create document storage and management tables

-- Documents table
CREATE TABLE documents.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    content TEXT,
    content_hash VARCHAR(64) UNIQUE NOT NULL,
    encrypted_content TEXT NOT NULL,
    encryption_key_id VARCHAR(255) NOT NULL,
    encrypted_embedding TEXT NOT NULL,
    embedding_key_id VARCHAR(255) NOT NULL,
    vector_id VARCHAR(255) UNIQUE NOT NULL,
    embedding_model VARCHAR(255) NOT NULL DEFAULT 'sentence-transformers/all-MiniLM-L6-v2',
    file_type VARCHAR(20) NOT NULL DEFAULT 'txt',
    file_size BIGINT NOT NULL DEFAULT 0,
    mime_type VARCHAR(100),
    owner_id UUID NOT NULL REFERENCES auth.users(id),
    department VARCHAR(100) NOT NULL,
    classification VARCHAR(20) NOT NULL DEFAULT 'internal',
    tags TEXT[] NOT NULL DEFAULT '{}',
    metadata JSONB NOT NULL DEFAULT '{}',
    version INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'published',
    safety_score FLOAT NOT NULL DEFAULT 0 CHECK (safety_score BETWEEN 0 AND 1),
    is_safety_classified BOOLEAN NOT NULL DEFAULT FALSE,
    parent_document_id UUID REFERENCES documents.documents(id),
    is_latest_version BOOLEAN NOT NULL DEFAULT TRUE,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    access_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_classification CHECK (classification IN ('public', 'internal', 'confidential', 'restricted')),
    CONSTRAINT chk_status CHECK (status IN ('draft', 'published', 'archived', 'deleted')),
    CONSTRAINT chk_file_type CHECK (file_type IN ('pdf', 'docx', 'txt', 'md', 'html', 'other'))
);

-- Document ACL table
CREATE TABLE documents.document_acl (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents.documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES auth.roles(id),
    permissions TEXT[] NOT NULL DEFAULT '{read}',
    granted_by UUID NOT NULL REFERENCES auth.users(id),
    granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    conditions JSONB NOT NULL DEFAULT '{}',
    revoke_reason VARCHAR(255),
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (document_id, user_id),
    CONSTRAINT chk_permissions CHECK (permissions <@ ARRAY['read', 'write', 'delete', 'share', 'download', 'export', 'annotate']::text[])
);

-- Document versions table
CREATE TABLE documents.document_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents.documents(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    encrypted_content TEXT NOT NULL,
    encryption_key_id VARCHAR(255) NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    metadata JSONB NOT NULL DEFAULT '{}',
    UNIQUE (document_id, version)
);

-- Document tags table (for efficient tag search)
CREATE TABLE documents.document_tags (
    document_id UUID NOT NULL REFERENCES documents.documents(id) ON DELETE CASCADE,
    tag VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (document_id, tag)
);

-- Create indexes
CREATE INDEX idx_documents_owner ON documents.documents(owner_id);
CREATE INDEX idx_documents_department ON documents.documents(department);
CREATE INDEX idx_documents_classification ON documents.documents(classification);
CREATE INDEX idx_documents_status ON documents.documents(status);
CREATE INDEX idx_documents_tags ON documents.documents USING GIN(tags);
CREATE INDEX idx_documents_created_at ON documents.documents(created_at DESC);
CREATE INDEX idx_documents_title ON documents.documents USING GIN(to_tsvector('english', title));
CREATE INDEX idx_documents_content ON documents.documents USING GIN(to_tsvector('english', content));
CREATE INDEX idx_documents_metadata ON documents.documents USING GIN(metadata);
CREATE INDEX idx_document_acl_user ON documents.document_acl(user_id);
CREATE INDEX idx_document_acl_document ON documents.document_acl(document_id);
CREATE INDEX idx_document_acl_is_active ON documents.document_acl(is_active);
CREATE INDEX idx_document_acl_expires ON documents.document_acl(expires_at);
CREATE INDEX idx_document_versions_document ON documents.document_versions(document_id);
CREATE INDEX idx_document_tags_tag ON documents.document_tags(tag);