"""
Retrieval-related Pydantic schemas for request/response validation
"""

from pydantic import BaseModel, Field, validator, ConfigDict
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from enum import Enum


class RetrievalMethod(str, Enum):
    """Retrieval methods"""
    COSINE = "cosine"
    DOT_PRODUCT = "dot_product"
    EUCLIDEAN = "euclidean"
    MANHATTAN = "manhattan"
    HYBRID = "hybrid"


class RerankingMethod(str, Enum):
    """Reranking methods"""
    NONE = "none"
    SIMILARITY = "similarity"
    RECENCY = "recency"
    AUTHORITY = "authority"
    COMBINED = "combined"


class RetrievalRequest(BaseModel):
    """Document retrieval request schema"""
    model_config = ConfigDict(extra="allow")
    
    query: str = Field(..., description="Search query", min_length=1, max_length=2000)
    document_ids: Optional[List[str]] = Field(None, description="Specific document IDs to search")
    top_k: Optional[int] = Field(5, description="Number of results to return", ge=1, le=100)
    max_results: Optional[int] = Field(None, description="Alias for top_k", ge=1, le=100)
    method: Optional[RetrievalMethod] = Field(RetrievalMethod.COSINE, description="Similarity method")
    reranking: Optional[RerankingMethod] = Field(RerankingMethod.COMBINED, description="Reranking method")
    min_score: Optional[float] = Field(0.0, description="Minimum similarity score", ge=0, le=1)
    filters: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Document filters")
    use_cache: Optional[bool] = Field(True, description="Whether to use cache")
    include_metadata: Optional[bool] = Field(True, description="Include document metadata")
    
    @validator('query')
    def validate_query(cls, v):
        """Validate query"""
        v = v.strip()
        if not v:
            raise ValueError('Query cannot be empty')
        return v
    
    @validator('document_ids')
    def validate_document_ids(cls, v):
        """Validate document IDs"""
        if v is not None:
            if len(v) > 1000:
                raise ValueError('Too many document IDs (max 1000)')
            if len(v) != len(set(v)):
                raise ValueError('Duplicate document IDs found')
        return v
    
    @validator('max_results')
    def validate_max_results(cls, v, values):
        """Validate max_results field"""
        if v is not None:
            return v
        return values.get('top_k', 5)


class RetrievedDocument(BaseModel):
    """Retrieved document schema"""
    model_config = ConfigDict(extra="allow")
    
    document_id: str = Field(..., description="Document ID")
    title: Optional[str] = Field(None, description="Document title")
    content: Optional[str] = Field(None, description="Document content")
    score: float = Field(..., description="Similarity score", ge=0, le=1)
    rerank_score: Optional[float] = Field(None, description="Reranking score", ge=0, le=1)
    effective_score: Optional[float] = Field(None, description="Effective score", ge=0, le=1)
    classification: Optional[str] = Field(None, description="Document classification")
    department: Optional[str] = Field(None, description="Document department")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Document metadata")
    scoring_method: Optional[str] = Field(None, description="Scoring method used")
    retrieved_at: Optional[datetime] = Field(None, description="Retrieval timestamp")
    
    @validator('score', 'rerank_score', 'effective_score')
    def validate_scores(cls, v):
        """Validate scores"""
        if v is not None:
            if v < 0 or v > 1:
                raise ValueError('Score must be between 0 and 1')
        return v


class RetrievalResponse(BaseModel):
    """Document retrieval response schema"""
    model_config = ConfigDict(extra="allow")
    
    success: bool = Field(True, description="Whether retrieval was successful")
    query: str = Field(..., description="Original query")
    documents: List[RetrievedDocument] = Field(default_factory=list, description="Retrieved documents")
    total_candidates: int = Field(0, description="Total candidate documents", ge=0)
    total_retrieved: int = Field(0, description="Total retrieved documents", ge=0)
    retrieval_time: float = Field(0, description="Retrieval time in seconds", ge=0)
    method: Optional[str] = Field(None, description="Retrieval method used")
    reranking: Optional[str] = Field(None, description="Reranking method used")
    timestamp: datetime = Field(default_factory=datetime.now, description="Retrieval timestamp")
    error: Optional[str] = Field(None, description="Error message if failed")
    message: Optional[str] = Field(None, description="Additional message")
    
    @validator('documents')
    def validate_documents(cls, v):
        """Validate documents"""
        if len(v) > 100:
            raise ValueError('Too many retrieved documents')
        return v


