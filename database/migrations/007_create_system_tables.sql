-- Migration: Create System Tables
-- Description: Create system configuration and management tables

-- System settings table
CREATE TABLE system.settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    is_encrypted BOOLEAN NOT NULL DEFAULT FALSE,
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- API keys table
CREATE TABLE system.api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    permissions TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- System health checks table
CREATE TABLE system.health_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy')),
    response_time FLOAT,
    details JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_settings_key ON system.settings(key);
CREATE INDEX idx_api_keys_active ON system.api_keys(is_active);
CREATE INDEX idx_api_keys_expires ON system.api_keys(expires_at);
CREATE INDEX idx_health_checks_service ON system.health_checks(service_name);
CREATE INDEX idx_health_checks_created ON system.health_checks(created_at DESC);