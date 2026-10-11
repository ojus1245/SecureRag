"""
Secure Enterprise RAG Knowledge Base - AI Service
Main FastAPI Application
"""

import logging
import time
from contextlib import asynccontextmanager
from typing import Dict, Any

from fastapi import FastAPI, Request, Response, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import uvicorn

from app.embedder.embedder import Embedder
from app.embedder.model import EmbeddingModel
from app.encryption.aes_gcm import AESGCMEncryption
from app.encryption.key_manager import KeyManager
from app.encryption.vector_encryption import VectorEncryption
from app.safety.classifier import SafetyClassifier
from app.safety.rules import SafetyRules
from app.safety.predictor import SafetyPredictor
from app.retrieval.retriever import DocumentRetriever
from app.retrieval.reranker import DocumentReranker
from app.retrieval.scorer import RelevanceScorer
from app.rag.orchestrator import RAGOrchestrator
from app.rag.prompt_builder import PromptBuilder
try:
    from app.rag.citation_generator import CitationGenerator
except ImportError:
    from app.rag.Citation_generator import CitationGenerator
from app.rag.context_builder import ContextBuilder
from app.llm.ollama_client import OllamaClient
from app.llm.external_client import ExternalLLMClient
from app.llm.router import LLMRouter
from app.schemas.chat import ChatRequest, ChatResponse, SafetyCheckRequest
from app.schemas.document import DocumentRequest, EmbeddingRequest
from app.schemas.retrieval import RetrievalRequest

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global service instances
embedder = None
key_manager = None
encryption = None
safety_classifier = None
retriever = None
orchestrator = None
llm_router = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global embedder, key_manager, encryption, safety_classifier
    global retriever, orchestrator, llm_router

    logger.info("Starting AI Service...")

    # Initialize services
    embedder = Embedder()
    key_manager = KeyManager()
    encryption = AESGCMEncryption(key_manager)
    safety_classifier = SafetyClassifier()
    retriever = DocumentRetriever()
    llm_router = LLMRouter()
    orchestrator = RAGOrchestrator(
        retriever=retriever,
        llm_router=llm_router,
        safety_classifier=safety_classifier
    )

    logger.info("AI Service initialized successfully")
    yield

    logger.info("Shutting down AI Service...")


# Create FastAPI app
app = FastAPI(
    title="Secure Enterprise RAG Knowledge Base - AI Service",
    version="1.0.0",
    description="AI service for secure RAG operations with encryption and safety",
    lifespan=lifespan
)

# Security middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """Add processing time to response headers"""
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response


@app.middleware("http")
async def error_handling_middleware(request: Request, call_next):
    """Global error handling middleware"""
    try:
        return await call_next(request)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unhandled error: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal server error",
                "detail": str(e) if app.debug else "An error occurred"
            }
        )


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Secure Enterprise RAG AI Service",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "services": {
            "embedder": embedder is not None,
            "encryption": encryption is not None,
            "safety": safety_classifier is not None,
            "retriever": retriever is not None,
            "orchestrator": orchestrator is not None,
            "llm_router": llm_router is not None
        }
    }


@app.post("/embeddings", response_model=Dict[str, Any])
async def generate_embeddings(request: EmbeddingRequest):
    """Generate embeddings for text"""
    try:
        embedding = await embedder.embed_text(request.text)
        return {
            "embedding": embedding,
            "dimensions": len(embedding),
            "model": request.model or "default"
        }
    except Exception as e:
        logger.error(f"Embedding generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Embedding generation failed")


@app.post("/encrypt/content")
async def encrypt_content(request: Dict[str, Any]):
    """Encrypt content"""
    try:
        result = await encryption.encrypt(request["content"])
        return result
    except Exception as e:
        logger.error(f"Content encryption failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Encryption failed")


@app.post("/decrypt/content")
async def decrypt_content(request: Dict[str, Any]):
    """Decrypt content"""
    try:
        result = await encryption.decrypt(
            request["ciphertext"],
            request["key_id"]
        )
        return {"plaintext": result}
    except Exception as e:
        logger.error(f"Content decryption failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Decryption failed")


