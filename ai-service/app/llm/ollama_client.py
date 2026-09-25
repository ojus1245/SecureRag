"""
Ollama LLM Client for local model inference
"""

import logging
import json
from typing import Dict, Any, List, Optional, AsyncGenerator
import httpx
import asyncio
from datetime import datetime

logger = logging.getLogger(__name__)


class OllamaClient:
    """Client for interacting with Ollama local LLM service"""
    
    def __init__(self, base_url: str = "http://localhost:11434"):
        self.base_url = base_url.rstrip('/')
        self.default_model = "llama2"
        self.timeout = 60
        self.max_retries = 3
        self.retry_delay = 1
        
        # Model configuration
        self.models = {
            "llama2": {
                "name": "llama2",
                "context_length": 4096,
                "max_tokens": 2048,
                "temperature": 0.7
            },
            "llama2-13b": {
                "name": "llama2:13b",
                "context_length": 4096,
                "max_tokens": 2048,
                "temperature": 0.7
            },
            "mistral": {
                "name": "mistral",
                "context_length": 8192,
                "max_tokens": 4096,
                "temperature": 0.7
            },
            "codellama": {
                "name": "codellama",
                "context_length": 16384,
                "max_tokens": 4096,
                "temperature": 0.5
            }
        }
        
        # Statistics
        self.stats = {
            "total_requests": 0,
            "successful_requests": 0,
            "failed_requests": 0,
            "total_tokens": 0
        }
    
    async def generate(self, 
                       prompt: str, 
                       model: Optional[str] = None,
                       options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Generate response using Ollama"""
        start_time = datetime.now()
        self.stats["total_requests"] += 1
        
        try:
            model_name = model or self.default_model
            model_config = self.models.get(model_name, self.models["llama2"])
            
            # Prepare request payload
            payload = {
                "model": model_config["name"],
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": options.get("temperature", model_config["temperature"]),
                    "num_predict": options.get("max_tokens", model_config["max_tokens"]),
                    "top_p": options.get("top_p", 0.9),
                    "top_k": options.get("top_k", 40)
                }
            }
            
            # Add system prompt if provided
            if options.get("system"):
                payload["system"] = options["system"]
            
            # Make request
            response = await self._make_request(payload)
            
            if response is None:
                raise Exception("Failed to get response from Ollama")
            
            # Process response
            result = {
                "text": response.get("response", ""),
                "model": model_name,
                "usage": {
                    "prompt_tokens": response.get("prompt_eval_count", 0),
                    "completion_tokens": response.get("eval_count", 0),
                    "total_tokens": response.get("prompt_eval_count", 0) + response.get("eval_count", 0)
                },
                "confidence": self._calculate_confidence(response),
                "response_time": (datetime.now() - start_time).total_seconds(),
                "timestamp": datetime.now().isoformat()
            }
            
            # Update statistics
            self.stats["successful_requests"] += 1
            self.stats["total_tokens"] += result["usage"]["total_tokens"]
            
            return result
            
        except Exception as e:
            logger.error(f"Ollama generation failed: {str(e)}", exc_info=True)
            self.stats["failed_requests"] += 1
            
            return {
                "text": "",
                "model": model or self.default_model,
                "error": str(e),
                "response_time": (datetime.now() - start_time).total_seconds(),
                "timestamp": datetime.now().isoformat()
            }
    
    async def generate_stream(self, 
                              prompt: str,
                              model: Optional[str] = None,
                              options: Optional[Dict[str, Any]] = None) -> AsyncGenerator[str, None]:
        """Generate streaming response using Ollama"""
        try:
            model_name = model or self.default_model
            model_config = self.models.get(model_name, self.models["llama2"])
            
            payload = {
                "model": model_config["name"],
                "prompt": prompt,
                "stream": True,
                "options": {
                    "temperature": options.get("temperature", model_config["temperature"]),
                    "num_predict": options.get("max_tokens", model_config["max_tokens"])
                }
            }
            
            if options.get("system"):
                payload["system"] = options["system"]
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                async with client.stream("POST", f"{self.base_url}/api/generate", json=payload) as response:
                    async for line in response.aiter_lines():
                        if line:
                            try:
                                data = json.loads(line)
                                if "response" in data:
                                    yield data["response"]
                                if data.get("done", False):
                                    break
                            except json.JSONDecodeError:
                                continue
                                
        except Exception as e:
            logger.error(f"Ollama streaming failed: {str(e)}", exc_info=True)
            yield f"Error: {str(e)}"
    
    async def _make_request(self, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Make request to Ollama with retry logic"""
        for attempt in range(self.max_retries):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.post(
                        f"{self.base_url}/api/generate",
                        json=payload
                    )
                    response.raise_for_status()
                    return response.json()
            except Exception as e:
                logger.warning(f"Ollama request failed (attempt {attempt + 1}/{self.max_retries}): {str(e)}")
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(self.retry_delay * (attempt + 1))
        
        return None
    
    def _calculate_confidence(self, response: Dict[str, Any]) -> float:
        """Calculate confidence score for response"""
        # Simple heuristic based on response length and eval count
        eval_count = response.get("eval_count", 0)
        response_length = len(response.get("response", ""))
        
        if response_length == 0:
            return 0.0
        
        # More tokens and longer response generally indicate more confident answer
        confidence = min(
            (eval_count / 100) * 0.5 +  # Token count factor
            (response_length / 1000) * 0.5,  # Length factor
            1.0
        )
        
        return confidence
    
    async def list_models(self) -> List[str]:
        """List available models"""
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                response.raise_for_status()
                data = response.json()
                return [model["name"] for model in data.get("models", [])]
        except Exception as e:
            logger.error(f"Failed to list Ollama models: {str(e)}")
            return list(self.models.keys())
    
    async def check_health(self) -> Dict[str, Any]:
        """Check Ollama service health"""
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                response = await client.get(f"{self.base_url}/api/version")
                response.raise_for_status()
                
                return {
                    "status": "healthy",
                    "version": response.json().get("version", "unknown"),
                    "timestamp": datetime.now().isoformat()
                }
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get client statistics"""
        return {
            **self.stats,
            "success_rate": (
                self.stats["successful_requests"] / self.stats["total_requests"]
                if self.stats["total_requests"] > 0 else 0
            ),
            "timestamp": datetime.now().isoformat()
        }