class RetrievalBatchRequest(BaseModel):
    """Batch retrieval request schema"""
    model_config = ConfigDict(extra="allow")
    
    queries: List[RetrievalRequest] = Field(..., description="List of retrieval requests", min_items=1, max_items=100)
    
    @validator('queries')
    def validate_queries(cls, v):
        """Validate queries"""
        if len(v) > 100:
            raise ValueError('Maximum 100 queries per batch')
        return v


class RetrievalBatchResponse(BaseModel):
    """Batch retrieval response schema"""
    model_config = ConfigDict(extra="allow")
    
    results: List[RetrievalResponse] = Field(default_factory=list, description="Retrieval results")
    total_queries: int = Field(0, description="Total queries processed", ge=0)
    total_time: float = Field(0, description="Total processing time", ge=0)
    timestamp: datetime = Field(default_factory=datetime.now, description="Batch timestamp")


class RelevanceScoreRequest(BaseModel):
    """Relevance scoring request schema"""
    model_config = ConfigDict(extra="allow")
    
    query_embedding: List[float] = Field(..., description="Query embedding vector")
    document_embeddings: List[List[float]] = Field(..., description="Document embedding vectors")
    method: Optional[RetrievalMethod] = Field(RetrievalMethod.COSINE, description="Scoring method")
    
    @validator('query_embedding')
    def validate_query_embedding(cls, v):
        """Validate query embedding"""
        if not v:
            raise ValueError('Query embedding cannot be empty')
        if len(v) > 10000:
            raise ValueError('Embedding too large')
        return v
    
    @validator('document_embeddings')
    def validate_document_embeddings(cls, v):
        """Validate document embeddings"""
        if not v:
            raise ValueError('Document embeddings cannot be empty')
        if len(v) > 10000:
            raise ValueError('Too many document embeddings')
        return v


class RelevanceScoreResponse(BaseModel):
    """Relevance scoring response schema"""
    model_config = ConfigDict(extra="allow")
    
    scores: List[float] = Field(..., description="Similarity scores")
    method: str = Field(..., description="Scoring method used")
    total_documents: int = Field(..., description="Total documents scored", ge=0)
    timestamp: datetime = Field(default_factory=datetime.now, description="Scoring timestamp")


class RerankingRequest(BaseModel):
    """Reranking request schema"""
    model_config = ConfigDict(extra="allow")
    
    query: str = Field(..., description="Search query", min_length=1)
    documents: List[RetrievedDocument] = Field(..., description="Documents to rerank")
    method: Optional[RerankingMethod] = Field(RerankingMethod.COMBINED, description="Reranking method")
    weights: Optional[Dict[str, float]] = Field(None, description="Custom reranking weights")
    
    @validator('documents')
    def validate_documents(cls, v):
        """Validate documents"""
        if not v:
            raise ValueError('Documents cannot be empty')
        if len(v) > 1000:
            raise ValueError('Too many documents to rerank')
        return v
    
    @validator('weights')
    def validate_weights(cls, v):
        """Validate weights"""
        if v is not None:
            total = sum(v.values())
            if abs(total - 1.0) > 0.01:
                raise ValueError('Weights must sum to 1')
        return v


class RerankingResponse(BaseModel):
    """Reranking response schema"""
    model_config = ConfigDict(extra="allow")
    
    documents: List[RetrievedDocument] = Field(..., description="Reranked documents")
    method: str = Field(..., description="Reranking method used")
    weights: Optional[Dict[str, float]] = Field(None, description="Weights used")
    total_documents: int = Field(..., description="Total documents reranked", ge=0)
    timestamp: datetime = Field(default_factory=datetime.now, description="Reranking timestamp")


class RetrievalStatsResponse(BaseModel):
    """Retrieval statistics response schema"""
    model_config = ConfigDict(extra="allow")
    
    total_documents: int = Field(0, description="Total documents in index", ge=0)
    total_queries: int = Field(0, description="Total queries processed", ge=0)
    average_retrieval_time: float = Field(0, description="Average retrieval time", ge=0)
    cache_size: int = Field(0, description="Cache size", ge=0)
    cache_hit_rate: float = Field(0, description="Cache hit rate", ge=0, le=1)
    methods_used: Dict[str, int] = Field(default_factory=dict, description="Methods usage statistics")
    timestamp: datetime = Field(default_factory=datetime.now, description="Statistics timestamp")