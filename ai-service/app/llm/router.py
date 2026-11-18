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

        self.config = {
            "prefer_local": True,
            "fallback_to_external": True,
            "fallback_to_local": True,
            "max_local_tokens": 2048,
            "min_confidence": 0.0,
            "timeout": 180
        }

        self.routing_rules = {
            "local_first": self._route_local_first,
            "external_first": self._route_external_first,
            "local_only": self._route_local_only,
            "external_only": self._route_external_only,
            "balanced": self._route_balanced
        }

        # ============================================
        # SWITCHED TO GEMINI (external) AS PRIMARY
        # Change back to "local_first" to use Ollama
        # ============================================
        self.default_rule = "external_first"

        self.stats = {
            "total_requests": 0,
            "local_requests": 0,
            "external_requests": 0,
            "failed_requests": 0,
            "average_response_time": 0
        }

    def _build_rag_prompt(self, query: str, documents: Optional[List[Dict[str, Any]]]) -> str:
        """Build a prompt that includes retrieved documents as context."""
        if not documents:
            return (
                "You are a helpful assistant. Answer the user's question clearly.\n\n"
                f"Question: {query}\n\nAnswer:"
            )

        context_parts = []
        total_chars = 0
        MAX_TOTAL = 6000   # Gemini can handle much larger context

        for i, doc in enumerate(documents, 1):
            title = doc.get("title", f"Document {i}")
            content = doc.get("content", "") or ""
            remaining = MAX_TOTAL - total_chars
            if remaining <= 0:
                break
            if len(content) > remaining:
                content = content[:remaining] + "..."
            context_parts.append(f"[Source {i}: {title}]\n{content}")
            total_chars += len(content)

        context = "\n\n".join(context_parts)

        return (
            "You are a helpful assistant. Answer the user's question using ONLY the information in the provided sources.\n"
            "Guidelines:\n"
            "- Write a clear, well-structured answer in 2-4 sentences.\n"
            "- Include specific details (numbers, policies, requirements) from the sources.\n"
            "- Cite the source by its title (e.g., 'According to the VertexCloud Company Security Policy...').\n"
            "- If the sources don't contain the answer, say so.\n\n"
            f"=== SOURCES ===\n{context}\n=== END SOURCES ===\n\n"
            f"Question: {query}\n\nAnswer:"
        )

    async def route(self,
                    query: str,
                    documents: Optional[List[Dict[str, Any]]] = None,
                    options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Route request to appropriate LLM"""
        start_time = datetime.now()
        self.stats["total_requests"] += 1
        options = options or {}

        try:
            rule_name = options.get("routing_rule", self.default_rule)
            routing_func = self.routing_rules.get(rule_name, self._route_local_first)

            result = await routing_func(query, documents, options)

            result["routing"] = {
                "rule": rule_name,
                "provider": result.get("provider", "unknown"),
                "model": result.get("model", "unknown"),
                "timestamp": datetime.now().isoformat()
            }

            if result.get("provider") == "local":
                self.stats["local_requests"] += 1
            elif result.get("provider") == "external":
                self.stats["external_requests"] += 1

            response_time = (datetime.now() - start_time).total_seconds()
            result["total_response_time"] = response_time
            self._update_average_response_time(response_time)

            # Generate structured citations with direct mention snippets and document IDs
            citations = []
            if documents:
                for i, doc in enumerate(documents, 1):
                    doc_id = str(doc.get("id") or doc.get("_id") or doc.get("documentId") or "")
                    doc_title = doc.get("title", f"Document {i}")
                    doc_content = doc.get("content", "") or ""
                    snippet = doc.get("snippet", "")
                    score = doc.get("relevanceScore", doc.get("score", 0.95))

                    if not snippet and doc_content:
                        import re
                        sentences = re.split(r'(?<=[.!?\n])\s+', doc_content.strip())
                        snippet = sentences[0][:200] if sentences else doc_content[:200]

                    citations.append({
                        "id": f"cite-{i}",
                        "number": i,
                        "document_id": doc_id,
                        "documentId": doc_id,
                        "title": doc_title,
                        "text": f"[{i}] {doc_title}",
                        "snippet": snippet,
                        "relevance_score": score,
                        "relevanceScore": score,
                        "classification": doc.get("classification", "internal"),
                        "department": doc.get("department", "")
                    })
            result["citations"] = citations

            # Calculate overall confidence score
            if documents:
                top_scores = [d.get("relevanceScore", d.get("score", 0.9)) for d in documents if d.get("relevanceScore", d.get("score", 0)) > 0]
                if top_scores:
                    result["confidence"] = round(min(0.99, max(0.50, sum(top_scores) / len(top_scores))), 2)
                else:
                    result["confidence"] = 0.50
            else:
                result["confidence"] = 0.40

            return result

        except Exception as e:
            logger.error(f"LLM routing failed: {str(e)}", exc_info=True)
            self.stats["failed_requests"] += 1
            return {
                "text": "",
                "error": str(e),
                "routing": {
                    "rule": self.default_rule,
                    "timestamp": datetime.now().isoformat()
                }
            }

    def _generate_extractive_fallback(self, query: str, documents: Optional[List[Dict[str, Any]]]) -> str:
        """Intelligent extractive answer from retrieved documents when external LLM or Ollama is unavailable"""
        if not documents:
            return (
                f"I searched the knowledge base, but found no relevant documents matching your query: '{query}'. "
                "You can upload documents in the 'Upload Document' section, and I will be able to retrieve and answer questions from them. "
                "(Tip: To enable full generative conversational AI, configure GEMINI_API_KEY in ai-service/.env)."
            )

        parts = []
        for i, doc in enumerate(documents[:3], 1):
            title = doc.get("title", f"Document {i}")
            content = (doc.get("content", "") or "").strip()
            if content:
                excerpt = content[:500] + ("..." if len(content) > 500 else "")
                parts.append(f"**From document \"{title}\":**\n> {excerpt}")
            else:
                parts.append(f"**Document \"{title}\"** is relevant to your query.")

        return (
            "Here is the relevant information retrieved from your secure documents:\n\n"
            + "\n\n".join(parts)
            + "\n\n*(Note: Configure GEMINI_API_KEY in ai-service/.env to enable full generative AI synthesis.)*"
        )

    async def _route_local_first(self,
                                 query: str,
                                 documents: Optional[List[Dict[str, Any]]],
                                 options: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Route to local Ollama first, fallback to external"""
        prompt = self._build_rag_prompt(query, documents)

        health = await self.ollama_client.check_health()
        if health["status"] == "healthy":
            result = await self.ollama_client.generate(prompt, options=options)
            if result.get("text"):
                result["provider"] = "local"
                return result

        if self.config["fallback_to_external"]:
            result = await self.external_client.generate(prompt, options=options)
            if result.get("text"):
                result["provider"] = "external"
                return result

        fallback_text = self._generate_extractive_fallback(query, documents)
        return {
            "text": fallback_text,
            "provider": "extractive",
            "model": "retrieval-extractive",
            "confidence": 0.85 if documents else 0.5,
            "citations": [doc.get("title") for doc in (documents or [])],
            "response_time": 0.05,
            "timestamp": datetime.now().isoformat()
        }

    async def _route_external_first(self,
                                    query: str,
                                    documents: Optional[List[Dict[str, Any]]],
                                    options: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Route to Gemini first, fallback to local Ollama"""
        prompt = self._build_rag_prompt(query, documents)

        result = await self.external_client.generate(prompt, options=options)
        if result.get("text"):
            result["provider"] = "external"
            return result

        # Fallback to local Ollama
        if self.config["fallback_to_local"]:
            health = await self.ollama_client.check_health()
            if health["status"] == "healthy":
                result = await self.ollama_client.generate(prompt, options=options)
                if result.get("text"):
                    result["provider"] = "local"
                    return result

        # Extractive fallback
        fallback_text = self._generate_extractive_fallback(query, documents)
        return {
            "text": fallback_text,
            "provider": "extractive",
            "model": "retrieval-extractive",
            "confidence": 0.85 if documents else 0.5,
            "citations": [doc.get("title") for doc in (documents or [])],
            "response_time": 0.05,
            "timestamp": datetime.now().isoformat()
        }

    async def _route_local_only(self,
                                query: str,
                                documents: Optional[List[Dict[str, Any]]],
                                options: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        prompt = self._build_rag_prompt(query, documents)
        result = await self.ollama_client.generate(prompt, options=options)
        result["provider"] = "local"
        return result

    async def _route_external_only(self,
                                   query: str,
                                   documents: Optional[List[Dict[str, Any]]],
                                   options: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        prompt = self._build_rag_prompt(query, documents)
        result = await self.external_client.generate(prompt, options=options)
        result["provider"] = "external"
        return result

    async def _route_balanced(self,
                              query: str,
                              documents: Optional[List[Dict[str, Any]]],
                              options: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        prompt = self._build_rag_prompt(query, documents)
        complexity = self._estimate_complexity(query)

        if complexity > 0.7:
            result = await self.external_client.generate(prompt, options=options)
            result["provider"] = "external"
        else:
            health = await self.ollama_client.check_health()
            if health["status"] == "healthy":
                result = await self.ollama_client.generate(prompt, options=options)
                result["provider"] = "local"
            else:
                result = await self.external_client.generate(prompt, options=options)
                result["provider"] = "external"
        return result

    async def stream(self,
                     query: str,
                     documents: Optional[List[Dict[str, Any]]] = None,
                     options: Optional[Dict[str, Any]] = None) -> AsyncGenerator[str, None]:
        prompt = self._build_rag_prompt(query, documents)
        try:
            health = await self.ollama_client.check_health()
            if health["status"] == "healthy":
                async for chunk in self.ollama_client.generate_stream(prompt, options=options):
                    yield chunk
            else:
                async for chunk in self.external_client.generate_stream(prompt, options=options):
                    yield chunk
        except Exception as e:
            logger.error(f"Streaming routing failed: {str(e)}", exc_info=True)
            yield f"Error: {str(e)}"

    def _estimate_complexity(self, query: str) -> float:
        complexity = 0.0
        if len(query) > 100:
            complexity += 0.3
        elif len(query) > 50:
            complexity += 0.2
        technical_keywords = ["explain", "analyze", "compare", "evaluate", "summarize", "detailed"]
        if any(kw in query.lower() for kw in technical_keywords):
            complexity += 0.2
        if query.count("?") > 1:
            complexity += 0.2
        if any(char.isdigit() for char in query):
            complexity += 0.1
        return min(complexity, 1.0)

    def _update_average_response_time(self, response_time: float):
        total = self.stats["total_requests"]
        if total > 0:
            self.stats["average_response_time"] = (
                (self.stats["average_response_time"] * (total - 1) + response_time) / total
            )

    def set_routing_rule(self, rule_name: str):
        if rule_name in self.routing_rules:
            self.default_rule = rule_name

    def add_routing_rule(self, name: str, rule_func):
        self.routing_rules[name] = rule_func

    def get_routing_rules(self) -> List[str]:
        return list(self.routing_rules.keys())

    def update_config(self, new_config: Dict[str, Any]):
        self.config.update(new_config)

    def get_config(self) -> Dict[str, Any]:
        return self.config.copy()

    def get_statistics(self) -> Dict[str, Any]:
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
        local_health = await self.ollama_client.check_health()
        return {
            "local": local_health,
            "external": {
                "status": "configured" if self.external_client.api_key else "not_configured"
            },
            "routing_rule": self.default_rule,
            "timestamp": datetime.now().isoformat()
        }