"""
Document-related Pydantic schemas for request/response validation
"""

from pydantic import BaseModel, Field, validator, ConfigDict
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from enum import Enum


class DocumentStatus(str, Enum):
    """Document status"""
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"
    DELETED = "deleted"


class DocumentClassification(str, Enum):
    """Document classification levels"""
    PUBLIC = "public"
    INTERNAL = "internal"
    CONFIDENTIAL = "confidential"
    RESTRICTED = "restricted"


class DocumentType(str, Enum):
    """Document types"""
    PDF = "pdf"
    DOCX = "docx"
    TXT = "txt"
    MD = "md"
    HTML = "html"
    OTHER = "other"


class DocumentRequest(BaseModel):
    """Document creation/update request schema"""
    model_config = ConfigDict(extra="allow")
    
    title: str = Field(..., description="Document title", min_length=1, max_length=200)
    content: Optional[str] = Field(None, description="Document content")
    department: Optional[str] = Field(None, description="Department", max_length=100)
    classification: Optional[DocumentClassification] = Field(
        DocumentClassification.INTERNAL, 
        description="Classification level"
    )
    tags: Optional[List[str]] = Field(default_factory=list, description="Document tags")
    file_type: Optional[DocumentType] = Field(DocumentType.TXT, description="File type")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Document metadata")
    status: Optional[DocumentStatus] = Field(DocumentStatus.PUBLISHED, description="Document status")
    
    @validator('title')
    def validate_title(cls, v):
        """Validate title"""
        v = v.strip()
        if not v:
            raise ValueError('Title cannot be empty')
        return v
    
    @validator('tags')
    def validate_tags(cls, v):
        """Validate tags"""
        if len(v) > 20:
            raise ValueError('Maximum 20 tags allowed')
        
        cleaned_tags = []
        for tag in v:
            tag = tag.strip().lower()
            if tag and tag not in cleaned_tags:
                cleaned_tags.append(tag)
        
        return cleaned_tags
    
    @validator('content')
    def validate_content(cls, v):
        """Validate content"""
        if v is not None:
            if len(v) > 1000000:
                raise ValueError('Content too long (max 1MB)')
        return v


class DocumentResponse(BaseModel):
    """Document response schema"""
    model_config = ConfigDict(extra="allow")
    
    document_id: str = Field(..., description="Document ID")
    title: str = Field(..., description="Document title")
    content: Optional[str] = Field(None, description="Document content (if accessible)")
    department: Optional[str] = Field(None, description="Department")
    classification: DocumentClassification = Field(..., description="Classification level")
    tags: List[str] = Field(default_factory=list, description="Tags")
    file_type: DocumentType = Field(DocumentType.TXT, description="File type")
    status: DocumentStatus = Field(DocumentStatus.PUBLISHED, description="Status")
    version: int = Field(1, description="Version number", ge=1)
    owner: Optional[Dict[str, Any]] = Field(None, description="Owner information")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Metadata")
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Update timestamp")
    safety_score: Optional[float] = Field(None, description="Safety score", ge=0, le=1)
    is_safety_classified: bool = Field(False, description="Whether safety classified")
    
    @validator('tags')
    def validate_tags(cls, v):
        """Validate tags"""
        if len(v) > 20:
            raise ValueError('Maximum 20 tags allowed')
        return v


class DocumentListResponse(BaseModel):
    """Document list response schema"""
    model_config = ConfigDict(extra="allow")
    
    documents: List[DocumentResponse] = Field(default_factory=list, description="List of documents")
    total: int = Field(0, description="Total number of documents", ge=0)
    page: int = Field(1, description="Current page", ge=1)
    limit: int = Field(20, description="Items per page", ge=1, le=200)
    has_next: bool = Field(False, description="Whether there are more pages")
    has_prev: bool = Field(False, description="Whether there are previous pages")


