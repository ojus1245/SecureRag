"""
AES-GCM encryption implementation
"""

import os
import base64
import hashlib
from typing import Dict, Any, Tuple, Optional
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import hashes, hmac
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend
import logging

logger = logging.getLogger(__name__)


class AESGCMEncryption:
    """AES-GCM encryption for secure data storage"""
    
    def __init__(self, key_manager=None):
        self.key_manager = key_manager
        self.backend = default_backend()
        self.key_size = 32  # 256 bits
        self.iv_size = 16   # 128 bits
        self.tag_size = 16  # 128 bits
    
    async def encrypt(self, plaintext: str, key_id: Optional[str] = None) -> Dict[str, Any]:
        """Encrypt plaintext using AES-GCM"""
        try:
            # Get or generate key
            if key_id and self.key_manager:
                key = await self.key_manager.get_key(key_id)
            else:
                key = os.urandom(self.key_size)
                if self.key_manager:
                    key_id = await self.key_manager.store_key(key)
            
            # Generate IV
            iv = os.urandom(self.iv_size)
            
            # Create cipher
            cipher = Cipher(
                algorithms.AES(key),
                modes.GCM(iv),
                backend=self.backend
            )
            encryptor = cipher.encryptor()
            
            # Encrypt data
            ciphertext = encryptor.update(plaintext.encode('utf-8')) + encryptor.finalize()
            
            # Get auth tag
            tag = encryptor.tag
            
            # Encode results
            return {
                "ciphertext": base64.b64encode(ciphertext).decode('utf-8'),
                "iv": base64.b64encode(iv).decode('utf-8'),
                "auth_tag": base64.b64encode(tag).decode('utf-8'),
                "key_id": key_id or "default",
                "algorithm": "AES-256-GCM"
            }
        except Exception as e:
            logger.error(f"Encryption failed: {str(e)}")
            raise
    
    async def decrypt(self, ciphertext: str, key_id: str, iv: str, auth_tag: str) -> str:
        """Decrypt ciphertext using AES-GCM"""
        try:
            # Get key
            if self.key_manager:
                key = await self.key_manager.get_key(key_id)
            else:
                raise ValueError("Key manager not configured")
            
            # Decode
            ciphertext_bytes = base64.b64decode(ciphertext)
            iv_bytes = base64.b64decode(iv)
            tag_bytes = base64.b64decode(auth_tag)
            
            # Create cipher
            cipher = Cipher(
                algorithms.AES(key),
                modes.GCM(iv_bytes, tag_bytes),
                backend=self.backend
            )
            decryptor = cipher.decryptor()
            
            # Decrypt data
            plaintext = decryptor.update(ciphertext_bytes) + decryptor.finalize()
            
            return plaintext.decode('utf-8')
        except Exception as e:
            logger.error(f"Decryption failed: {str(e)}")
            raise
    
    def derive_key_from_password(self, password: str, salt: Optional[bytes] = None) -> Tuple[bytes, bytes]:
        """Derive encryption key from password using PBKDF2"""
        if salt is None:
            salt = os.urandom(16)
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=self.key_size,
            salt=salt,
            iterations=100000,
            backend=self.backend
        )
        
        key = kdf.derive(password.encode('utf-8'))
        return key, salt
    
    def generate_key(self) -> bytes:
        """Generate random encryption key"""
        return os.urandom(self.key_size)
    
    def generate_iv(self) -> bytes:
        """Generate random IV"""
        return os.urandom(self.iv_size)
    
    def compute_hmac(self, data: str, key: bytes) -> str:
        """Compute HMAC for data integrity"""
        h = hmac.HMAC(key, hashes.SHA256(), backend=self.backend)
        h.update(data.encode('utf-8'))
        return base64.b64encode(h.finalize()).decode('utf-8')
    
    def verify_hmac(self, data: str, key: bytes, expected_hmac: str) -> bool:
        """Verify HMAC for data integrity"""
        computed_hmac = self.compute_hmac(data, key)
        return hmac.compare_digest(
            computed_hmac.encode('utf-8'),
            expected_hmac.encode('utf-8')
        )