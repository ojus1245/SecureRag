"""
Citation generator for RAG responses
"""

import logging
import re
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
import hashlib

logger = logging.getLogger(__name__)


class CitationGenerator:
    """Generate citations for RAG responses"""
    
    def __init__(self):
        self.citation_styles = {
            "inline": self._inline_citation,
            "footnote": self._footnote_citation,
            "endnote": self._endnote_citation,
            "apa": self._apa_citation,
            "mla": self._mla_citation
        }
        self.default_style = "inline"
        
        # Citation configuration
        self.config = {
            "include_relevance": True,
            "include_timestamp": False,
            "max_citations": 10,
            "citation_format": "[{number}]"
        }
    
    async def generate_citations(self, 
                                 response: str, 
                                 documents: List[Dict[str, Any]],
                                 style: Optional[str] = None) -> List[Dict[str, Any]]:
        """Generate citations for response"""
        try:
            citation_style = style or self.default_style
            citation_func = self.citation_styles.get(citation_style, self._inline_citation)
            
            citations = citation_func(response, documents)
            
            # Limit citations
            citations = citations[:self.config["max_citations"]]
            
            return citations
        except Exception as e:
            logger.error(f"Citation generation failed: {str(e)}", exc_info=True)
            return []
    
    def _inline_citation(self, response: str, documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Generate inline citations"""
        citations = []
        
        for i, doc in enumerate(documents, 1):
            # Check if document content appears in response
            doc_title = doc.get("title", "")
            doc_content = doc.get("content", "")
            
            # Simple overlap check
            overlap_score = self._calculate_overlap(response, doc_content)
            
            if overlap_score > 0.1:  # Threshold for citation
                citation = {
                    "id": f"cite-{i}",
                    "number": i,
                    "document_id": doc.get("document_id", doc.get("_id", "")),
                    "title": doc_title,
                    "relevance_score": doc.get("effective_score", doc.get("score", 0)),
                    "overlap_score": overlap_score,
                    "style": "inline",
                    "text": f"[{i}]",
                    "metadata": {
                        "author": doc.get("metadata", {}).get("author", "Unknown"),
                        "department": doc.get("metadata", {}).get("department", ""),
                        "classification": doc.get("metadata", {}).get("classification", "public"),
                        "created_at": doc.get("metadata", {}).get("created_at", "")
                    }
                }
                
                if self.config["include_relevance"]:
                    citation["relevance"] = doc.get("effective_score", doc.get("score", 0))
                
                if self.config["include_timestamp"]:
                    citation["timestamp"] = datetime.now().isoformat()
                
                citations.append(citation)
        
        return citations
    
    def _footnote_citation(self, response: str, documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Generate footnote citations"""
        citations = []
        
        for i, doc in enumerate(documents, 1):
            overlap_score = self._calculate_overlap(response, doc.get("content", ""))
            
            if overlap_score > 0.1:
                citation = {
                    "id": f"fn-{i}",
                    "number": i,
                    "document_id": doc.get("document_id", doc.get("_id", "")),
                    "title": doc.get("title", ""),
                    "style": "footnote",
                    "text": f"^{i}",
                    "footnote": self._format_footnote(doc, i),
                    "metadata": doc.get("metadata", {})
                }
                citations.append(citation)
        
        return citations
    
    def _endnote_citation(self, response: str, documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Generate endnote citations"""
        citations = []
        
        for i, doc in enumerate(documents, 1):
            if self._calculate_overlap(response, doc.get("content", "")) > 0.1:
                citation = {
                    "id": f"en-{i}",
                    "number": i,
                    "document_id": doc.get("document_id", doc.get("_id", "")),
                    "title": doc.get("title", ""),
                    "style": "endnote",
                    "text": f"[{i}]",
                    "endnote": self._format_endnote(doc, i),
                    "metadata": doc.get("metadata", {})
                }
                citations.append(citation)
        
        return citations
    
    def _apa_citation(self, response: str, documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Generate APA style citations"""
        citations = []
        
        for i, doc in enumerate(documents, 1):
            if self._calculate_overlap(response, doc.get("content", "")) > 0.1:
                author = doc.get("metadata", {}).get("author", "Unknown")
                year = doc.get("metadata", {}).get("year", datetime.now().year)
                title = doc.get("title", "")
                
                citation = {
                    "id": f"apa-{i}",
                    "document_id": doc.get("document_id", doc.get("_id", "")),
                    "title": title,
                    "style": "apa",
                    "text": f"({author}, {year})",
                    "reference": f"{author} ({year}). {title}.",
                    "metadata": doc.get("metadata", {})
                }
                citations.append(citation)
        
        return citations
    
    def _mla_citation(self, response: str, documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Generate MLA style citations"""
        citations = []
        
        for i, doc in enumerate(documents, 1):
            if self._calculate_overlap(response, doc.get("content", "")) > 0.1:
                author = doc.get("metadata", {}).get("author", "Unknown")
                title = doc.get("title", "")
                
                citation = {
                    "id": f"mla-{i}",
                    "document_id": doc.get("document_id", doc.get("_id", "")),
                    "title": title,
                    "style": "mla",
                    "text": f"({author})",
                    "reference": f"{author}. \"{title}.\"",
                    "metadata": doc.get("metadata", {})
                }
                citations.append(citation)
        
        return citations
    
    def _calculate_overlap(self, text1: str, text2: str) -> float:
        """Calculate text overlap score"""
        if not text1 or not text2:
            return 0.0
        
        # Tokenize
        tokens1 = set(text1.lower().split())
        tokens2 = set(text2.lower().split())
        
        if not tokens1 or not tokens2:
            return 0.0
        
        # Calculate Jaccard similarity
        intersection = len(tokens1.intersection(tokens2))
        union = len(tokens1.union(tokens2))
        
        return intersection / union if union > 0 else 0.0
    
    def _format_footnote(self, doc: Dict[str, Any], number: int) -> str:
        """Format footnote citation"""
        title = doc.get("title", "Untitled")
        author = doc.get("metadata", {}).get("author", "Unknown")
        department = doc.get("metadata", {}).get("department", "")
        
        return f"{number}. {author}, \"{title}\", {department}"
    
    def _format_endnote(self, doc: Dict[str, Any], number: int) -> str:
        """Format endnote citation"""
        title = doc.get("title", "Untitled")
        author = doc.get("metadata", {}).get("author", "Unknown")
        date = doc.get("metadata", {}).get("created_at", "")
        
        return f"{number}. {author}. {title}. {date}"
    
    def set_citation_style(self, style: str):
        """Set citation style"""
        if style in self.citation_styles:
            self.default_style = style
    
    def get_citation_styles(self) -> List[str]:
        """Get available citation styles"""
        return list(self.citation_styles.keys())
    
    def update_config(self, new_config: Dict[str, Any]):
        """Update citation configuration"""
        self.config.update(new_config)
    
    def get_config(self) -> Dict[str, Any]:
        """Get current configuration"""
        return self.config.copy()