class DocumentUpdateRequest(BaseModel):
    """Document update request schema"""
    model_config = ConfigDict(extra="allow")
    
    title: Optional[str] = Field(None, description="Document title", max_length=200)
    content: Optional[str] = Field(None, description="Document content")
    department: Optional[str] = Field(None, description="Department", max_length=100)
    classification: Optional[DocumentClassification] = Field(None, description="Classification level")
    tags: Optional[List[str]] = Field(None, description="Tags")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Metadata")
    status: Optional[DocumentStatus] = Field(None, description="Status")
    
    @validator('title')
    def validate_title(cls, v):
        """Validate title"""
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError('Title cannot be empty')
        return v
    
    @validator('tags')
    def validate_tags(cls, v):
        """Validate tags"""
        if v is not None and len(v) > 20:
            raise ValueError('Maximum 20 tags allowed')
        return v


class DocumentShareRequest(BaseModel):
    """Document share request schema"""
    model_config = ConfigDict(extra="allow")
    
    user_id: str = Field(..., description="User ID to share with")
    permissions: List[str] = Field(
        default_factory=lambda: ["read"],
        description="Permissions to grant"
    )
    expires_at: Optional[datetime] = Field(None, description="Expiration timestamp")
    conditions: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Share conditions")
    
    @validator('permissions')
    def validate_permissions(cls, v):
        """Validate permissions"""
        valid_permissions = {"read", "write", "delete", "share", "download", "export", "annotate"}
        invalid = set(v) - valid_permissions
        if invalid:
            raise ValueError(f'Invalid permissions: {invalid}')
        if not v:
            raise ValueError('At least one permission required')
        return list(set(v))


class DocumentDeleteRequest(BaseModel):
    """Document delete request schema"""
    model_config = ConfigDict(extra="allow")
    
    soft_delete: bool = Field(True, description="Whether to soft delete")
    reason: Optional[str] = Field(None, description="Deletion reason", max_length=500)


class EmbeddingRequest(BaseModel):
    """Embedding generation request schema"""
    model_config = ConfigDict(extra="allow")
    
    text: str = Field(..., description="Text to embed", min_length=1)
    model: Optional[str] = Field("default", description="Embedding model name")
    normalize: Optional[bool] = Field(True, description="Whether to normalize embeddings")
    
    @validator('text')
    def validate_text(cls, v):
        """Validate text"""
        if len(v) > 100000:
            raise ValueError('Text too long (max 100000 characters)')
        return v


class EmbeddingResponse(BaseModel):
    """Embedding response schema"""
    model_config = ConfigDict(extra="allow")
    
    embedding: List[float] = Field(..., description="Embedding vector")
    dimensions: int = Field(..., description="Embedding dimensions", ge=1)
    model: str = Field(..., description="Model used")
    text_hash: Optional[str] = Field(None, description="Hash of input text")
    
    @validator('embedding')
    def validate_embedding(cls, v):
        """Validate embedding"""
        if not v:
            raise ValueError('Embedding cannot be empty')
        if len(v) > 10000:
            raise ValueError('Embedding too large')
        return v


class DocumentClassificationRequest(BaseModel):
    """Document classification request schema"""
    model_config = ConfigDict(extra="allow")
    
    content: str = Field(..., description="Content to classify", min_length=1)
    context: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Classification context")
    
    @validator('content')
    def validate_content(cls, v):
        """Validate content"""
        if len(v) > 100000:
            raise ValueError('Content too long')
        return v


class DocumentClassificationResponse(BaseModel):
    """Document classification response schema"""
    model_config = ConfigDict(extra="allow")
    
    classification: DocumentClassification = Field(..., description="Classified level")
    confidence: float = Field(..., description="Classification confidence", ge=0, le=1)
    categories: List[Dict[str, Any]] = Field(default_factory=list, description="Category scores")
    sensitive_info: List[Dict[str, Any]] = Field(default_factory=list, description="Detected sensitive info")
    timestamp: datetime = Field(default_factory=datetime.now, description="Classification timestamp")