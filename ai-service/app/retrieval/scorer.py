"""
Relevance scoring for document retrieval in RAG system
"""

import logging
from typing import Dict, Any, List, Optional
import numpy as np

logger = logging.getLogger(__name__)


class RelevanceScorer:
    """Score document relevance based on embeddings and query similarity"""
    
    def __init__(self, metric: str = "cosine"):
        self.metric = metric
    
    async def score_documents(self, 
                              query_embedding: List[float], 
                              documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Score a list of candidate documents against query embedding"""
        try:
            scored_docs = []
            q_vec = np.array(query_embedding, dtype=np.float32)
            
            for doc in documents:
                doc_copy = doc.copy()
                doc_embedding = doc.get("embedding")
                
                if doc_embedding is not None:
                    d_vec = np.array(doc_embedding, dtype=np.float32)
                    score = self.cosine_similarity(q_vec, d_vec)
                else:
                    score = 0.0
                
                doc_copy["score"] = float(score)
                doc_copy["similarity_score"] = float(score)
                scored_docs.append(doc_copy)
            
            # Sort descending by score
            scored_docs.sort(key=lambda x: x.get("score", 0.0), reverse=True)
            return scored_docs
        except Exception as e:
            logger.error(f"Error scoring documents: {str(e)}", exc_info=True)
            return documents
    
    @staticmethod
    def cosine_similarity(vec1: np.ndarray, vec2: np.ndarray) -> float:
        """Compute cosine similarity between two vectors"""
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)
        if norm1 == 0 or norm2 == 0:
            return 0.0
        return float(np.dot(vec1, vec2) / (norm1 * norm2))

    @staticmethod
    def dot_product(vec1: np.ndarray, vec2: np.ndarray) -> float:
        """Compute dot product between two vectors"""
        return float(np.dot(vec1, vec2))

    @staticmethod
    def euclidean_distance(vec1: np.ndarray, vec2: np.ndarray) -> float:
        """Compute euclidean distance between two vectors"""
        return float(np.linalg.norm(vec1 - vec2))