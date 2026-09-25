"""
LLM Router for intelligent model selection and routing
"""

import logging
from typing import Dict, Any, List, Optional, AsyncGenerator
from datetime import datetime
import asyncio
import json

from app.llm.ollama_client import OllamaClient
from app.llm.external_client import ExternalLLMClient

logger = logging.getLogger(__name__)


class LLMRouter:
    """Route requests to appropriate LLM service"""
    
    def __init__(self):
        self.ollama_client = OllamaClient()
        self.external_client = ExternalLLMClient()
        
        # Routing configuration
        self.config = {
            "prefer_local": True,
            "fallback_to_external": True,
            "fallback_to_local": True,
            "max_local_tokens": 2048,
            "min_confidence": 0.5,
            "timeout": 60
        }
        
        # Routing rules
        self.routing_rules = {
            "local_first": self._route_local_first,
            "external_first": self._route_external_first,
            "local_only": self._route_local_only,
            "external_only": self._route_external_only,
            "balanced": self._route_balanced
        }
        self.default_rule = "local_first"
        
        # Statistics
        self.stats = {
            "total_requests": 0,
            "local_requests": 0,
            "external_requests": 0,
            "failed_requests": 0,
            "average_response_time": 0
        }
    
    async def route(self,
                    query: str,
                    documents: Optional[List[Dict[str, Any]]] = None,
                    options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Route request to appropriate LLM"""
        start_time = datetime.now()
        self.stats["total_requests"] += 1
        
        try:
            # Determine routing rule
            rule_name = options.get("routing_rule", self.default_rule) if options else self.default_rule
            routing_func = self.routing_rules.get(rule_name, self._route_local_first)
            
            # Execute routing
            result = await routing_func(query, documents, options)
            
            # Add routing metadata
            result["routing"] = {
                "rule": rule_name,
                "provider": result.get("provider", "unknown"),
                "model": result.get("model", "unknown"),
                "timestamp": datetime.now().isoformat()
            }
            
            # Update statistics
            if result.get("provider") == "local":
                self.stats["local_requests"] += 1
            elif result.get("provider") == "external":
                self.stats["external_requests"] += 1
            
            response_time = (datetime.now() - start_time).total_seconds()
            result["total_response_time"] = response_time
            self._update_average_response_time(response_time)
            
            return result
            
        except Exception as e:
            logger.error(f"LLM routing failed: {str(e)}", exc_info=True)
            self.stats["failed_requests"] += 1
            
            return {
                "text": "",
                "error": str(e),
                "routing": {
                    "rule": rule_name if 'rule_name' in locals() else self.default_rule,
                    "timestamp": datetime.now().isoformat()
                }
            }
    
    async def _route_local_first(self, 
                                 query: str,
                                 documents: Optional[List[Dict[str, Any]]],
                                 options: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Route to local Ollama first, fallback to external"""
        # Check if local service is available
        health = await self.ollama_client.check_health()
        
        if health["status"] == "healthy":
            result = await self.ollama_client.generate(
                query,
                options=options
            )
            
            # Check if result is good enough
            if result.get("text") and result.get("confidence", 0) >= self.config["min_confidence"]:
                result["provider"] = "local"
                return result
        
        # Fallback to external
        if self.config["fallback_to_external"]:
            result = await self.external_client.generate(
                query,
                options=options
            )
            result["provider"] = "external"
            return result
        
        # No fallback available
        return {
            "text": "",
            "error": "No LLM service available",
            "provider": "none"
        }
    
    async def _route_external_first(self,
                                    query: str,
                                    documents: Optional[List[Dict[str, Any]]],
                                    options: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Route to external first, fallback to local"""
        result = await self.external_client.generate(
            query,
            options=options
        )
        
        if result.get("text") and result.get("confidence", 0) >= self.config["min_confidence"]:
            result["provider"] = "external"
            return result
        
        # Fallback to local
        if self.config["fallback_to_local"]:
            health = await self.ollama_client.check_health()
            
            if health["status"] == "healthy":
                result = await self.ollama_client.generate(
                    query,
                    options=options
                )
                result["provider"] = "local"
                return result
        
        return result
    
    async def _route_local_only(self,
                                query: str,
                                documents: Optional[List[Dict[str, Any]]],
                                options: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Route to local only"""
        result = await self.ollama_client.generate(
            query,
            options=options
        )
        result["provider"] = "local"
        return result
    
    async def _route_external_only(self,
                                   query: str,
                                   documents: Optional[List[Dict[str, Any]]],
                                   options: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Route to external only"""
        result = await self.external_client.generate(
            query,
            options=options
        )
        result["provider"] = "external"
        return result
    
    async def _route_balanced(self,
                              query: str,
                              documents: Optional[List[Dict[str, Any]]],
                              options: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Balance between local and external based on query complexity"""
        complexity = self._estimate_complexity(query)
        
        if complexity > 0.7:
            # Complex query - use external if available
            result = await self.external_client.generate(query, options=options)
            result["provider"] = "external"
        else:
            # Simple query - use local
            health = await self.ollama_client.check_health()
            if health["status"] == "healthy":
                result = await self.ollama_client.generate(query, options=options)
                result["provider"] = "local"
            else:
                result = await self.external_client.generate(query, options=options)
                result["provider"] = "external"
        
        return result
    
    async def stream(self,
                     query: str,
                     documents: Optional[List[Dict[str, Any]]] = None,
                     options: Optional[Dict[str, Any]] = None) -> AsyncGenerator[str, None]:
        """Stream response from appropriate LLM"""
        try:
            rule_name = options.get("routing_rule", self.default_rule) if options else self.default_rule
            
            # Check local first
            health = await self.ollama_client.check_health()
            
            if health["status"] == "healthy":
                async for chunk in self.ollama_client.generate_stream(
                    query,
                    options=options
                ):
                    yield chunk
            else:
                # Fallback to external
                async for chunk in self.external_client.generate_stream(
                    query,
                    options=options
                ):
                    yield chunk
                    
        except Exception as e:
            logger.error(f"Streaming routing failed: {str(e)}", exc_info=True)
            yield f"Error: {str(e)}"
    
    def _estimate_complexity(self, query: str) -> float:
        """Estimate query complexity"""
        # Simple heuristics
        complexity = 0.0
        
        # Length-based
        if len(query) > 100:
            complexity += 0.3
        elif len(query) > 50:
            complexity += 0.2
        
        # Technical content
        technical_keywords = ["explain", "analyze", "compare", "evaluate", "summarize", "detailed"]
        if any(kw in query.lower() for kw in technical_keywords):
            complexity += 0.2
        
        # Multiple questions
        if query.count("?") > 1:
            complexity += 0.2
        
        # Numerical/analytical content
        if any(char.isdigit() for char in query):
            complexity += 0.1
        
        return min(complexity, 1.0)
    
    def _update_average_response_time(self, response_time: float):
        """Update average response time"""
        total = self.stats["total_requests"]
        if total > 0:
            self.stats["average_response_time"] = (
                (self.stats["average_response_time"] * (total - 1) + response_time) / total
            )
    
    def set_routing_rule(self, rule_name: str):
        """Set default routing rule"""
        if rule_name in self.routing_rules:
            self.default_rule = rule_name
    
    def add_routing_rule(self, name: str, rule_func):
        """Add custom routing rule"""
        self.routing_rules[name] = rule_func
    
    def get_routing_rules(self) -> List[str]:
        """Get available routing rules"""
        return list(self.routing_rules.keys())
    
    def update_config(self, new_config: Dict[str, Any]):
        """Update router configuration"""
        self.config.update(new_config)
    
    def get_config(self) -> Dict[str, Any]:
        """Get current configuration"""
        return self.config.copy()
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get router statistics"""
        return {
            **self.stats,
            "success_rate": (
                (self.stats["total_requests"] - self.stats["failed_requests"]) / self.stats["total_requests"]
                if self.stats["total_requests"] > 0 else 0
            ),
            "local_ratio": (
                self.stats["local_requests"] / self.stats["total_requests"]
                if self.stats["total_requests"] > 0 else 0
            ),
            "timestamp": datetime.now().isoformat()
        }
    
    async def check_health(self) -> Dict[str, Any]:
        """Check health of all LLM services"""
        local_health = await self.ollama_client.check_health()
        
        return {
            "local": local_health,
            "external": {
                "status": "configured" if self.external_client.api_key else "not_configured"
            },
            "routing_rule": self.default_rule,
            "timestamp": datetime.now().isoformat()
        }