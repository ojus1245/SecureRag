"""
Prompt builder for RAG system
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class PromptBuilder:
    """Build prompts for LLM generation"""
    
    def __init__(self):
        self.templates = {
            "default": self._default_template,
            "concise": self._concise_template,
            "detailed": self._detailed_template,
            "academic": self._academic_template,
            "enterprise": self._enterprise_template
        }
        self.default_template = "enterprise"
        
        # Prompt configuration
        self.config = {
            "include_system_prompt": True,
            "include_context": True,
            "include_instructions": True,
            "max_context_length": 2000
        }
    
    def build_prompt(self, 
                     query: str, 
                     context: Dict[str, Any],
                     options: Optional[Dict[str, Any]] = None) -> str:
        """Build prompt for LLM"""
        try:
            # Determine template
            template_name = options.get("template", self.default_template) if options else self.default_template
            template_func = self.templates.get(template_name, self._default_template)
            
            # Build prompt
            prompt = template_func(query, context, self.config)
            
            return prompt
        except Exception as e:
            logger.error(f"Prompt building failed: {str(e)}", exc_info=True)
            # Fallback to default template
            return self._default_template(query, context, self.config)
    
    def _default_template(self, query: str, context: Dict[str, Any], config: Dict[str, Any]) -> str:
        """Default prompt template"""
        parts = []
        
        # System prompt
        if config.get("include_system_prompt", True):
            parts.append(
                "You are a knowledgeable assistant helping with enterprise knowledge base queries."
            )
        
        # Instructions
        if config.get("include_instructions", True):
            parts.append(
                "Answer the question based on the provided context. "
                "If the answer cannot be found in the context, say so clearly. "
                "Be concise and accurate."
            )
        
        # Context
        if config.get("include_context", True) and context:
            parts.append(f"Context:\n{context.get('formatted_context', '')}")
        
        # Query
        parts.append(f"Question: {query}")
        parts.append("Answer:")
        
        return "\n\n".join(parts)
    
    def _concise_template(self, query: str, context: Dict[str, Any], config: Dict[str, Any]) -> str:
        """Concise prompt template"""
        parts = []
        
        if config.get("include_system_prompt", True):
            parts.append("You are a concise assistant. Provide brief, accurate answers.")
        
        if config.get("include_context", True) and context:
            parts.append(f"Context: {context.get('formatted_context', '')}")
        
        parts.append(f"Q: {query}")
        parts.append("A:")
        
        return "\n".join(parts)
    
    def _detailed_template(self, query: str, context: Dict[str, Any], config: Dict[str, Any]) -> str:
        """Detailed prompt template"""
        parts = []
        
        if config.get("include_system_prompt", True):
            parts.append(
                "You are a thorough assistant. Provide detailed, well-structured answers "
                "with examples and explanations when appropriate."
            )
        
        if config.get("include_instructions", True):
            parts.append(
                "Instructions:\n"
                "1. Analyze the context carefully\n"
                "2. Provide a comprehensive answer\n"
                "3. Include relevant details and examples\n"
                "4. Cite sources when possible\n"
                "5. Highlight any uncertainties"
            )
        
        if config.get("include_context", True) and context:
            parts.append(f"Context:\n{context.get('formatted_context', '')}")
        
        parts.append(f"Question: {query}")
        parts.append("Detailed Answer:")
        
        return "\n\n".join(parts)
    
    def _academic_template(self, query: str, context: Dict[str, Any], config: Dict[str, Any]) -> str:
        """Academic prompt template"""
        parts = []
        
        if config.get("include_system_prompt", True):
            parts.append(
                "You are an academic research assistant. Provide scholarly, well-referenced answers."
            )
        
        if config.get("include_instructions", True):
            parts.append(
                "Please provide:\n"
                "1. A clear thesis statement\n"
                "2. Supporting evidence from the context\n"
                "3. Proper citations\n"
                "4. Academic tone and language"
            )
        
        if config.get("include_context", True) and context:
            parts.append(f"Source Material:\n{context.get('formatted_context', '')}")
        
        parts.append(f"Research Question: {query}")
        parts.append("Academic Response:")
        
        return "\n\n".join(parts)
    
    def _enterprise_template(self, query: str, context: Dict[str, Any], config: Dict[str, Any]) -> str:
        """Enterprise prompt template"""
        parts = []
        
        if config.get("include_system_prompt", True):
            parts.append(
                "You are an enterprise knowledge base assistant. "
                "Provide professional, accurate answers suitable for business context."
            )
        
        if config.get("include_instructions", True):
            parts.append(
                "Guidelines:\n"
                "• Be professional and concise\n"
                "• Focus on actionable information\n"
                "• Maintain confidentiality\n"
                "• Reference company policies when relevant\n"
                "• Indicate when information is not available"
            )
        
        if config.get("include_context", True) and context:
            parts.append(f"Company Documents:\n{context.get('formatted_context', '')}")
        
        parts.append(f"Employee Query: {query}")
        parts.append("Professional Response:")
        
        return "\n\n".join(parts)
    
    def add_template(self, name: str, template_func):
        """Add custom prompt template"""
        self.templates[name] = template_func
    
    def remove_template(self, name: str):
        """Remove prompt template"""
        if name in self.templates:
            del self.templates[name]
    
    def get_templates(self) -> List[str]:
        """Get available templates"""
        return list(self.templates.keys())
    
    def set_default_template(self, name: str):
        """Set default template"""
        if name in self.templates:
            self.default_template = name
    
    def update_config(self, new_config: Dict[str, Any]):
        """Update prompt configuration"""
        self.config.update(new_config)
    
    def get_config(self) -> Dict[str, Any]:
        """Get current configuration"""
        return self.config.copy()
    
    def format_context(self, documents: List[Dict[str, Any]]) -> str:
        """Format context from documents"""
        formatted_parts = []
        
        for i, doc in enumerate(documents, 1):
            title = doc.get("title", f"Document {i}")
            content = doc.get("content", "")
            relevance = doc.get("effective_score", doc.get("score", 0))
            
            formatted_parts.append(
                f"[{i}] {title} (Relevance: {relevance:.2f})\n{content}"
            )
        
        return "\n\n".join(formatted_parts)