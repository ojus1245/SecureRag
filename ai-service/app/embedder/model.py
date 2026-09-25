"""
Embedding model configuration
"""

from typing import Dict, Any, List, Optional
from dataclasses import dataclass


@dataclass
class EmbeddingConfig:
    """Configuration for embedding models"""
    model_name: str = "sentence-transformers/all-MiniLM-L6-v2"
    dimensions: int = 384
    max_sequence_length: int = 512
    normalize: bool = True
    batch_size: int = 32


class EmbeddingModel:
    """Base class for embedding models"""
    
    def __init__(self, config: Optional[EmbeddingConfig] = None):
        self.config = config or EmbeddingConfig()
        self.model = None
        self._loaded = False
    
    def load(self):
        """Load the model"""
        if self._loaded:
            return
        
        try:
            from sentence_transformers import SentenceTransformer
            self.model = SentenceTransformer(self.config.model_name)
            self.config.dimensions = self.model.get_sentence_embedding_dimension()
            self._loaded = True
        except Exception as e:
            raise RuntimeError(f"Failed to load embedding model: {str(e)}")
    
    def encode(self, text: str) -> List[float]:
        """Encode text to embedding"""
        if not self._loaded:
            self.load()
        
        embedding = self.model.encode(
            text,
            normalize_embeddings=self.config.normalize
        )
        return embedding.tolist()
    
    def encode_batch(self, texts: List[str]) -> List[List[float]]:
        """Encode batch of texts to embeddings"""
        if not self._loaded:
            self.load()
        
        embeddings = self.model.encode(
            texts,
            normalize_embeddings=self.config.normalize,
            batch_size=self.config.batch_size
        )
        return embeddings.tolist()
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get model information"""
        return {
            "model_name": self.config.model_name,
            "dimensions": self.config.dimensions,
            "max_sequence_length": self.config.max_sequence_length,
            "normalize": self.config.normalize,
            "is_loaded": self._loaded
        }


class MiniLMModel(EmbeddingModel):
    """MiniLM embedding model"""
    
    def __init__(self):
        super().__init__(EmbeddingConfig(
            model_name="sentence-transformers/all-MiniLM-L6-v2",
            dimensions=384,
            max_sequence_length=512
        ))


class MPNetModel(EmbeddingModel):
    """MPNet embedding model"""
    
    def __init__(self):
        super().__init__(EmbeddingConfig(
            model_name="sentence-transformers/all-mpnet-base-v2",
            dimensions=768,
            max_sequence_length=512
        ))


class E5Model(EmbeddingModel):
    """E5 embedding model"""
    
    def __init__(self):
        super().__init__(EmbeddingConfig(
            model_name="intfloat/e5-base-v2",
            dimensions=768,
            max_sequence_length=512
        ))


def get_embedding_model(model_type: str = "minilm") -> EmbeddingModel:
    """Factory function to get embedding model"""
    models = {
        "minilm": MiniLMModel,
        "mpnet": MPNetModel,
        "e5": E5Model
    }
    
    model_class = models.get(model_type, MiniLMModel)
    return model_class()