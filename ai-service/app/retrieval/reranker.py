"""
Document reranking for improved retrieval quality
"""

import logging
from typing import Dict, Any, List, Optional, Tuple
import numpy as np
from datetime import datetime

logger = logging.getLogger(__name__)


class DocumentReranker:
    """Rerank retrieved documents for better relevance"""
    
    def __init__(self):
        self.weights = {
            "similarity": 0.4,
            "recency": 0.2,
            "authority": 0.15,
            "classification": 0.1,
            "popularity": 0.15
        }
        self.classification_boost = {
            "restricted": 0.1,
            "confidential": 0.08,
            "internal": 0.05,
            "public": 0.0
        }
    
    async def rerank(self, 
                     query: str, 
                     documents: List[Dict[str, Any]], 
                     top_k: int = 5) -> List[Dict[str, Any]]:
        """Rerank documents based on multiple factors"""
        try:
            # Calculate reranking scores
            reranked = []
            for doc in documents:
                rerank_score = self._calculate_rerank_score(query, doc)
                doc_copy = doc.copy()
                doc_copy["rerank_score"] = rerank_score
                doc_copy["original_score"] = doc.get("score", 0)
                doc_copy["score"] = rerank_score
                reranked.append(doc_copy)
            
            # Sort by rerank score
            reranked.sort(key=lambda x: x.get("rerank_score", 0), reverse=True)
            
            # Return top k
            return reranked[:top_k]
            
        except Exception as e:
            logger.error(f"Document reranking failed: {str(e)}", exc_info=True)
            return documents[:top_k]
    
    def _calculate_rerank_score(self, query: str, document: Dict[str, Any]) -> float:
        """Calculate reranking score for document"""
        scores = {}
        
        # Similarity score (from initial retrieval)
        scores["similarity"] = document.get("score", 0)
        
        # Recency score
        scores["recency"] = self._calculate_recency_score(document)
        
        # Authority score
        scores["authority"] = self._calculate_authority_score(document)
        
        # Classification score
        scores["classification"] = self._calculate_classification_score(document)
        
        # Popularity score
        scores["popularity"] = self._calculate_popularity_score(document)
        
        # Calculate weighted sum
        final_score = sum(
            scores.get(key, 0) * weight
            for key, weight in self.weights.items()
        )
        
        return final_score
    
    def _calculate_recency_score(self, document: Dict[str, Any]) -> float:
        """Calculate recency score based on document age"""
        try:
            metadata = document.get("metadata", {})
            created_at = metadata.get("created_at") or metadata.get("timestamp")
            
            if not created_at:
                return 0.5  # Neutral score if no date
            
            if isinstance(created_at, str):
                created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            elif isinstance(created_at, (int, float)):
                created_at = datetime.fromtimestamp(created_at)
            
            age_days = (datetime.now(created_at.tzinfo) - created_at).days
            
            # Exponential decay: newer documents score higher
            score = np.exp(-age_days / 365)  # Half-life of ~1 year
            
            return float(score)
        except Exception as e:
            logger.warning(f"Recency score calculation failed: {str(e)}")
            return 0.5
    
    def _calculate_authority_score(self, document: Dict[str, Any]) -> float:
        """Calculate authority score based on document source"""
        try:
            metadata = document.get("metadata", {})
            
            # Check for authority indicators
            authority_factors = {
                "owner_role": {
                    "admin": 1.0,
                    "manager": 0.8,
                    "analyst": 0.6,
                    "viewer": 0.4
                },
                "source": {
                    "official": 1.0,
                    "internal": 0.7,
                    "external": 0.4,
                    "user": 0.5
                }
            }
            
            score = 0.5  # Default score
            
            # Owner role based authority
            owner_role = metadata.get("owner_role")
            if owner_role in authority_factors["owner_role"]:
                score = max(score, authority_factors["owner_role"][owner_role])
            
            # Source based authority
            source = metadata.get("source", "internal")
            if source in authority_factors["source"]:
                score = max(score, authority_factors["source"][source])
            
            return score
        except Exception as e:
            logger.warning(f"Authority score calculation failed: {str(e)}")
            return 0.5
    
    def _calculate_classification_score(self, document: Dict[str, Any]) -> float:
        """Calculate classification-based score"""
        try:
            metadata = document.get("metadata", {})
            classification = metadata.get("classification", "public")
            
            return self.classification_boost.get(classification, 0.0)
        except Exception as e:
            logger.warning(f"Classification score calculation failed: {str(e)}")
            return 0.0
    
    def _calculate_popularity_score(self, document: Dict[str, Any]) -> float:
        """Calculate popularity score based on usage"""
        try:
            metadata = document.get("metadata", {})
            
            # Popularity indicators
            view_count = metadata.get("view_count", 0)
            access_count = metadata.get("access_count", 0)
            share_count = metadata.get("share_count", 0)
            
            # Normalize counts
            total_interactions = view_count + access_count + share_count
            score = min(total_interactions / 100, 1.0)  # Cap at 1.0
            
            return score
        except Exception as e:
            logger.warning(f"Popularity score calculation failed: {str(e)}")
            return 0.0
    
    def update_weights(self, new_weights: Dict[str, float]):
        """Update reranking weights"""
        # Validate weights
        total = sum(new_weights.values())
        if abs(total - 1.0) > 0.01:
            logger.warning(f"Weights sum to {total}, normalizing")
            new_weights = {
                key: value / total
                for key, value in new_weights.items()
            }
        
        self.weights.update(new_weights)
    
    def get_weights(self) -> Dict[str, float]:
        """Get current weights"""
        return self.weights.copy()
    
    def reset_weights(self):
        """Reset weights to defaults"""
        self.weights = {
            "similarity": 0.4,
            "recency": 0.2,
            "authority": 0.15,
            "classification": 0.1,
            "popularity": 0.15
        }