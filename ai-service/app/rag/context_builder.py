"""
Context builder for RAG system
"""

import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
import re

logger = logging.getLogger(__name__)


class ContextBuilder:
    """Build context from retrieved documents"""
    
    def __init__(self):
        self.config = {
            "max_context_length": 2000,
            "max_documents": 5,
            "include_metadata": True,
            "include_relevance_scores": True,
            "truncate_content": True,
            "max_content_length": 500,
            "deduplicate": True
        }
        
        # Content processing
        self.content_processors = {
            "clean": self._clean_content,
            "summarize": self._summarize_content,
            "extract_key_points": self._extract_key_points
        }
        self.default_processor = "clean"
    
    async def build_context(self, 
                            query: str, 
                            documents: List[Dict[str, Any]],
                            max_length: Optional[int] = None) -> Dict[str, Any]:
        """Build context from retrieved documents"""
        try:
            # Update max length if provided
            if max_length:
                self.config["max_context_length"] = max_length
            
            # Process documents
            processed_docs = await self._process_documents(documents)
            
            # Deduplicate if enabled
            if self.config["deduplicate"]:
                processed_docs = self._deduplicate_documents(processed_docs)
            
            # Limit documents
            processed_docs = processed_docs[:self.config["max_documents"]]
            
            # Format context
            formatted_context = self._format_context(processed_docs)
            
            # Truncate if too long
            if len(formatted_context) > self.config["max_context_length"]:
                formatted_context = self._truncate_context(
                    formatted_context, 
                    self.config["max_context_length"]
                )
            
            # Build context object
            context = {
                "formatted_context": formatted_context,
                "documents": processed_docs,
                "total_documents": len(processed_docs),
                "context_length": len(formatted_context),
                "query": query,
                "built_at": datetime.now().isoformat()
            }
            
            return context
            
        except Exception as e:
            logger.error(f"Context building failed: {str(e)}", exc_info=True)
            return {
                "formatted_context": "",
                "documents": [],
                "total_documents": 0,
                "context_length": 0,
                "query": query,
                "built_at": datetime.now().isoformat()
            }
    
    async def _process_documents(self, documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Process documents for context building"""
        processed = []
        
        for doc in documents:
            try:
                doc_copy = doc.copy()
                
                # Process content
                content = doc.get("content", "")
                processor = self.content_processors.get(
                    self.default_processor, 
                    self._clean_content
                )
                processed_content = processor(content)
                
                # Truncate content if needed
                if self.config["truncate_content"] and len(processed_content) > self.config["max_content_length"]:
                    processed_content = processed_content[:self.config["max_content_length"]] + "..."
                
                doc_copy["processed_content"] = processed_content
                
                # Add metadata if enabled
                if self.config["include_metadata"]:
                    doc_copy["formatted_metadata"] = self._format_metadata(doc.get("metadata", {}))
                
                # Add relevance score if enabled
                if self.config["include_relevance_scores"]:
                    doc_copy["relevance"] = doc.get("effective_score", doc.get("score", 0))
                
                processed.append(doc_copy)
            except Exception as e:
                logger.error(f"Document processing failed: {str(e)}")
                continue
        
        # Sort by relevance
        processed.sort(
            key=lambda x: x.get("relevance", 0), 
            reverse=True
        )
        
        return processed
    
    def _clean_content(self, content: str) -> str:
        """Clean content by removing extra whitespace"""
        if not content:
            return ""
        
        # Remove extra whitespace
        content = re.sub(r'\s+', ' ', content)
        content = content.strip()
        
        return content
    
    def _summarize_content(self, content: str) -> str:
        """Simple content summarization"""
        if not content:
            return ""
        
        # Split into sentences
        sentences = re.split(r'(?<=[.!?])\s+', content)
        
        if len(sentences) <= 3:
            return content
        
        # Return first, middle, and last sentences
        summary_parts = [
            sentences[0],
            sentences[len(sentences) // 2],
            sentences[-1]
        ]
        
        return " ".join(summary_parts)
    
    def _extract_key_points(self, content: str) -> str:
        """Extract key points from content"""
        if not content:
            return ""
        
        # Simple keyword-based extraction
        keywords = [
            "important", "key", "critical", "essential", "must", "should",
            "note", "remember", "caution", "warning"
        ]
        
        sentences = re.split(r'(?<=[.!?])\s+', content)
        key_sentences = []
        
        for sentence in sentences:
            if any(keyword in sentence.lower() for keyword in keywords):
                key_sentences.append(sentence)
        
        if not key_sentences:
            # Fallback to first few sentences
            key_sentences = sentences[:3]
        
        return " ".join(key_sentences)
    
    def _deduplicate_documents(self, documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Remove duplicate documents"""
        seen_ids = set()
        deduplicated = []
        
        for doc in documents:
            doc_id = doc.get("document_id", doc.get("_id", ""))
            
            if doc_id and doc_id in seen_ids:
                continue
            
            if doc_id:
                seen_ids.add(doc_id)
            
            deduplicated.append(doc)
        
        return deduplicated
    
    def _format_context(self, documents: List[Dict[str, Any]]) -> str:
        """Format documents into context string"""
        parts = []
        
        for i, doc in enumerate(documents, 1):
            content = doc.get("processed_content", "")
            title = doc.get("title", f"Document {i}")
            
            # Format document entry
            entry = f"[Document {i}] {title}"
            
            # Add metadata if available
            if "formatted_metadata" in doc:
                entry += f"\n{doc['formatted_metadata']}"
            
            # Add relevance if available
            if "relevance" in doc:
                entry += f"\nRelevance: {doc['relevance']:.2f}"
            
            # Add content
            entry += f"\n{content}"
            
            parts.append(entry)
        
        return "\n\n".join(parts)
    
    def _format_metadata(self, metadata: Dict[str, Any]) -> str:
        """Format metadata for context"""
        if not metadata:
            return ""
        
        relevant_fields = [
            "author", "department", "classification", 
            "created_at", "updated_at", "version"
        ]
        
        parts = []
        for field in relevant_fields:
            if field in metadata:
                parts.append(f"{field}: {metadata[field]}")
        
        return ", ".join(parts)
    
    def _truncate_context(self, context: str, max_length: int) -> str:
        """Truncate context to maximum length"""
        if len(context) <= max_length:
            return context
        
        # Try to truncate at sentence boundary
        truncated = context[:max_length]
        last_period = truncated.rfind('.')
        
        if last_period > max_length * 0.5:
            truncated = truncated[:last_period + 1]
        else:
            truncated += "..."
        
        return truncated
    
    def set_content_processor(self, processor_name: str):
        """Set content processor"""
        if processor_name in self.content_processors:
            self.default_processor = processor_name
    
    def add_content_processor(self, name: str, processor_func):
        """Add custom content processor"""
        self.content_processors[name] = processor_func
    
    def update_config(self, new_config: Dict[str, Any]):
        """Update context builder configuration"""
        self.config.update(new_config)
    
    def get_config(self) -> Dict[str, Any]:
        """Get current configuration"""
        return self.config.copy()
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get context builder statistics"""
        return {
            "config": self.config,
            "processors": list(self.content_processors.keys()),
            "default_processor": self.default_processor
        }