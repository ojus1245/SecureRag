"""
Safety classifier for content moderation
"""

import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
import json

from app.safety.rules import SafetyRules
from app.safety.predictor import SafetyPredictor

logger = logging.getLogger(__name__)


class SafetyClassifier:
    """Classify content for safety and appropriateness"""
    
    def __init__(self):
        self.rules = SafetyRules()
        self.predictor = SafetyPredictor()
        self.categories = [
            "safe",
            "sensitive",
            "confidential",
            "harmful",
            "inappropriate",
            "malicious"
        ]
        
        # Classification thresholds
        self.thresholds = {
            "safe": 0.9,
            "sensitive": 0.7,
            "confidential": 0.8,
            "harmful": 0.85,
            "inappropriate": 0.75,
            "malicious": 0.95
        }
        
        # Cache for classification results
        self.cache = {}
        self.cache_size = 1000
        self.cache_ttl = 3600  # 1 hour
    
    async def check(self, text: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Check text for safety"""
        try:
            # Check cache first
            cache_key = self._get_cache_key(text)
            cached_result = self._get_from_cache(cache_key)
            if cached_result:
                return cached_result
            
            # Run rule-based checks
            rule_results = self.rules.check(text)
            
            # Run ML prediction
            prediction = await self.predictor.predict(text, context)
            
            # Combine results
            combined = self._combine_results(rule_results, prediction)
            
            # Determine final safety
            final_result = self._determine_safety(combined)
            
            # Add metadata
            final_result["timestamp"] = datetime.now().isoformat()
            final_result["text_length"] = len(text)
            final_result["classification_method"] = "rules_and_ml"
            
            # Cache result
            self._add_to_cache(cache_key, final_result)
            
            return final_result
            
        except Exception as e:
            logger.error(f"Safety check failed: {str(e)}", exc_info=True)
            # Fail closed - mark as unsafe if check fails
            return {
                "safe": False,
                "score": 0.0,
                "category": "error",
                "reason": f"Safety check failed: {str(e)}",
                "rules_triggered": [],
                "prediction_details": {},
                "timestamp": datetime.now().isoformat(),
                "text_length": len(text),
                "classification_method": "error"
            }
    
    async def check_batch(self, texts: List[str]) -> List[Dict[str, Any]]:
        """Check multiple texts for safety"""
        results = []
        for text in texts:
            result = await self.check(text)
            results.append(result)
        return results
    
    def _combine_results(self, rule_results: Dict[str, Any], 
                         prediction: Dict[str, Any]) -> Dict[str, Any]:
        """Combine rule-based and ML results"""
        combined = {
            "rules": rule_results,
            "prediction": prediction
        }
        
        # Combine scores (weighted average)
        rule_score = rule_results.get("confidence", 0.0)
        prediction_score = prediction.get("confidence", 0.0)
        
        # Weight: rules 60%, prediction 40%
        combined_score = (rule_score * 0.6) + (prediction_score * 0.4)
        
        # Combine categories
        rule_category = rule_results.get("category", "safe")
        prediction_category = prediction.get("category", "safe")
        
        combined["score"] = combined_score
        combined["category"] = self._merge_categories(rule_category, prediction_category)
        combined["rules_triggered"] = rule_results.get("rules_triggered", [])
        combined["prediction_details"] = prediction.get("details", {})
        
        return combined
    
    def _merge_categories(self, cat1: str, cat2: str) -> str:
        """Merge two category predictions"""
        if cat1 == "safe" and cat2 == "safe":
            return "safe"
        
        # Priority order for unsafe categories
        priority = ["malicious", "harmful", "confidential", "inappropriate", "sensitive"]
        
        for cat in priority:
            if cat1 == cat or cat2 == cat:
                return cat
        
        return "sensitive"
    
    def _determine_safety(self, combined: Dict[str, Any]) -> Dict[str, Any]:
        """Determine final safety based on combined results"""
        score = combined.get("score", 0.0)
        category = combined.get("category", "safe")
        
        # Check if score meets threshold for category
        threshold = self.thresholds.get(category, 0.7)
        is_safe = category == "safe" and score >= self.thresholds.get("safe", 0.9)
        
        # Additional checks
        rules_triggered = combined.get("rules_triggered", [])
        if len(rules_triggered) > 0:
            # Check if any triggered rule is critical
            for rule in rules_triggered:
                if rule.get("weight", 0) >= 0.9:
                    is_safe = False
                    category = "malicious"
                    break
        
        reason = self._generate_reason(combined, is_safe)
        
        return {
            "safe": is_safe,
            "score": score,
            "category": category,
            "reason": reason,
            "rules_triggered": rules_triggered,
            "prediction_details": combined.get("prediction_details", {})
        }
    
    def _generate_reason(self, combined: Dict[str, Any], is_safe: bool) -> str:
        """Generate explanation for classification"""
        if is_safe:
            return "Content passed all safety checks"
        
        reasons = []
        
        # Add rule-based reasons
        rules_triggered = combined.get("rules_triggered", [])
        if rules_triggered:
            reasons.append(f"{len(rules_triggered)} safety rule(s) triggered")
        
        # Add prediction-based reasons
        prediction = combined.get("prediction", {})
        if prediction.get("category") != "safe":
            reasons.append(f"ML classifier detected {prediction.get('category')} content")
        
        if not reasons:
            reasons.append("Content flagged by safety system")
        
        return "; ".join(reasons)
    
    def _get_cache_key(self, text: str) -> str:
        """Generate cache key for text"""
        import hashlib
        return hashlib.sha256(text.encode()).hexdigest()
    
    def _get_from_cache(self, key: str) -> Optional[Dict[str, Any]]:
        """Get result from cache"""
        if key in self.cache:
            entry = self.cache[key]
            if datetime.now().timestamp() - entry["timestamp"] < self.cache_ttl:
                return entry["result"]
            else:
                del self.cache[key]
        return None
    
    def _add_to_cache(self, key: str, result: Dict[str, Any]):
        """Add result to cache"""
        self.cache[key] = {
            "timestamp": datetime.now().timestamp(),
            "result": result
        }
        
        # Remove oldest entries if cache is full
        if len(self.cache) > self.cache_size:
            sorted_entries = sorted(self.cache.items(), 
                                   key=lambda x: x[1]["timestamp"])
            for old_key, _ in sorted_entries[:len(self.cache) - self.cache_size]:
                del self.cache[old_key]
    
    def add_category(self, category: str, threshold: float):
        """Add a new safety category"""
        self.categories.append(category)
        self.thresholds[category] = threshold
    
    def update_threshold(self, category: str, threshold: float):
        """Update threshold for a category"""
        if category in self.thresholds:
            self.thresholds[category] = threshold
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get classification statistics"""
        return {
            "total_categories": len(self.categories),
            "thresholds": self.thresholds,
            "cache_size": len(self.cache),
            "cache_limit": self.cache_size
        }