"""
Ollama API wrapper acting as a drop-in replacement for the google-genai SDK in Python.
"""

import json
import urllib.request
import urllib.error
from typing import Any, List, Union, Optional
from piap.utils.logging import logger
import piap.config as config

class GenerateContentConfig:
    def __init__(
        self,
        response_mime_type: Optional[str] = None,
        response_schema: Optional[Any] = None,
        system_instruction: Optional[str] = None
    ):
        self.response_mime_type = response_mime_type
        self.response_schema = response_schema
        self.system_instruction = system_instruction

class TypesMock:
    GenerateContentConfig = GenerateContentConfig

types = TypesMock()

class EmbeddingValue:
    def __init__(self, values: List[float]):
        self.values = values

class EmbedContentResponse:
    def __init__(self, embeddings: List[List[float]]):
        self.embeddings = [EmbeddingValue(v) for v in embeddings]

class GenerateContentResponse:
    def __init__(self, text: str):
        self.text = text

class GenerateContentResponseChunk:
    def __init__(self, text: str):
        self.text = text

class Models:
    def __init__(self, base_url: str, model: str, embed_model: str):
        self.base_url = base_url
        self.model = model
        self.embed_model = embed_model

    def embed_content(self, model: str, contents: Union[str, List[str]]) -> EmbedContentResponse:
        """
        Generates dense vector embeddings using Ollama's API.
        """
        inputs = contents if isinstance(contents, list) else [contents]
        url = f"{self.base_url}/api/embed"
        payload = {
            "model": self.embed_model,
            "input": inputs
        }
        
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode('utf-8'),
                headers={'Content-Type': 'application/json'},
                method='POST'
            )
            with urllib.request.urlopen(req) as response:
                res_data = response.read().decode('utf-8')
                data = json.loads(res_data)
                
            embeddings = data.get("embeddings", [])
            return EmbedContentResponse(embeddings)
        except Exception as e:
            logger.error(f"[Ollama Client] Embedding generation failed: {e}")
            raise RuntimeError(f"Ollama embedding failure: {e}") from e

    def generate_content(
        self,
        model: str,
        contents: str,
        config: Optional[GenerateContentConfig] = None
    ) -> GenerateContentResponse:
        """
        Generates structured or plain text response using Ollama.
        """
        url = f"{self.base_url}/api/generate"
        payload = {
            "model": self.model,
            "prompt": contents,
            "stream": False
        }
        
        if config:
            if getattr(config, "system_instruction", None):
                payload["system"] = config.system_instruction
            if getattr(config, "response_mime_type", None) == "application/json":
                schema = getattr(config, "response_schema", None)
                if schema:
                    if hasattr(schema, "model_json_schema"):
                        payload["format"] = schema.model_json_schema()
                    elif hasattr(schema, "schema"):
                        payload["format"] = schema.schema()
                    else:
                        payload["format"] = "json"
                else:
                    payload["format"] = "json"

        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode('utf-8'),
                headers={'Content-Type': 'application/json'},
                method='POST'
            )
            with urllib.request.urlopen(req) as response:
                res_data = response.read().decode('utf-8')
                data = json.loads(res_data)
            
            return GenerateContentResponse(data.get("response", ""))
        except Exception as e:
            logger.error(f"[Ollama Client] Content generation failed: {e}")
            raise RuntimeError(f"Ollama generation failure: {e}") from e

    def generate_content_stream(
        self,
        model: str,
        contents: str,
        config: Optional[GenerateContentConfig] = None
    ):
        """
        Streams content generation response using Ollama.
        """
        url = f"{self.base_url}/api/generate"
        payload = {
            "model": self.model,
            "prompt": contents,
            "stream": True
        }
        
        if config:
            if getattr(config, "system_instruction", None):
                payload["system"] = config.system_instruction
            if getattr(config, "response_mime_type", None) == "application/json":
                payload["format"] = "json"

        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode('utf-8'),
                headers={'Content-Type': 'application/json'},
                method='POST'
            )
            
            response = urllib.request.urlopen(req)
            
            class StreamGenerator:
                def __init__(self, conn):
                    self.conn = conn

                def __iter__(self):
                    return self

                def __next__(self):
                    line = self.conn.readline()
                    if not line:
                        self.conn.close()
                        raise StopIteration
                    
                    decoded = line.decode('utf-8').strip()
                    if decoded:
                        try:
                            data = json.loads(decoded)
                            text = data.get("response", "")
                            return GenerateContentResponseChunk(text)
                        except Exception as parse_err:
                            logger.warning(f"[Ollama Client] Failed parsing stream chunk: {parse_err}")
                    return GenerateContentResponseChunk("")

            return StreamGenerator(response)
        except Exception as e:
            logger.error(f"[Ollama Client] Content streaming failed: {e}")
            raise RuntimeError(f"Ollama streaming failure: {e}") from e

class Client:
    def __init__(self, api_key: Optional[str] = None):
        self.models = Models(
            base_url=config.OLLAMA_BASE_URL,
            model=config.OLLAMA_MODEL,
            embed_model=config.OLLAMA_EMBED_MODEL
        )

class GenaiMock:
    Client = Client

genai = GenaiMock()
