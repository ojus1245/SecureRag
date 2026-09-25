"""
Vector encryption for embeddings
"""

import base64
import json
import numpy as np
from typing import List, Dict, Any
import logging

logger = logging.getLogger(__name__)


class VectorEncryption:
    """Encrypt embedding vectors for secure storage"""
    
    @staticmethod
    async def encrypt_vector(embedding: List[float], encryption) -> Dict[str, Any]:
        """Encrypt embedding vector"""
        try:
            # Convert embedding to string
            embedding_str = json.dumps(embedding)
            
            # Encrypt using AES-GCM
            encrypted = await encryption.encrypt(embedding_str)
            
            return {
                "encrypted_embedding": encrypted["ciphertext"],
                "iv": encrypted["iv"],
                "auth_tag": encrypted["auth_tag"],
                "key_id": encrypted["key_id"],
                "dimensions": len(embedding)
            }
        except Exception as e:
            logger.error(f"Vector encryption failed: {str(e)}")
            raise
    
    @staticmethod
    async def decrypt_vector(encrypted_data: Dict[str, Any], encryption) -> List[float]:
        """Decrypt embedding vector"""
        try:
            # Decrypt using AES-GCM
            decrypted = await encryption.decrypt(
                encrypted_data["encrypted_embedding"],
                encrypted_data["key_id"],
                encrypted_data["iv"],
                encrypted_data["auth_tag"]
            )
            
            # Parse embedding
            return json.loads(decrypted)
        except Exception as e:
            logger.error(f"Vector decryption failed: {str(e)}")
            raise
    
    @staticmethod
    def compute_secure_similarity(encrypted_vec1: np.ndarray, 
                                  encrypted_vec2: np.ndarray) -> float:
        """Compute similarity on encrypted vectors (homomorphic approximation)"""
        # Note: This is a placeholder for homomorphic encryption
        # In production, use proper homomorphic encryption libraries
        try:
            # Simple approximation for demo
            dot_product = np.dot(encrypted_vec1, encrypted_vec2)
            norm1 = np.linalg.norm(encrypted_vec1)
            norm2 = np.linalg.norm(encrypted_vec2)
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
            
            return float(dot_product / (norm1 * norm2))
        except Exception as e:
            logger.error(f"Secure similarity computation failed: {str(e)}")
            return 0.0
    
    @staticmethod
    def quantize_vector(embedding: List[float], bits: int = 8) -> List[int]:
        """Quantize embedding to reduce storage size"""
        try:
            arr = np.array(embedding)
            min_val = arr.min()
            max_val = arr.max()
            
            if min_val == max_val:
                return [0] * len(embedding)
            
            # Normalize to [0, 2^bits - 1]
            normalized = (arr - min_val) / (max_val - min_val)
            quantized = (normalized * (2 ** bits - 1)).astype(int)
            
            return quantized.tolist()
        except Exception as e:
            logger.error(f"Vector quantization failed: {str(e)}")
            raise
    
    @staticmethod
    def dequantize_vector(quantized: List[int], 
                          min_val: float, 
                          max_val: float, 
                          bits: int = 8) -> List[float]:
        """Dequantize vector back to floating point"""
        try:
            arr = np.array(quantized)
            normalized = arr / (2 ** bits - 1)
            dequantized = normalized * (max_val - min_val) + min_val
            
            return dequantized.tolist()
        except Exception as e:
            logger.error(f"Vector dequantization failed: {str(e)}")
            raise