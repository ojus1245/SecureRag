"""
Encryption key management service
"""

import os
import json
import base64
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import logging
from cryptography.fernet import Fernet

logger = logging.getLogger(__name__)


class KeyManager:
    """Manage encryption keys for the system"""
    
    def __init__(self, storage_path: str = "/tmp/keys"):
        self.storage_path = storage_path
        self.keys: Dict[str, Dict[str, Any]] = {}
        self.master_key = None
        self._initialize()
    
    def _initialize(self):
        """Initialize key manager"""
        os.makedirs(self.storage_path, exist_ok=True)
        self._load_master_key()
        self._load_keys()
    
    def _load_master_key(self):
        """Load or create master key"""
        master_key_path = os.path.join(self.storage_path, "master.key")
        
        if os.path.exists(master_key_path):
            with open(master_key_path, "rb") as f:
                self.master_key = f.read()
        else:
            # Generate new master key
            self.master_key = Fernet.generate_key()
            with open(master_key_path, "wb") as f:
                f.write(self.master_key)
    
    def _load_keys(self):
        """Load existing keys from storage"""
        keys_path = os.path.join(self.storage_path, "keys.json")
        
        if os.path.exists(keys_path):
            with open(keys_path, "r") as f:
                encrypted_data = json.load(f)
                self.keys = self._decrypt_keys(encrypted_data)
    
    def _decrypt_keys(self, encrypted_data: Dict[str, Any]) -> Dict[str, Any]:
        """Decrypt keys using master key"""
        try:
            fernet = Fernet(self.master_key)
            decrypted_json = fernet.decrypt(encrypted_data["data"].encode())
            return json.loads(decrypted_json)
        except Exception as e:
            logger.error(f"Failed to decrypt keys: {str(e)}")
            return {}
    
    def _save_keys(self):
        """Save keys to storage"""
        keys_path = os.path.join(self.storage_path, "keys.json")
        
        try:
            fernet = Fernet(self.master_key)
            encrypted_data = fernet.encrypt(json.dumps(self.keys).encode())
            
            with open(keys_path, "w") as f:
                json.dump({"data": encrypted_data.decode()}, f)
        except Exception as e:
            logger.error(f"Failed to save keys: {str(e)}")
    
    async def store_key(self, key: bytes, metadata: Optional[Dict[str, Any]] = None) -> str:
        """Store encryption key"""
        import uuid
        key_id = str(uuid.uuid4())
        
        self.keys[key_id] = {
            "key": base64.b64encode(key).decode(),
            "created_at": datetime.now().isoformat(),
            "metadata": metadata or {},
            "is_active": True
        }
        
        self._save_keys()
        return key_id
    
    async def get_key(self, key_id: str) -> bytes:
        """Retrieve encryption key"""
        if key_id not in self.keys:
            raise ValueError(f"Key not found: {key_id}")
        
        key_data = self.keys[key_id]
        
        if not key_data.get("is_active", True):
            raise ValueError(f"Key is inactive: {key_id}")
        
        return base64.b64decode(key_data["key"])
    
    async def rotate_key(self, key_id: str) -> str:
        """Rotate encryption key"""
        if key_id not in self.keys:
            raise ValueError(f"Key not found: {key_id}")
        
        # Generate new key
        new_key = os.urandom(32)
        new_key_id = await self.store_key(new_key)
        
        # Mark old key as inactive
        self.keys[key_id]["is_active"] = False
        self.keys[key_id]["rotated_to"] = new_key_id
        self.keys[key_id]["rotated_at"] = datetime.now().isoformat()
        
        self._save_keys()
        return new_key_id
    
    async def delete_key(self, key_id: str):
        """Delete encryption key"""
        if key_id in self.keys:
            del self.keys[key_id]
            self._save_keys()
    
    async def list_keys(self) -> List[Dict[str, Any]]:
        """List all keys (without key material)"""
        return [
            {
                "key_id": key_id,
                "created_at": data["created_at"],
                "metadata": data.get("metadata", {}),
                "is_active": data.get("is_active", True)
            }
            for key_id, data in self.keys.items()
        ]