@app.post("/encrypt/embedding")
async def encrypt_embedding(request: Dict[str, Any]):
    """Encrypt embedding vector"""
    try:
        result = await VectorEncryption.encrypt_vector(
            request["embedding"],
            encryption
        )
        return result
    except Exception as e:
        logger.error(f"Embedding encryption failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Embedding encryption failed")


@app.post("/safety/check", response_model=Dict[str, Any])
async def check_safety(request: SafetyCheckRequest):
    """Check content safety"""
    try:
        result = await safety_classifier.check(request.text)
        return result
    except Exception as e:
        logger.error(f"Safety check failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Safety check failed")


# ============================================
# RAG Document Management Endpoints
# ============================================

@app.post("/rag/documents")
async def add_rag_document(request: Dict[str, Any]):
    """Add a document to the RAG vector store (with content + persistence)."""
    try:
        document_id = request.get("documentId")
        vector_id = request.get("vectorId")
        encrypted_embedding = request.get("encryptedEmbedding")
        embedding_key_id = request.get("embeddingKeyId")
        content = request.get("content", "") or ""
        metadata = request.get("metadata", {}) or {}

        if not document_id:
            raise HTTPException(
                status_code=400,
                detail="documentId is required"
            )

        if hasattr(retriever, 'vector_store'):
            retriever.vector_store[document_id] = {
                "documentId": document_id,
                "vectorId": vector_id,
                "encryptedEmbedding": encrypted_embedding,
                "embeddingKeyId": embedding_key_id,
                "content": content,             # FIX 2: store content
                "metadata": metadata
            }

            # FIX 1: persist to disk so it survives restarts
            if hasattr(retriever, '_persist_vector_store'):
                retriever._persist_vector_store()

        logger.info(
            f"Document added to RAG: {document_id} | "
            f"Title: {metadata.get('title')} | "
            f"Content length: {len(content)}"
        )
        return {
            "success": True,
            "documentId": document_id,
            "vectorId": vector_id,
            "message": "Document indexed successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Add document failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to add document: {str(e)}")


@app.get("/rag/documents")
async def list_rag_documents():
    """List all documents in the RAG vector store"""
    try:
        store = getattr(retriever, 'vector_store', {})
        return {
            "success": True,
            "total": len(store),
            "documents": [
                {
                    "documentId": doc_id,
                    "vectorId": doc.get("vectorId"),
                    "contentLength": len(doc.get("content", "") or ""),
                    "metadata": doc.get("metadata", {})
                }
                for doc_id, doc in store.items()
            ]
        }
    except Exception as e:
        logger.error(f"List documents failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list documents: {str(e)}")


@app.delete("/rag/documents/{document_id}")
async def delete_rag_document(document_id: str):
    """Delete a document from the RAG vector store"""
    try:
        if hasattr(retriever, 'vector_store') and document_id in retriever.vector_store:
            del retriever.vector_store[document_id]
            # Persist after deletion too
            if hasattr(retriever, '_persist_vector_store'):
                retriever._persist_vector_store()

        logger.info(f"Document removed from RAG: {document_id}")
        return {
            "success": True,
            "documentId": document_id,
            "message": "Document removed successfully"
        }
    except Exception as e:
        logger.error(f"Delete document failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete document: {str(e)}")


# ============================================
# RAG Retrieval and Generation
# ============================================

@app.post("/rag/retrieve")
async def retrieve_documents(request: RetrievalRequest):
    """Retrieve relevant documents"""
    try:
        results = await retriever.retrieve(
            query=request.query,
            document_ids=request.document_ids,
            top_k=request.max_results
        )
        return results
    except Exception as e:
        logger.error(f"Document retrieval failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Retrieval failed")


@app.post("/rag/generate")
async def generate_response(request: Dict[str, Any]):
    """Generate RAG response"""
    try:
        response = await orchestrator.generate(
            query=request["query"],
            documents=request["documents"],
            options=request.get("options", {})
        )
        return response
    except Exception as e:
        logger.error(f"Response generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Generation failed")


@app.post("/generate")
async def generate_llm_response(request: Dict[str, Any]):
    """Generate LLM response"""
    try:
        response = await llm_router.route(
            query=request["query"],
            documents=request.get("documents", []),
            options=request.get("options", {})
        )
        return response
    except Exception as e:
        logger.error(f"LLM generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail="LLM generation failed")


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )