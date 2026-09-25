"""
ML-based safety prediction
"""

import logging
import hashlib
from typing import Dict, Any, List, Optional, Tuple
import numpy as np
from datetime import datetime
import json

logger = logging.getLogger(__name__)


class SafetyPredictor:
    """ML-based safety prediction"""
    
    def __init__(self):
        self.model = None
        self.vectorizer = None
        self.categories = [
            "safe",
            "sensitive",
            "confidential",
            "harmful",
            "inappropriate",
            "malicious"
        ]
        
        # Feature weights for heuristic prediction
        self.feature_weights = {
            "sensitive_keywords": 0.3,
            "confidential_keywords": 0.4,
            "harmful_keywords": 0.5,
            "malicious_patterns": 0.6,
            "profanity": 0.4,
            "code_patterns": 0.2,
            "url_presence": 0.1,
            "email_presence": 0.2,
            "number_sequences": 0.3,
            "special_characters": 0.1
        }
        
        # Keyword dictionaries
        self.keywords = self._initialize_keywords()
        
        # Initialize simple model
        self._initialize_model()
    
    def _initialize_keywords(self) -> Dict[str, List[str]]:
        """Initialize keyword dictionaries"""
        return {
            "sensitive_keywords": [
                "password", "secret", "private", "personal", "confidential",
                "internal", "proprietary", "classified", "sensitive"
            ],
            "confidential_keywords": [
                "api_key", "token", "credential", "authorization", "authentication",
                "encryption_key", "private_key", "secret_key", "access_key"
            ],
            "harmful_keywords": [
                "malware", "virus", "ransomware", "exploit", "vulnerability",
                "attack", "breach", "hack", "phishing", "spyware"
            ],
            "malicious_patterns": [
                "sql injection", "xss", "cross-site scripting", "command injection",
                "buffer overflow", "denial of service", "zero-day", "backdoor"
            ],
            "profanity": [
                "damn", "hell", "shit", "fuck", "bitch", "asshole",
                "bastard", "crap", "piss", "dick"
            ],
            "code_patterns": [
                "SELECT", "INSERT", "UPDATE", "DELETE", "DROP", "UNION",
                "<script", "javascript:", "onerror", "onload", "onclick",
                "rm -rf", "wget", "curl", "/bin/bash", "cmd.exe"
            ]
        }
    
    def _initialize_model(self):
        """Initialize simple heuristic model"""
        # For production, load a proper ML model (e.g., transformer-based classifier)
        # For now, use heuristic approach
        logger.info("SafetyPredictor initialized with heuristic model")
    
    async def predict(self, text: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Predict safety of text"""
        try:
            # Extract features
            features = self._extract_features(text)
            
            # Calculate scores for each category
            category_scores = self._calculate_category_scores(features)
            
            # Determine category with highest score
            predicted_category = max(category_scores, key=category_scores.get)
            confidence = category_scores[predicted_category]
            
            # Determine if safe
            is_safe = predicted_category == "safe" and confidence > 0.7
            
            return {
                "is_safe": is_safe,
                "confidence": confidence,
                "category": predicted_category,
                "score": confidence,
                "details": {
                    "category_scores": category_scores,
                    "features": features,
                    "model": "heuristic_v1"
                }
            }
        except Exception as e:
            logger.error(f"Safety prediction failed: {str(e)}", exc_info=True)
            return {
                "is_safe": False,
                "confidence": 0.0,
                "category": "error",
                "score": 0.0,
                "details": {
                    "error": str(e)
                }
            }
    
    def _extract_features(self, text: str) -> Dict[str, Any]:
        """Extract features from text"""
        features = {}
        text_lower = text.lower()
        
        # Keyword features
        for keyword_type, keywords in self.keywords.items():
            count = sum(1 for kw in keywords if kw.lower() in text_lower)
            features[keyword_type] = min(count / len(keywords), 1.0)
        
        # Pattern features
        features["url_presence"] = 1.0 if self._has_url(text) else 0.0
        features["email_presence"] = 1.0 if self._has_email(text) else 0.0
        features["number_sequences"] = min(
            len(self._find_number_sequences(text)) / 10, 1.0
        )
        features["special_characters"] = min(
            self._count_special_characters(text) / 20, 1.0
        )
        features["code_patterns"] = self._has_code_patterns(text)
        
        # Text statistics
        features["text_length"] = min(len(text) / 1000, 1.0)
        features["avg_word_length"] = self._average_word_length(text)
        
        return features
    
    def _calculate_category_scores(self, features: Dict[str, Any]) -> Dict[str, float]:
        """Calculate scores for each category"""
        scores = {
            "safe": 1.0,
            "sensitive": 0.0,
            "confidential": 0.0,
            "harmful": 0.0,
            "inappropriate": 0.0,
            "malicious": 0.0
        }
        
        # Sensitive score
        sensitive_score = (
            features.get("sensitive_keywords", 0) * 0.5 +
            features.get("email_presence", 0) * 0.3 +
            features.get("number_sequences", 0) * 0.2
        )
        scores["sensitive"] = min(sensitive_score, 1.0)
        
        # Confidential score
        confidential_score = (
            features.get("confidential_keywords", 0) * 0.6 +
            features.get("sensitive_keywords", 0) * 0.4
        )
        scores["confidential"] = min(confidential_score, 1.0)
        
        # Harmful score
        harmful_score = (
            features.get("harmful_keywords", 0) * 0.7 +
            features.get("code_patterns", 0) * 0.3
        )
        scores["harmful"] = min(harmful_score, 1.0)
        
        # Inappropriate score
        inappropriate_score = (
            features.get("profanity", 0) * 0.8 +
            features.get("special_characters", 0) * 0.2
        )
        scores["inappropriate"] = min(inappropriate_score, 1.0)
        
        # Malicious score
        malicious_score = (
            features.get("malicious_patterns", 0) * 0.8 +
            features.get("code_patterns", 0) * 0.2
        )
        scores["malicious"] = min(malicious_score, 1.0)
        
        # Safe score (inverse of max unsafe score)
        max_unsafe = max(
            scores["sensitive"],
            scores["confidential"],
            scores["harmful"],
            scores["inappropriate"],
            scores["malicious"]
        )
        scores["safe"] = max(0.0, 1.0 - max_unsafe)
        
        return scores
    
    def _has_url(self, text: str) -> bool:
        """Check if text contains URL"""
        import re
        url_pattern = r'https?://[^\s]+|www\.[^\s]+'
        return bool(re.search(url_pattern, text, re.IGNORECASE))
    
    def _has_email(self, text: str) -> bool:
        """Check if text contains email"""
        import re
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        return bool(re.search(email_pattern, text))
    
    def _find_number_sequences(self, text: str) -> List[str]:
        """Find number sequences in text"""
        import re
        number_pattern = r'\b\d{4,}\b'
        return re.findall(number_pattern, text)
    
    def _count_special_characters(self, text: str) -> int:
        """Count special characters"""
        special_chars = "!@#$%^&*()_+-=[]{}|;:,.<>?/~`"
        return sum(1 for char in text if char in special_chars)
    
    def _has_code_patterns(self, text: str) -> float:
        """Check for code patterns"""
        code_patterns = [
            "SELECT", "INSERT", "UPDATE", "DELETE", "DROP", "UNION",
            "<script", "javascript:", "onerror", "onload", "onclick",
            "rm -rf", "wget", "curl", "/bin/bash", "cmd.exe",
            "import ", "def ", "class ", "function "
        ]
        
        text_lower = text.lower()
        matches = sum(1 for pattern in code_patterns if pattern.lower() in text_lower)
        
        return min(matches / len(code_patterns), 1.0)
    
    def _average_word_length(self, text: str) -> float:
        """Calculate average word length"""
        words = text.split()
        if not words:
            return 0.0
        
        total_length = sum(len(word) for word in words)
        return min(total_length / len(words) / 20, 1.0)
    
    def train(self, texts: List[str], labels: List[str]):
        """Train the safety classifier (placeholder for ML model)"""
        logger.info("Training safety classifier...")
        # In production, train a proper ML model here
        # For now, just log the training data size
        logger.info(f"Training data: {len(texts)} samples")
    
    def evaluate(self, texts: List[str], labels: List[str]) -> Dict[str, Any]:
        """Evaluate model performance (placeholder)"""
        logger.info("Evaluating safety classifier...")
        
        correct = 0
        predictions = []
        
        for text in texts:
            # Synchronous prediction for evaluation
            import asyncio
            prediction = asyncio.run(self.predict(text))
            predictions.append(prediction)
        
        # Calculate metrics (simplified)
        return {
            "total_samples": len(texts),
            "predictions": len(predictions),
            "model": "heuristic_v1"
        }
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get model information"""
        return {
            "model": "heuristic_v1",
            "categories": self.categories,
            "feature_weights": self.feature_weights,
            "keyword_count": {
                key: len(value) 
                for key, value in self.keywords.items()
            }
        }