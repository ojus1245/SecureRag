"""
External LLM Client for cloud-based model inference
"""

import logging
import json
from typing import Dict, Any, List, Optional, AsyncGenerator
import httpx
import asyncio
from datetime import datetime

logger = logging.getLogger(__name__)


class ExternalLLMClient:
    """Client for external LLM services (OpenAI, Anthropic, etc.)"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key
        self.default_provider = "openai"
        self.timeout = 60
        self.max_retries = 3
        
        # Provider configurations
        self.providers = {
            "openai": {
                "base_url": "https://api.openai.com/v1",
                "models": {
                    "gpt-4": {
                        "name": "gpt-4",
                        "context_length": 8192,
                        "max_tokens": 4096
                    },
                    "gpt-3.5-turbo": {
                        "name": "gpt-3.5-turbo",
                        "context_length": 4096,
                        "max_tokens": 2048
                    }
                }
            },
            "anthropic": {
                "base_url": "https://api.anthropic.com/v1",
                "models": {
                    "claude-2": {
                        "name": "claude-2",
                        "context_length": 100000,
                        "max_tokens": 4096
                    },
                    "claude-instant": {
                        "name": "claude-instant",
                        "context_length": 100000,
                        "max_tokens": 2048
                    }
                }
            }
        }
        
        # Statistics
        self.stats = {
            "total_requests": 0,
            "successful_requests": 0,
            "failed_requests": 0,
            "total_tokens": 0,
            "total_cost": 0
        }
    
    async def generate(self,
                       prompt: str,
                       provider: Optional[str] = None,
                       model: Optional[str] = None,
                       options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Generate response using external LLM"""
        start_time = datetime.now()
        self.stats["total_requests"] += 1
        
        try:
            provider_name = provider or self.default_provider
            provider_config = self.providers.get(provider_name)
            
            if not provider_config:
                raise ValueError(f"Unknown provider: {provider_name}")
            
            model_name = model or list(provider_config["models"].keys())[0]
            model_config = provider_config["models"].get(model_name)
            
            if not model_config:
                raise ValueError(f"Unknown model: {model_name}")
            
            # Route to appropriate provider
            if provider_name == "openai":
                result = await self._generate_openai(
                    prompt, model_config, options
                )
            elif provider_name == "anthropic":
                result = await self._generate_anthropic(
                    prompt, model_config, options
                )
            else:
                raise ValueError(f"Unsupported provider: {provider_name}")
            
            # Add metadata
            result["provider"] = provider_name
            result["model"] = model_name
            result["response_time"] = (datetime.now() - start_time).total_seconds()
            result["timestamp"] = datetime.now().isoformat()
            
            # Update statistics
            self.stats["successful_requests"] += 1
            self.stats["total_tokens"] += result.get("usage", {}).get("total_tokens", 0)
            self.stats["total_cost"] += self._calculate_cost(provider_name, model_name, result.get("usage", {}))
            
            return result
            
        except Exception as e:
            logger.error(f"External LLM generation failed: {str(e)}", exc_info=True)
            self.stats["failed_requests"] += 1
            
            return {
                "text": "",
                "error": str(e),
                "provider": provider or self.default_provider,
                "response_time": (datetime.now() - start_time).total_seconds(),
                "timestamp": datetime.now().isoformat()
            }
    
    async def _generate_openai(self, 
                               prompt: str,
                               model_config: Dict[str, Any],
                               options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Generate using OpenAI API"""
        provider_config = self.providers["openai"]
        
        payload = {
            "model": model_config["name"],
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "max_tokens": options.get("max_tokens", model_config["max_tokens"]),
            "temperature": options.get("temperature", 0.7)
        }
        
        if options.get("system"):
            payload["messages"].insert(0, {
                "role": "system",
                "content": options["system"]
            })
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{provider_config['base_url']}/chat/completions",
                json=payload,
                headers=headers
            )
            response.raise_for_status()
            data = response.json()
        
        return {
            "text": data["choices"][0]["message"]["content"],
            "usage": {
                "prompt_tokens": data.get("usage", {}).get("prompt_tokens", 0),
                "completion_tokens": data.get("usage", {}).get("completion_tokens", 0),
                "total_tokens": data.get("usage", {}).get("total_tokens", 0)
            },
            "confidence": data["choices"][0].get("finish_reason") == "stop"
        }
    
    async def _generate_anthropic(self,
                                  prompt: str,
                                  model_config: Dict[str, Any],
                                  options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Generate using Anthropic API"""
        provider_config = self.providers["anthropic"]
        
        payload = {
            "model": model_config["name"],
            "prompt": f"\n\nHuman: {prompt}\n\nAssistant:",
            "max_tokens_to_sample": options.get("max_tokens", model_config["max_tokens"]),
            "temperature": options.get("temperature", 0.7)
        }
        
        headers = {
            "X-API-Key": self.api_key,
            "Content-Type": "application/json"
        }
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{provider_config['base_url']}/complete",
                json=payload,
                headers=headers
            )
            response.raise_for_status()
            data = response.json()
        
        return {
            "text": data.get("completion", ""),
            "usage": {
                "prompt_tokens": 0,  # Anthropic doesn't provide token counts
                "completion_tokens": 0,
                "total_tokens": 0
            },
            "confidence": 0.8  # Default confidence
        }
    
    def _calculate_cost(self, provider: str, model: str, usage: Dict[str, Any]) -> float:
        """Calculate cost of API call"""
        # Pricing per 1000 tokens (approximate)
        pricing = {
            "openai": {
                "gpt-4": {"prompt": 0.03, "completion": 0.06},
                "gpt-3.5-turbo": {"prompt": 0.0015, "completion": 0.002}
            },
            "anthropic": {
                "claude-2": {"prompt": 0.008, "completion": 0.024},
                "claude-instant": {"prompt": 0.0016, "completion": 0.0055}
            }
        }
        
        if provider not in pricing or model not in pricing[provider]:
            return 0.0
        
        model_pricing = pricing[provider][model]
        prompt_cost = (usage.get("prompt_tokens", 0) / 1000) * model_pricing["prompt"]
        completion_cost = (usage.get("completion_tokens", 0) / 1000) * model_pricing["completion"]
        
        return prompt_cost + completion_cost
    
    async def generate_stream(self,
                              prompt: str,
                              provider: Optional[str] = None,
                              model: Optional[str] = None,
                              options: Optional[Dict[str, Any]] = None) -> AsyncGenerator[str, None]:
        """Generate streaming response using external LLM"""
        try:
            provider_name = provider or self.default_provider
            
            if provider_name == "openai":
                async for chunk in self._stream_openai(prompt, model, options):
                    yield chunk
            else:
                # Fallback to non-streaming
                result = await self.generate(prompt, provider_name, model, options)
                yield result.get("text", "")
                
        except Exception as e:
            logger.error(f"External LLM streaming failed: {str(e)}", exc_info=True)
            yield f"Error: {str(e)}"
    
    async def _stream_openai(self,
                             prompt: str,
                             model: Optional[str] = None,
                             options: Optional[Dict[str, Any]] = None) -> AsyncGenerator[str, None]:
        """Stream from OpenAI API"""
        provider_config = self.providers["openai"]
        model_name = model or "gpt-3.5-turbo"
        
        payload = {
            "model": model_name,
            "messages": [{"role": "user", "content": prompt}],
            "stream": True
        }
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            async with client.stream("POST", 
                                     f"{provider_config['base_url']}/chat/completions",
                                     json=payload,
                                     headers=headers) as response:
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:]
                        if data_str == "[DONE]":
                            break
                        try:
                            data = json.loads(data_str)
                            delta = data["choices"][0].get("delta", {})
                            if "content" in delta:
                                yield delta["content"]
                        except json.JSONDecodeError:
                            continue
    
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