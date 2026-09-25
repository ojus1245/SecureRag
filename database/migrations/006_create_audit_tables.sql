-- Migration: Create Audit Tables
-- Description: Create audit logging and compliance tables

-- Audit logs table
CREATE TABLE audit.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id),
    username VARCHAR(50) NOT NULL DEFAULT 'anonymous',
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL DEFAULT 'system',
    resource_id VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    request_id VARCHAR(255) UNIQUE,
    details JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failure', 'warning', 'error')),
    session_id VARCHAR(255),
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_action CHECK (action IN (
        'LOGIN', 'LOGOUT', 'AUTHENTICATE', 'AUTH_FAILED',
        'DOCUMENT_CREATE', 'DOCUMENT_READ', 'DOCUMENT_UPDATE', 'DOCUMENT_DELETE',
        'DOCUMENT_SHARE', 'DOCUMENT_DOWNLOAD', 'DOCUMENT_EXPORT',
        'CHAT_QUERY', 'CHAT_RESPONSE', 'CHAT_FEEDBACK',
        'USER_CREATE', 'USER_READ', 'USER_UPDATE', 'USER_DELETE',
        'ROLE_UPDATE', 'AUDIT_VIEW', 'AUDIT_EXPORT',
        'SYSTEM_CONFIG', 'SYSTEM_BACKUP', 'SYSTEM_RESTORE',
        'SECURITY_EVENT', 'AI_SAFETY_CHECK', 'AI_GENERATE', 'AI_EMBED',
        'ERROR', 'CUSTOM_ACTION'
    ))
);

-- Security events table
CREATE TABLE audit.security_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    user_id UUID REFERENCES auth.users(id),
    ip_address VARCHAR(45),
    details JSONB NOT NULL DEFAULT '{}',
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_audit_timestamp ON audit.audit_logs(timestamp DESC);
CREATE INDEX idx_audit_user ON audit.audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit.audit_logs(action);
CREATE INDEX idx_audit_resource ON audit.audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_status ON audit.audit_logs(status);
CREATE INDEX idx_audit_request_id ON audit.audit_logs(request_id);
CREATE INDEX idx_audit_details ON audit.audit_logs USING GIN(details);
CREATE INDEX idx_security_events_type ON audit.security_events(event_type);
CREATE INDEX idx_security_events_severity ON audit.security_events(severity);
CREATE INDEX idx_security_events_created ON audit.security_events(created_at DESC);