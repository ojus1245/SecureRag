-- Migration: Create Chat Tables
-- Description: Create chat and conversation management tables

-- Conversations table
CREATE TABLE chat.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(200),
    metadata JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Messages table
CREATE TABLE chat.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES chat.conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('system', 'user', 'assistant', 'tool')),
    content TEXT NOT NULL,
    content_type VARCHAR(20) NOT NULL DEFAULT 'text',
    metadata JSONB NOT NULL DEFAULT '{}',
    citations JSONB NOT NULL DEFAULT '[]',
    sources JSONB NOT NULL DEFAULT '[]',
    safety_result JSONB,
    model VARCHAR(255),
    token_usage JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Chat feedback table
CREATE TABLE chat.feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES chat.messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    feedback TEXT,
    categories TEXT[] NOT NULL DEFAULT '{}',
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_conversations_user ON chat.conversations(user_id);
CREATE INDEX idx_conversations_created ON chat.conversations(created_at DESC);
CREATE INDEX idx_conversations_active ON chat.conversations(is_active);
CREATE INDEX idx_messages_conversation ON chat.messages(conversation_id);
CREATE INDEX idx_messages_created ON chat.messages(created_at DESC);
CREATE INDEX idx_messages_role ON chat.messages(role);
CREATE INDEX idx_feedback_message ON chat.feedback(message_id);
CREATE INDEX idx_feedback_user ON chat.feedback(user_id);
CREATE INDEX idx_feedback_rating ON chat.feedback(rating);