-- Migration: Create Auth Tables
-- Description: Create authentication-related tables

-- Users table
CREATE TABLE auth.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    security_clearance VARCHAR(20) NOT NULL DEFAULT 'internal',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login TIMESTAMP WITH TIME ZONE,
    password_changed_at TIMESTAMP WITH TIME ZONE,
    token_version INTEGER NOT NULL DEFAULT 0,
    mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_secret VARCHAR(255),
    preferences JSONB NOT NULL DEFAULT '{}',
    metadata JSONB NOT NULL DEFAULT '{}',
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_security_clearance CHECK (security_clearance IN ('public', 'internal', 'confidential', 'restricted')),
    CONSTRAINT chk_username_format CHECK (username ~ '^[a-zA-Z0-9_]+$')
);

-- Roles table
CREATE TABLE auth.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    permissions TEXT[] NOT NULL DEFAULT '{}',
    access_level INTEGER NOT NULL DEFAULT 1 CHECK (access_level BETWEEN 1 AND 5),
    is_system_role BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    inherits_from UUID REFERENCES auth.roles(id),
    metadata JSONB NOT NULL DEFAULT '{}',
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- User-Role mapping
CREATE TABLE auth.user_roles (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES auth.roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    assigned_by UUID REFERENCES auth.users(id),
    PRIMARY KEY (user_id, role_id)
);

-- Sessions table
CREATE TABLE auth.sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    refresh_token_hash VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB NOT NULL DEFAULT '{}'
);

-- Password reset tokens
CREATE TABLE auth.password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_users_department ON auth.users(department);
CREATE INDEX idx_users_is_active ON auth.users(is_active);
CREATE INDEX idx_users_security_clearance ON auth.users(security_clearance);
CREATE INDEX idx_users_created_at ON auth.users(created_at DESC);
CREATE INDEX idx_roles_is_active ON auth.roles(is_active);
CREATE INDEX idx_roles_access_level ON auth.roles(access_level);
CREATE INDEX idx_sessions_user ON auth.sessions(user_id);
CREATE INDEX idx_sessions_expires ON auth.sessions(expires_at);
CREATE INDEX idx_password_reset_user ON auth.password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_expires ON auth.password_reset_tokens(expires_at);