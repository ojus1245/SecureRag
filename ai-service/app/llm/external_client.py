"""
External LLM Client for Google Gemini API
"""

import logging
import os
from typing import Dict, Any, Optional, AsyncGenerator
import httpx
from datetime import datetime

logger = logging.getLogger(__name__)


class ExternalLLMClient:
    """Client for Google Gemini API"""

    def __init__(self, api_key: Optional[str] = None):
        # Prefer constructor arg, fall back to env
        self.api_key = api_key or os.getenv("GEMINI_API_KEY", "")
        self.model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite")
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"
        self.timeout = 60
        self.max_retries = 2

        self.stats = {
            "total_requests": 0,
            "successful_requests": 0,
            "failed_requests": 0,
        }

    async def generate(self,
                       prompt: str,
                       options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Generate response using Gemini API"""
        options = options or {}
        start_time = datetime.now()
        self.stats["total_requests"] += 1

        if not self.api_key:
            return {
                "text": "",
                "error": "GEMINI_API_KEY not configured",
                "provider": "external",
                "response_time": 0,
                "timestamp": datetime.now().isoformat()
            }

        try:
            url = f"{self.base_url}/models/{self.model}:generateContent?key={self.api_key}"

            payload = {
                "contents": [{
                    "parts": [{"text": prompt}]
                }],
                "generationConfig": {
                    "temperature": options.get("temperature", 0.7),
                    "maxOutputTokens": options.get("max_tokens", 500)
                }
            }

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                data = response.json()

            # Extract text from Gemini response
            text = ""
            try:
                text = data["candidates"][0]["content"]["parts"][0]["text"]
            except (KeyError, IndexError):
                logger.warning(f"Unexpected Gemini response shape: {data}")

            elapsed = (datetime.now() - start_time).total_seconds()
            logger.info(f"Gemini generation: {len(text)} chars in {elapsed:.2f}s")

            self.stats["successful_requests"] += 1

            return {
                "text": text.strip(),
                "model": self.model,
                "provider": "external",
                "usage": {},
                "confidence": 0.9,
                "response_time": elapsed,
                "timestamp": datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Gemini generation failed: {str(e)}", exc_info=True)
            self.stats["failed_requests"] += 1
            return {
                "text": "",
                "error": str(e),
                "provider": "external",
                "response_time": (datetime.now() - start_time).total_seconds(),
                "timestamp": datetime.now().isoformat()
            }

    async def generate_stream(self,
                              prompt: str,
                              options: Optional[Dict[str, Any]] = None) -> AsyncGenerator[str, None]:
        """Simple non-streaming wrapper (Gemini streaming is more complex)"""
        result = await self.generate(prompt, options)
        yield result.get("text", "")

    def check_health(self) -> Dict[str, Any]:
        """Report configuration status"""
        return {
            "status": "configured" if self.api_key else "not_configured",
            "model": self.model
        }

    def get_statistics(self) -> Dict[str, Any]:
        return {
            **self.stats,
            "success_rate": (
                self.stats["successful_requests"] / self.stats["total_requests"]
                if self.stats["total_requests"] > 0 else 0
            ),
            "timestamp": datetime.now().isoformat()
        }