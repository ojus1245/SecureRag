"""
Safety rules for content moderation
"""

import re
import logging
from typing import Dict, Any, List, Tuple, Optional
import json

logger = logging.getLogger(__name__)


class SafetyRules:
    """Rule-based safety checks"""
    
    def __init__(self):
        self.rules = self._initialize_default_rules()
        self.compiled_patterns = {}
        self._compile_patterns()
    
    def _initialize_default_rules(self) -> Dict[str, Any]:
        """Initialize default safety rules"""
        return {
            # PII (Personally Identifiable Information)
            "pii_ssn": {
                "pattern": r'\b\d{3}-\d{2}-\d{4}\b',
                "weight": 0.9,
                "category": "confidential",
                "description": "Social Security Number"
            },
            "pii_credit_card": {
                "pattern": r'\b(?:\d[ -]*?){13,16}\b',
                "weight": 0.9,
                "category": "confidential",
                "description": "Credit Card Number"
            },
            "pii_email": {
                "pattern": r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
                "weight": 0.7,
                "category": "sensitive",
                "description": "Email Address"
            },
            "pii_phone": {
                "pattern": r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b',
                "weight": 0.6,
                "category": "sensitive",
                "description": "Phone Number"
            },
            "pii_address": {
                "pattern": r'\b\d+\s+[A-Za-z0-9\s,]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd)\b',
                "weight": 0.7,
                "category": "sensitive",
                "description": "Physical Address"
            },
            
            # Security threats
            "security_sql_injection": {
                "pattern": r'\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION)\b.*\b(FROM|INTO|TABLE)\b',
                "weight": 0.95,
                "category": "malicious",
                "description": "SQL Injection Attempt"
            },
            "security_xss": {
                "pattern": r'<script[^>]*>|javascript:|onerror=|onload=|onclick=',
                "weight": 0.95,
                "category": "malicious",
                "description": "Cross-Site Scripting (XSS)"
            },
            "security_command_injection": {
                "pattern": r'\b(?:rm\s+-rf|wget\s+|curl\s+.*\|.*sh|/bin/bash|cmd\.exe)\b',
                "weight": 0.95,
                "category": "malicious",
                "description": "Command Injection"
            },
            "security_path_traversal": {
                "pattern": r'\.\./\.\./|\.\.\\\.\.\\|/etc/passwd|C:\\Windows',
                "weight": 0.9,
                "category": "malicious",
                "description": "Path Traversal"
            },
            
            # Harmful content
            "harmful_malware": {
                "pattern": r'\b(malware|ransomware|spyware|trojan|virus|worm)\b',
                "weight": 0.8,
                "category": "harmful",
                "description": "Malware References"
            },
            "harmful_phishing": {
                "pattern": r'\b(phishing|spoofing|social engineering|credential harvesting)\b',
                "weight": 0.8,
                "category": "harmful",
                "description": "Phishing References"
            },
            "harmful_hacking": {
                "pattern": r'\b(hacking|exploiting|breaching|penetration testing)\b',
                "weight": 0.7,
                "category": "harmful",
                "description": "Hacking References"
            },
            
            # Inappropriate content
            "inappropriate_profanity": {
                "pattern": r'\b(damn|hell|shit|fuck|bitch|asshole)\b',
                "weight": 0.6,
                "category": "inappropriate",
                "description": "Profanity"
            },
            "inappropriate_harassment": {
                "pattern": r'\b(harass|bully|intimidate|threaten)\b',
                "weight": 0.8,
                "category": "inappropriate",
                "description": "Harassment"
            },
            "inappropriate_discrimination": {
                "pattern": r'\b(discriminate|racist|sexist|homophobic)\b',
                "weight": 0.8,
                "category": "inappropriate",
                "description": "Discrimination"
            },
            
            # Confidential information
            "confidential_api_key": {
                "pattern": r'\b(?:api[_-]?key|apikey|secret[_-]?key|access[_-]?token)\b\s*[:=]\s*[\'"]?\w+',
                "weight": 0.95,
                "category": "confidential",
                "description": "API Keys or Tokens"
            },
            "confidential_password": {
                "pattern": r'\b(?:password|passwd|pwd)\b\s*[:=]\s*\S+',
                "weight": 0.9,
                "category": "confidential",
                "description": "Passwords"
            },
            "confidential_internal": {
                "pattern": r'\b(?:internal|confidential|classified|proprietary)\b\s+(?:document|information|data|report)\b',
                "weight": 0.7,
                "category": "confidential",
                "description": "Confidential References"
            }
        }
    
    def _compile_patterns(self):
        """Compile regex patterns for efficiency"""
        for rule_name, rule in self.rules.items():
            try:
                self.compiled_patterns[rule_name] = re.compile(
                    rule["pattern"], 
                    re.IGNORECASE | re.MULTILINE
                )
            except Exception as e:
                logger.error(f"Failed to compile pattern for {rule_name}: {str(e)}")
    
    def check(self, text: str) -> Dict[str, Any]:
        """Check text against safety rules"""
        triggered_rules = []
        max_weight = 0.0
        category = "safe"
        
        for rule_name, pattern in self.compiled_patterns.items():
            try:
                matches = pattern.findall(text)
                if matches:
                    rule = self.rules[rule_name]
                    triggered_rules.append({
                        "rule": rule_name,
                        "description": rule.get("description", ""),
                        "weight": rule["weight"],
                        "category": rule["category"],
                        "matches": matches[:5]  # Limit matches to prevent huge output
                    })
                    
                    if rule["weight"] > max_weight:
                        max_weight = rule["weight"]
                        category = rule["category"]
            except Exception as e:
                logger.error(f"Rule check failed for {rule_name}: {str(e)}")
        
        is_safe = len(triggered_rules) == 0
        confidence = 1.0 - max_weight if max_weight > 0 else 1.0
        
        return {
            "is_safe": is_safe,
            "confidence": confidence,
            "category": category,
            "reason": self._generate_reason(triggered_rules, is_safe),
            "rules_triggered": triggered_rules
        }
    
    def _generate_reason(self, triggered_rules: List[Dict], is_safe: bool) -> str:
        """Generate explanation for rule results"""
        if is_safe:
            return "No safety rules triggered"
        
        if not triggered_rules:
            return "Safety check completed"
        
        # Get top rules by weight
        top_rules = sorted(triggered_rules, key=lambda x: x["weight"], reverse=True)[:3]
        rule_descriptions = [r.get("description", r["rule"]) for r in top_rules]
        
        return f"Triggered rules: {', '.join(rule_descriptions)}"
    
    def add_rule(self, name: str, pattern: str, weight: float, 
                 category: str, description: str = "") -> bool:
        """Add a new safety rule"""
        try:
            self.rules[name] = {
                "pattern": pattern,
                "weight": weight,
                "category": category,
                "description": description
            }
            self.compiled_patterns[name] = re.compile(pattern, re.IGNORECASE)
            logger.info(f"Added safety rule: {name}")
            return True
        except Exception as e:
            logger.error(f"Failed to add rule {name}: {str(e)}")
            return False
    
    def remove_rule(self, name: str) -> bool:
        """Remove a safety rule"""
        if name in self.rules:
            del self.rules[name]
            if name in self.compiled_patterns:
                del self.compiled_patterns[name]
            logger.info(f"Removed safety rule: {name}")
            return True
        return False
    
    def update_rule(self, name: str, **updates) -> bool:
        """Update an existing rule"""
        if name not in self.rules:
            return False
        
        self.rules[name].update(updates)
        
        # Recompile pattern if it was updated
        if "pattern" in updates:
            try:
                self.compiled_patterns[name] = re.compile(
                    updates["pattern"], 
                    re.IGNORECASE
                )
            except Exception as e:
                logger.error(f"Failed to recompile pattern for {name}: {str(e)}")
                return False
        
        return True
    
    def get_rule(self, name: str) -> Optional[Dict[str, Any]]:
        """Get a specific rule"""
        return self.rules.get(name)
    
    def list_rules(self) -> Dict[str, Any]:
        """List all rules"""
        return {
            "total_rules": len(self.rules),
            "rules": self.rules
        }
    
    def get_rules_by_category(self, category: str) -> List[Dict[str, Any]]:
        """Get rules by category"""
        return [
            {"name": name, **rule}
            for name, rule in self.rules.items()
            if rule.get("category") == category
        ]
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get rule statistics"""
        categories = {}
        for rule in self.rules.values():
            cat = rule.get("category", "unknown")
            categories[cat] = categories.get(cat, 0) + 1
        
        return {
            "total_rules": len(self.rules),
            "categories": categories
        }