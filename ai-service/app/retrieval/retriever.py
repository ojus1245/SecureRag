"""
Document retrieval service for RAG system
"""

import logging
import hashlib
import os
import json
from typing import Dict, Any, List, Optional, Tuple
import numpy as np
from datetime import datetime
import asyncio

from app.retrieval.scorer import RelevanceScorer
from app.retrieval.reranker import DocumentReranker

logger = logging.getLogger(__name__)


class DocumentRetriever:
    """Retrieve relevant documents based on query"""

    def __init__(self, vector_store=None, persist_path="vector_store.json"):
        self.persist_path = persist_path

        # Load from provided store, disk, or start empty
        if vector_store is not None:
            self.vector_store = vector_store
        elif os.path.exists(persist_path):
            try:
                with open(persist_path, 'r', encoding='utf-8') as f:
                    self.vector_store = json.load(f)
                logger.info(f"✅ Loaded {len(self.vector_store)} documents from {persist_path}")
            except Exception as e:
                logger.warning(f"Failed to load vector store from disk: {e}")
                self.vector_store = {}
        else:
            self.vector_store = {}
            logger.info(f"No existing vector store found at {persist_path}, starting fresh")

        self.embedder = None
        self.scorer = RelevanceScorer()
        self.reranker = DocumentReranker()
        self.cache = {}
        self.cache_size = 100
        self.default_top_k = 5
        self.similarity_threshold = 0.0

    def _persist_vector_store(self):
        """Save vector store to disk"""
        try:
            with open(self.persist_path, 'w', encoding='utf-8') as f:
                json.dump(self.vector_store, f, ensure_ascii=False, indent=2)
            logger.info(f"Persisted {len(self.vector_store)} documents to {self.persist_path}")
        except Exception as e:
            logger.error(f"Failed to persist vector store: {e}")

    def set_embedder(self, embedder):
        """Set embedder for query processing"""
        self.embedder = embedder

    async def retrieve(self,
                       query: str,
                       document_ids: Optional[List[str]] = None,
                       top_k: int = 5,
                       filters: Optional[Dict[str, Any]] = None,
                       use_reranking: bool = False) -> Dict[str, Any]:
        """
        Retrieve relevant documents for query.

        Uses keyword-based scoring since embeddings are encrypted
        and cannot be compared with vector similarity.
        """
        try:
            start_time = datetime.now()

            # Check cache
            cache_key = self._get_cache_key(query, document_ids, top_k)
            cached_result = self._get_from_cache(cache_key)
            if cached_result:
                return cached_result

            # Get candidate documents
            candidates = await self._get_candidates(document_ids, filters)
            if not candidates:
                return self._empty_result(query, "No candidate documents found")

            # Score by keyword matching
            scored_documents = self._keyword_score_documents(query, candidates)

            # Sort descending by score
            scored_documents.sort(key=lambda d: d.get("score", 0), reverse=True)

            # Take top_k
            top_documents = scored_documents[:top_k]

            # Prepare result
            result = {
                "success": True,
                "query": query,
                "documents": top_documents,
                "total_candidates": len(candidates),
                "total_retrieved": len(top_documents),
                "retrieval_time": (datetime.now() - start_time).total_seconds(),
                "method": "keyword",
                "reranking": None,
                "timestamp": datetime.now().isoformat(),
                "error": None,
                "message": None
            }

            # Cache result
            self._add_to_cache(cache_key, result)

            return result

        except Exception as e:
            logger.error(f"Document retrieval failed: {str(e)}", exc_info=True)
            return self._empty_result(query, f"Retrieval failed: {str(e)}")

    def _keyword_score_documents(self, query: str, candidates: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Score documents by keyword overlap with query.
        Searches title, tags, AND content (body text).
        """
        query_lower = query.lower()

        # Common English stopwords to ignore during matching
        stopwords = {
            'what', 'when', 'where', 'which', 'who', 'why', 'how',
            'the', 'and', 'for', 'are', 'was', 'were', 'this', 'that',
            'with', 'from', 'have', 'has', 'had', 'you', 'your',
            'used', 'use', 'does', 'did', 'can', 'could', 'should', 'would',
            'say', 'says', 'said', 'tell', 'about', 'into', 'over', 'under',
            'also', 'than', 'then', 'them', 'they', 'their', 'there',
            'here', 'been', 'being', 'will', 'shall', 'may', 'might',
            'must', 'not', 'but', 'all', 'any', 'some', 'one', 'two'
        }

        # Normalize query into searchable words
        query_words = set(
            w.strip('?.,!:;()[]{}"\'')
            for w in query_lower.split()
            if len(w) > 2 and w not in stopwords
        )

        # Also add singular forms (basic stemming): remove trailing 's'
        expanded_words = set(query_words)
        for w in query_words:
            if w.endswith('s') and len(w) > 3:
                expanded_words.add(w[:-1])
        query_words = expanded_words

        scored = []
        for doc in candidates:
            metadata = doc.get("metadata", {}) or {}

            title = str(metadata.get("title", "")).lower()

            tags = metadata.get("tags", [])
            if isinstance(tags, str):
                tags_text = tags.lower()
            elif isinstance(tags, list):
                tags_text = " ".join(str(t) for t in tags).lower()
            else:
                tags_text = ""

            # Include content so queries can match body text
            content_text = str(
                doc.get("content", "") or metadata.get("content", "")
            ).lower()

            searchable = f"{title} {tags_text} {content_text}"

            # Count how many query words appear
            matches = sum(1 for word in query_words if word in searchable)

            # Score: base 0.3 + 0.15 per match, capped at 1.0
            if matches == 0:
                score = 0.0
            else:
                score = min(0.3 + (matches * 0.15), 1.0)

            scored.append({
                "documentId": doc.get("documentId") or doc.get("document_id"),
                "vectorId": doc.get("vectorId"),
                "title": metadata.get("title", "Untitled"),
                "classification": metadata.get("classification", "internal"),
                "department": metadata.get("department", ""),
                "tags": metadata.get("tags", []),
                "score": score,
                "relevanceScore": score,
                "metadata": metadata
            })

        return scored

    async def retrieve_batch(self,
                             queries: List[str],
                             document_ids: Optional[List[str]] = None,
                             top_k: int = 5) -> List[Dict[str, Any]]:
        """Retrieve documents for multiple queries"""
        tasks = [
            self.retrieve(query, document_ids, top_k)
            for query in queries
        ]
        return await asyncio.gather(*tasks)

    async def _get_query_embedding(self, query: str) -> Optional[List[float]]:
        """Get embedding for query (kept for compatibility)"""
        if self.embedder is None:
            return self._generate_dummy_embedding(query)

        try:
            return await self.embedder.embed_text(query)
        except Exception as e:
            logger.error(f"Query embedding failed: {str(e)}")
            return None

    async def _get_candidates(self,
                              document_ids: Optional[List[str]] = None,
                              filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Get candidate documents"""
        candidates = []

        if document_ids:
            for doc_id in document_ids:
                doc = await self._get_document(doc_id)
                if doc:
                    candidates.append(doc)
        else:
            candidates = list(self.vector_store.values())

        if filters:
            candidates = self._apply_filters(candidates, filters)

        return candidates

    async def _get_document(self, document_id: str) -> Optional[Dict[str, Any]]:
        """Get document from vector store"""
        return self.vector_store.get(document_id)

    def _apply_filters(self,
                       documents: List[Dict[str, Any]],
                       filters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Apply filters to candidate documents"""
        filtered = documents

        for key, value in filters.items():
            if key == "classification":
                filtered = [
                    doc for doc in filtered
                    if doc.get("metadata", {}).get("classification") == value
                ]
            elif key == "department":
                filtered = [
                    doc for doc in filtered
                    if doc.get("metadata", {}).get("department") == value
                ]

        return filtered

    def _generate_dummy_embedding(self, text: str) -> List[float]:
        """Generate deterministic dummy embedding for testing"""
        hash_obj = hashlib.sha256(text.encode())
        hash_bytes = hash_obj.digest()

        embedding = []
        for i in range(0, len(hash_bytes), 4):
            chunk = hash_bytes[i:i+4]
            value = int.from_bytes(chunk, 'big') / (2**32)
            embedding.append(value - 0.5)

        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = (embedding / norm).tolist()

        return embedding

    def _get_cache_key(self, query: str, document_ids: Optional[List[str]], top_k: int) -> str:
        """Generate cache key"""
        key_parts = [query, str(top_k)]
        if document_ids:
            key_parts.extend(sorted(document_ids))

        key_string = "|".join(key_parts)
        return hashlib.sha256(key_string.encode()).hexdigest()

    def _get_from_cache(self, key: str) -> Optional[Dict[str, Any]]:
        """Get result from cache"""
        return self.cache.get(key)

    def _add_to_cache(self, key: str, result: Dict[str, Any]):
        """Add result to cache"""
        self.cache[key] = result

        if len(self.cache) > self.cache_size:
            oldest_key = next(iter(self.cache))
            del self.cache[oldest_key]

    def _empty_result(self, query: str, message: str) -> Dict[str, Any]:
        """Create empty result"""
        return {
            "success": True,
            "query": query,
            "documents": [],
            "total_candidates": 0,
            "total_retrieved": 0,
            "retrieval_time": 0,
            "method": None,
            "reranking": None,
            "timestamp": datetime.now().isoformat(),
            "error": None,
            "message": message
        }

    def add_document(self, document_id: str, embedding: List[float], metadata: Dict[str, Any],
                     content: str = ""):
        """Add document to vector store (legacy method)"""
        self.vector_store[document_id] = {
            "document_id": document_id,
            "embedding": embedding,
            "content": content,
            "metadata": metadata,
            "added_at": datetime.now().isoformat()
        }
        self._persist_vector_store()

    def remove_document(self, document_id: str):
        """Remove document from vector store"""
        if document_id in self.vector_store:
            del self.vector_store[document_id]
            self._persist_vector_store()

    def update_document(self, document_id: str, embedding: List[float], metadata: Dict[str, Any],
                        content: str = ""):
        """Update document in vector store"""
        if document_id in self.vector_store:
            self.vector_store[document_id].update({
                "embedding": embedding,
                "content": content,
                "metadata": metadata,
                "updated_at": datetime.now().isoformat()
            })
            self._persist_vector_store()

    def get_statistics(self) -> Dict[str, Any]:
        """Get retrieval statistics"""
        return {
            "total_documents": len(self.vector_store),
            "cache_size": len(self.cache),
            "cache_limit": self.cache_size,
            "similarity_threshold": self.similarity_threshold,
            "default_top_k": self.default_top_k,
            "persist_path": self.persist_path
        }