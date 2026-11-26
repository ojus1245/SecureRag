"""
ChromaDB Vector Store integration for SecureRAG.
Handles chunking, persistent vector storage, and RBAC metadata pre-filtering.
"""

import os
import re
import logging
from typing import List, Dict, Any, Optional
import chromadb

logger = logging.getLogger(__name__)

class ChromaVectorStore:
    def __init__(self, persist_directory: str = "./chroma_db"):
        self.persist_directory = persist_directory
        os.makedirs(self.persist_directory, exist_ok=True)
        self.client = chromadb.PersistentClient(path=self.persist_directory)
        self.collection = self.client.get_or_create_collection(
            name="securerag_chunks",
            metadata={"hnsw:space": "cosine"}
        )
        logger.info(f"✅ Initialized ChromaVectorStore at '{self.persist_directory}'. Existing chunks: {self.collection.count()}")

    def chunk_document(self, content: str, chunk_size: int = 800, overlap: int = 100) -> List[str]:
        """
        Split document text into clean, semantically coherent paragraph chunks.
        Supports 500+ page documents efficiently.
        """
        if not content:
            return []

        # Split along double newlines or paragraph breaks
        raw_paragraphs = [p.strip() for p in re.split(r'\n\s*\n', content) if p.strip()]
        chunks = []
        current_chunk = []
        current_len = 0

        for para in raw_paragraphs:
            para_len = len(para)
            if current_len + para_len > chunk_size and current_chunk:
                chunks.append("\n\n".join(current_chunk))
                # Retain overlap if multiple paragraphs exist
                if len(current_chunk) > 1 and len(current_chunk[-1]) <= overlap:
                    current_chunk = [current_chunk[-1], para]
                    current_len = len(current_chunk[0]) + para_len
                else:
                    current_chunk = [para]
                    current_len = para_len
            else:
                current_chunk.append(para)
                current_len += para_len

        if current_chunk:
            chunks.append("\n\n".join(current_chunk))

        # Fallback if content was a single giant paragraph with no linebreaks
        if not chunks and content.strip():
            words = content.split()
            current_words = []
            curr_len = 0
            for w in words:
                curr_len += len(w) + 1
                if curr_len > chunk_size and current_words:
                    chunks.append(" ".join(current_words))
                    current_words = current_words[-20:] + [w] # ~20 words overlap
                    curr_len = sum(len(x) + 1 for x in current_words)
                else:
                    current_words.append(w)
            if current_words:
                chunks.append(" ".join(current_words))

        return chunks

    def add_document(self, document_id: str, content: str, metadata: Dict[str, Any]) -> int:
        """
        Chunks the document content and stores all chunks into ChromaDB with attached RBAC metadata.
        Returns the number of chunks added.
        """
        if not content:
            logger.warning(f"No content provided for document {document_id}")
            return 0

        # Remove previous chunks for this document if updating
        self.delete_document(document_id)

        chunks = self.chunk_document(content)
        if not chunks:
            return 0

        title = str(metadata.get("title", "Untitled"))
        department = str(metadata.get("department", "All"))
        classification = str(metadata.get("classification", "internal"))
        owner = str(metadata.get("owner", ""))
        tags = metadata.get("tags", [])
        tags_str = ",".join(str(t) for t in tags) if isinstance(tags, list) else str(tags)

        ids = [f"{document_id}_chunk_{i}" for i in range(len(chunks))]
        metadatas = [
            {
                "documentId": str(document_id),
                "chunkIndex": i,
                "totalChunks": len(chunks),
                "title": title,
                "department": department,
                "classification": classification,
                "owner": owner,
                "tags": tags_str
            }
            for i in range(len(chunks))
        ]

        self.collection.upsert(
            ids=ids,
            documents=chunks,
            metadatas=metadatas
        )

        logger.info(f"✅ Added {len(chunks)} chunks to ChromaDB for doc: {document_id} ('{title}')")
        return len(chunks)

    def delete_document(self, document_id: str):
        """Remove all chunks associated with a document_id."""
        try:
            self.collection.delete(where={"documentId": str(document_id)})
            logger.info(f"Deleted chunks for doc {document_id} from ChromaDB")
        except Exception as e:
            logger.warning(f"Could not delete chunks for {document_id}: {e}")

    def query_chunks(
        self,
        query: str,
        n_results: int = 5,
        allowed_document_ids: Optional[List[str]] = None,
        department: Optional[str] = None,
        classification: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Vector search top matching chunks with native metadata filtering.
        """
        if self.collection.count() == 0:
            return []

        where_clauses = []
        if allowed_document_ids and len(allowed_document_ids) > 0:
            str_ids = [str(x) for x in allowed_document_ids]
            if len(str_ids) == 1:
                where_clauses.append({"documentId": str_ids[0]})
            else:
                where_clauses.append({"documentId": {"$in": str_ids}})

        if department and department != "All":
            where_clauses.append({"department": {"$in": [department, "All", ""]}})

        if classification:
            where_clauses.append({"classification": classification})

        where_filter = None
        if len(where_clauses) == 1:
            where_filter = where_clauses[0]
        elif len(where_clauses) > 1:
            where_filter = {"$and": where_clauses}

        total_available = self.collection.count()
        actual_k = min(n_results, total_available)

        results = self.collection.query(
            query_texts=[query],
            n_results=actual_k,
            where=where_filter,
            include=["documents", "metadatas", "distances"]
        )

        matched_chunks = []
        if results and "documents" in results and results["documents"]:
            docs = results["documents"][0]
            metas = results["metadatas"][0] if "metadatas" in results else [{}] * len(docs)
            dists = results["distances"][0] if "distances" in results else [0.0] * len(docs)
            ids = results["ids"][0] if "ids" in results else [""] * len(docs)

            for i, chunk_text in enumerate(docs):
                meta = metas[i] if i < len(metas) else {}
                dist = dists[i] if i < len(dists) else 0.0
                score = round(max(0.0, min(1.0, 1.0 - (dist / 2.0))), 3)

                matched_chunks.append({
                    "chunkId": ids[i],
                    "documentId": meta.get("documentId"),
                    "title": meta.get("title", "Untitled"),
                    "department": meta.get("department", ""),
                    "classification": meta.get("classification", "internal"),
                    "chunkIndex": meta.get("chunkIndex", 0),
                    "totalChunks": meta.get("totalChunks", 1),
                    "content": chunk_text,
                    "snippet": chunk_text[:250],
                    "score": score,
                    "relevanceScore": score,
                    "metadata": meta
                })

        return matched_chunks

    def count(self) -> int:
        return self.collection.count()
