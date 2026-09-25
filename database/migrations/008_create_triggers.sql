-- Migration: Create Triggers
-- Description: Create database triggers for automatic updates

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON auth.roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents.documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_acl_updated_at BEFORE UPDATE ON documents.document_acl
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON chat.conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON system.settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON system.api_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Document version increment trigger
CREATE OR REPLACE FUNCTION increment_document_version()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.content_hash != OLD.content_hash THEN
        NEW.version = OLD.version + 1;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER increment_document_version_trigger BEFORE UPDATE ON documents.documents
    FOR EACH ROW EXECUTE FUNCTION increment_document_version();

-- Audit log trigger for sensitive operations
CREATE OR REPLACE FUNCTION log_sensitive_operation()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit.audit_logs (action, resource_type, resource_id, details, status)
        VALUES (
            'DOCUMENT_DELETE',
            'document',
            OLD.id::text,
            jsonb_build_object(
                'title', OLD.title,
                'classification', OLD.classification,
                'deleted_at', NOW()
            ),
            'success'
        );
    ELSIF TG_OP = 'UPDATE' AND OLD.classification != NEW.classification THEN
        INSERT INTO audit.audit_logs (action, resource_type, resource_id, details, status)
        VALUES (
            'DOCUMENT_UPDATE',
            'document',
            NEW.id::text,
            jsonb_build_object(
                'title', NEW.title,
                'old_classification', OLD.classification,
                'new_classification', NEW.classification,
                'changed_at', NOW()
            ),
            'success'
        );
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER log_document_operations AFTER UPDATE OR DELETE ON documents.documents
    FOR EACH ROW EXECUTE FUNCTION log_sensitive_operation();