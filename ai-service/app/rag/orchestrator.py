"""
RAG Orchestrator - Main coordination service for RAG operations
"""

import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
import asyncio
import json

from app.rag.context_builder import ContextBuilder
from app.rag.prompt_builder import PromptBuilder
try:
    from app.rag.citation_generator import CitationGenerator
except ImportError:
    from app.rag.Citation_generator import CitationGenerator

logger = logging.getLogger(__name__)


class RAGOrchestrator:
    """Orchestrate the complete RAG pipeline"""
    
    def __init__(self, 
                 retriever=None, 
                 llm_router=None, 
                 safety_classifier=None,
                 context_builder=None,
                 prompt_builder=None,
                 citation_generator=None):
        self.retriever = retriever
        self.llm_router = llm_router
        self.safety_classifier = safety_classifier
        self.context_builder = context_builder or ContextBuilder()
        self.prompt_builder = prompt_builder or PromptBuilder()
        self.citation_generator = citation_generator or CitationGenerator()
        
        # Pipeline configuration
        self.config = {
            "max_documents": 5,
            "min_relevance_score": 0.3,
            "max_context_length": 2000,
            "include_citations": True,
            "enable_safety_check": True,
            "enable_reranking": True,
            "enable_streaming": False
        }
        
        # Statistics
        self.stats = {
            "total_queries": 0,
            "successful_queries": 0,
            "failed_queries": 0,
            "average_response_time": 0,
            "total_tokens_generated": 0
        }
    
    async def generate(self, 
                       query: str, 
                       documents: Optional[List[Dict[str, Any]]] = None,
                       options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Generate RAG response"""
        start_time = datetime.now()
        self.stats["total_queries"] += 1
        
        try:
            # Update configuration
            if options:
                self.config.update(options)
            
            # Step 1: Safety check
            if self.config["enable_safety_check"] and self.safety_classifier:
                safety_result = await self.safety_classifier.check(query)
                if not safety_result.get("safe", False):
                    return {
                        "success": False,
                        "error": "Query failed safety check",
                        "safety_result": safety_result,
                        "timestamp": datetime.now().isoformat()
                    }
            
            # Step 2: Retrieve documents if not provided
            if documents is None and self.retriever:
                retrieval_result = await self.retriever.retrieve(
                    query=query,
                    top_k=self.config["max_documents"]
                )
                documents = retrieval_result.get("documents", [])
            
            # Step 3: Filter documents by relevance
            filtered_documents = self._filter_documents(documents)
            
            if not filtered_documents:
                return {
                    "success": False,
                    "error": "No relevant documents found",
                    "timestamp": datetime.now().isoformat()
                }
            
            # Step 4: Build context
            context = await self.context_builder.build_context(
                query=query,
                documents=filtered_documents,
                max_length=self.config["max_context_length"]
            )
            
            # Step 5: Build prompt
            prompt = self.prompt_builder.build_prompt(
                query=query,
                context=context,
                options=self.config
            )
            
            # Step 6: Generate response
            generation_result = await self.llm_router.route(
                query=query,
                documents=filtered_documents,
                options={
                    "prompt": prompt,
                    "max_tokens": self.config.get("max_tokens", 500),
                    "temperature": self.config.get("temperature", 0.7)
                }
            )
            
            # Step 7: Generate citations
            citations = []
            if self.config["include_citations"]:
                citations = await self.citation_generator.generate_citations(
                    response=generation_result.get("text", ""),
                    documents=filtered_documents
                )
            
            # Step 8: Build final response
            response = {
                "success": True,
                "query": query,
                "text": generation_result.get("text", ""),
                "citations": citations,
                "sources": filtered_documents,
                "context": context,
                "prompt": prompt,
                "model": generation_result.get("model", "unknown"),
                "usage": generation_result.get("usage", {}),
                "confidence": generation_result.get("confidence", 0.0),
                "response_time": (datetime.now() - start_time).total_seconds(),
                "timestamp": datetime.now().isoformat()
            }
            
            # Update statistics
            self.stats["successful_queries"] += 1
            self.stats["total_tokens_generated"] += generation_result.get("usage", {}).get("total_tokens", 0)
            self._update_average_response_time(response["response_time"])
            
            return response
            
        except Exception as e:
            logger.error(f"RAG generation failed: {str(e)}", exc_info=True)
            self.stats["failed_queries"] += 1
            
            return {
                "success": False,
                "error": f"RAG generation failed: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
    
    async def generate_stream(self, 
                              query: str, 
                              documents: Optional[List[Dict[str, Any]]] = None,
                              options: Optional[Dict[str, Any]] = None):
        """Generate streaming RAG response"""
        try:
            # Update configuration
            if options:
                self.config.update(options)
            
            # Safety check
            if self.config["enable_safety_check"] and self.safety_classifier:
                safety_result = await self.safety_classifier.check(query)
                if not safety_result.get("safe", False):
                    yield json.dumps({
                        "type": "error",
                        "message": "Query failed safety check"
                    })
                    return
            
            # Retrieve documents if not provided
            if documents is None and self.retriever:
                retrieval_result = await self.retriever.retrieve(
                    query=query,
                    top_k=self.config["max_documents"]
                )
                documents = retrieval_result.get("documents", [])
            
            # Filter documents
            filtered_documents = self._filter_documents(documents)
            
            if not filtered_documents:
                yield json.dumps({
                    "type": "error",
                    "message": "No relevant documents found"
                })
                return
            
            # Build context and prompt
            context = await self.context_builder.build_context(
                query=query,
                documents=filtered_documents,
                max_length=self.config["max_context_length"]
            )
            
            prompt = self.prompt_builder.build_prompt(
                query=query,
                context=context,
                options=self.config
            )
            
            # Stream generation
            async for chunk in self.llm_router.stream(
                query=query,
                documents=filtered_documents,
                options={
                    "prompt": prompt,
                    "max_tokens": self.config.get("max_tokens", 500),
                    "temperature": self.config.get("temperature", 0.7)
                }
            ):
                yield json.dumps({
                    "type": "chunk",
                    "text": chunk
                })
            
            # Send completion signal
            yield json.dumps({
                "type": "complete",
                "timestamp": datetime.now().isoformat()
            })
            
        except Exception as e:
            logger.error(f"Streaming RAG generation failed: {str(e)}", exc_info=True)
            yield json.dumps({
                "type": "error",
                "message": f"Streaming failed: {str(e)}"
            })
    
    def _filter_documents(self, documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Filter documents by relevance score"""
        if not documents:
            return []
        
        filtered = []
        for doc in documents:
            score = doc.get("score", 0)
            rerank_score = doc.get("rerank_score", score)
            
            # Use maximum of original and rerank score
            effective_score = max(score, rerank_score)
            
            if effective_score >= self.config["min_relevance_score"]:
                doc_copy = doc.copy()
                doc_copy["effective_score"] = effective_score
                filtered.append(doc_copy)
        
        # Sort by effective score
        filtered.sort(key=lambda x: x.get("effective_score", 0), reverse=True)
        
        # Limit to max documents
        return filtered[:self.config["max_documents"]]
    
    def _update_average_response_time(self, response_time: float):
        """Update average response time"""
        total = self.stats["successful_queries"]
        if total > 0:
            self.stats["average_response_time"] = (
                (self.stats["average_response_time"] * (total - 1) + response_time) / total
            )
    
    def update_config(self, new_config: Dict[str, Any]):
        """Update pipeline configuration"""
        self.config.update(new_config)
    
    def get_config(self) -> Dict[str, Any]:
        """Get current configuration"""
        return self.config.copy()
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get orchestrator statistics"""
        return {
            **self.stats,
            "success_rate": (
                self.stats["successful_queries"] / self.stats["total_queries"]
                if self.stats["total_queries"] > 0 else 0
            ),
            "timestamp": datetime.now().isoformat()
        }
    
    def reset_statistics(self):
        """Reset statistics"""
        self.stats = {
            "total_queries": 0,
            "successful_queries": 0,
            "failed_queries": 0,
            "average_response_time": 0,
            "total_tokens_generated": 0
        }