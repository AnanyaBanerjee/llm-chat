"""Regression check: Ollama model discovery parses /api/tags and degrades gracefully.

Run: .venv/bin/python test/test_ollama_discovery.py
"""
import io
import sys
import json
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from council import models


def _fake_urlopen(payload):
    def _open(url, timeout=None):
        return io.BytesIO(json.dumps(payload).encode())
    return _open


def test_parses_model_names():
    payload = {"models": [{"name": "llama3:8b"}, {"name": "qwen2.5-coder:1.5b"}]}
    with patch("urllib.request.urlopen", _fake_urlopen(payload)):
        names = models._list_ollama_models()
    assert names == ["llama3:8b", "qwen2.5-coder:1.5b"], names


def test_registers_with_slugified_ids():
    payload = {"models": [{"name": "llama3:8b"}]}
    registry = {}
    with patch("urllib.request.urlopen", _fake_urlopen(payload)), \
         patch.object(models, "MODEL_REGISTRY", registry):
        models._register_ollama_models()
    assert "ollama-llama3-8b" in registry
    factory = registry["ollama-llama3-8b"]
    assert factory.label == "llama3:8b"
    adapter = factory(max_tokens=10)
    assert adapter.model == "llama3:8b"


def test_unreachable_ollama_returns_empty():
    def _raise(url, timeout=None):
        raise OSError("connection refused")
    with patch("urllib.request.urlopen", _raise):
        assert models._list_ollama_models() == []


if __name__ == "__main__":
    test_parses_model_names()
    test_registers_with_slugified_ids()
    test_unreachable_ollama_returns_empty()
    print("OK: ollama discovery parses, registers, and degrades gracefully")
