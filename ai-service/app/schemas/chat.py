"""
Chat-related Pydantic schemas for request/response validation
"""

from pydantic import BaseModel, Field, validator, ConfigDict
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from enum import Enum


class ChatRole(str, Enum):
    """Chat message roles"""
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"
    TOOL = "tool"


class MessageType(str, Enum):
    """Message types"""
    TEXT = "text"
    CODE = "code"
    ERROR = "error"
    SYSTEM = "system"
    CITATION = "citation"


class SafetyCategory(str, Enum):
    """Safety categories"""
    SAFE = "safe"
    SENSITIVE = "sensitive"
    CONFIDENTIAL = "confidential"
    HARMFUL = "harmful"
    INAPPROPRIATE = "inappropriate"
    MALICIOUS = "malicious"
    ERROR = "error"


class ChatMessage(BaseModel):
    """Chat message schema"""
    model_config = ConfigDict(extra="allow")
    
    role: ChatRole = Field(..., description="Message role")
    content: str = Field(..., description="Message content", min_length=1)
    timestamp: Optional[datetime] = Field(default_factory=datetime.now, description="Message timestamp")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional metadata")
    
    @validator('content')
    def validate_content(cls, v):
        """Validate content length"""
        if len(v) > 10000:
            raise ValueError('Content too long (max 10000 characters)')
        return v.strip()
    
    @validator('content')
    def validate_content_not_empty(cls, v):
        """Ensure content is not empty after stripping"""
        if not v:
            raise ValueError('Content cannot be empty')
        return v


class ChatRequest(BaseModel):
    """Chat request schema"""
    model_config = ConfigDict(extra="allow")
    
    query: str = Field(..., description="User query", min_length=1, max_length=2000)
    conversation_id: Optional[str] = Field(None, description="Conversation ID")
    max_results: Optional[int] = Field(5, description="Maximum results to retrieve", ge=1, le=20)
    temperature: Optional[float] = Field(0.7, description="Generation temperature", ge=0, le=2)
    max_tokens: Optional[int] = Field(500, description="Maximum tokens to generate", ge=1, le=4000)
    stream: Optional[bool] = Field(False, description="Stream response")
    include_citations: Optional[bool] = Field(True, description="Include citations in response")
    include_sources: Optional[bool] = Field(True, description="Include source documents")
    filters: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Document filters")
    context: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional context")
    history: Optional[List[ChatMessage]] = Field(default_factory=list, description="Conversation history")
    
    @validator('query')
    def validate_query(cls, v):
        """Validate query"""
        v = v.strip()
        if not v:
            raise ValueError('Query cannot be empty')
        if len(v) < 2:
            raise ValueError('Query too short (minimum 2 characters)')
        return v
    
    @validator('history')
    def validate_history(cls, v):
        """Validate conversation history"""
        if len(v) > 50:
            raise ValueError('Conversation history too long (max 50 messages)')
        return v


class ChatResponse(BaseModel):
    """Chat response schema"""
    model_config = ConfigDict(extra="allow")
    
    success: bool = Field(True, description="Whether request was successful")
    query: str = Field(..., description="Original query")
    response: Optional[str] = Field(None, description="Generated response")
    text: Optional[str] = Field(None, description="Response text (alias for response)")
    conversation_id: Optional[str] = Field(None, description="Conversation ID")
    citations: List[Dict[str, Any]] = Field(default_factory=list, description="Citations")
    sources: List[Dict[str, Any]] = Field(default_factory=list, description="Source documents")
    confidence: Optional[float] = Field(None, description="Response confidence", ge=0, le=1)
    model: Optional[str] = Field(None, description="Model used")
    usage: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Token usage")
    response_time: Optional[float] = Field(None, description="Response time in seconds")
    timestamp: datetime = Field(default_factory=datetime.now, description="Response timestamp")
    error: Optional[str] = Field(None, description="Error message if failed")
    safety_result: Optional[Dict[str, Any]] = Field(None, description="Safety check result")
    routing: Optional[Dict[str, Any]] = Field(None, description="Routing information")
    
    @validator('response', 'text', pre=True)
    def validate_response_text(cls, v):
        """Validate response text"""
        if v is not None and len(v) > 100000:
            raise ValueError('Response too long')
        return v


class SafetyCheckRequest(BaseModel):
    """Safety check request schema"""
    model_config = ConfigDict(extra="allow")
    
    text: str = Field(..., description="Text to check", min_length=1, max_length=10000)
    context: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Safety check context")
    check_types: Optional[List[str]] = Field(
        default_factory=lambda: ["pii", "security", "harmful", "inappropriate"],
        description="Types of safety checks to perform"
    )
    
    @validator('text')
    def validate_text(cls, v):
        """Validate text"""
        if not v.strip():
            raise ValueError('Text cannot be empty')
        return v


class SafetyCheckResponse(BaseModel):
    """Safety check response schema"""
    model_config = ConfigDict(extra="allow")
    
    safe: bool = Field(..., description="Whether content is safe")
    score: float = Field(..., description="Safety score", ge=0, le=1)
    category: SafetyCategory = Field(..., description="Safety category")
    reason: Optional[str] = Field(None, description="Reason for classification")
    rules_triggered: List[Dict[str, Any]] = Field(default_factory=list, description="Triggered rules")
    prediction_details: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Prediction details")
    timestamp: datetime = Field(default_factory=datetime.now, description="Check timestamp")


class FeedbackRequest(BaseModel):
    """Feedback request schema"""
    model_config = ConfigDict(extra="allow")
    
    conversation_id: str = Field(..., description="Conversation ID")
    message_id: str = Field(..., description="Message ID")
    rating: int = Field(..., description="Rating (1-5)", ge=1, le=5)
    feedback: Optional[str] = Field(None, description="Feedback text", max_length=1000)
    categories: Optional[List[str]] = Field(default_factory=list, description="Feedback categories")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional metadata")


class ConversationRequest(BaseModel):
    """Conversation request schema"""
    model_config = ConfigDict(extra="allow")
    
    title: Optional[str] = Field(None, description="Conversation title", max_length=200)
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Conversation metadata")


class ConversationResponse(BaseModel):
    """Conversation response schema"""
    model_config = ConfigDict(extra="allow")
    
    conversation_id: str = Field(..., description="Conversation ID")
    title: Optional[str] = Field(None, description="Conversation title")
    messages: List[ChatMessage] = Field(default_factory=list, description="Conversation messages")
    created_at: datetime = Field(default_factory=datetime.now, description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Conversation metadata")


class StreamChunk(BaseModel):
    """Stream chunk schema"""
    model_config = ConfigDict(extra="allow")
    
    type: MessageType = Field(..., description="Chunk type")
    text: Optional[str] = Field(None, description="Chunk text")
    data: Optional[Dict[str, Any]] = Field(None, description="Chunk data")
    timestamp: datetime = Field(default_factory=datetime.now, description="Chunk timestamp")