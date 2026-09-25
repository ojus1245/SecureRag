"""
Embedding generation service
"""

import logging
import hashlib
from typing import List, Optional, Dict, Any
import numpy as np
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)


class Embedder:
    """Generate embeddings for text using sentence transformers"""
    
    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        self.model_name = model_name
        self.model = None
        self.dimensions = 384  # Default for all-MiniLM-L6-v2
        self._initialize_model()
    
    def _initialize_model(self):
        """Initialize the embedding model"""
        try:
            logger.info(f"Loading embedding model: {self.model_name}")
            self.model = SentenceTransformer(self.model_name)
            self.dimensions = self.model.get_sentence_embedding_dimension()
            logger.info(f"Embedding model loaded. Dimensions: {self.dimensions}")
        except Exception as e:
            logger.error(f"Failed to load embedding model: {str(e)}")
            # Fallback to a simpler model if loading fails
            self.model_name = "sentence-transformers/paraphrase-MiniLM-L3-v2"
            self.model = SentenceTransformer(self.model_name)
            self.dimensions = self.model.get_sentence_embedding_dimension()
    
    async def embed_text(self, text: str) -> List[float]:
        """Generate embedding for a single text"""
        try:
            embedding = self.model.encode(text, normalize_embeddings=True)
            return embedding.tolist()
        except Exception as e:
            logger.error(f"Text embedding failed: {str(e)}")
            raise
    
    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts"""
        try:
            embeddings = self.model.encode(texts, normalize_embeddings=True)
            return embeddings.tolist()
        except Exception as e:
            logger.error(f"Batch embedding failed: {str(e)}")
            raise
    
    async def embed_document(self, content: str, chunk_size: int = 512) -> Dict[str, Any]:
        """Generate embeddings for a document with chunking"""
        chunks = self._chunk_text(content, chunk_size)
        embeddings = await self.embed_batch(chunks)
        
        return {
            "chunks": chunks,
            "embeddings": embeddings,
            "num_chunks": len(chunks),
            "model": self.model_name,
            "dimensions": self.dimensions
        }
    
    def _chunk_text(self, text: str, chunk_size: int = 512) -> List[str]:
        """Split text into chunks for embedding"""
        words = text.split()
        chunks = []
        current_chunk = []
        current_length = 0
        
        for word in words:
            current_length += len(word) + 1
            if current_length > chunk_size and current_chunk:
                chunks.append(" ".join(current_chunk))
                current_chunk = [word]
                current_length = len(word)
            else:
                current_chunk.append(word)
        
        if current_chunk:
            chunks.append(" ".join(current_chunk))
        
        return chunks if chunks else [text]
    
    def get_embedding_hash(self, embedding: List[float]) -> str:
        """Generate hash for an embedding"""
        embedding_str = ",".join([f"{x:.6f}" for x in embedding])
        return hashlib.sha256(embedding_str.encode()).hexdigest()
    
    async def compute_similarity(self, 
                                 embedding1: List[float], 
                                 embedding2: List[float]) -> float:
        """Compute cosine similarity between embeddings"""
        vec1 = np.array(embedding1)
        vec2 = np.array(embedding2)
        
        dot_product = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        return float(dot_product / (norm1 * norm2))