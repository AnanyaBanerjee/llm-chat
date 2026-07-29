from __future__ import annotations
import functools
import json
import os
import urllib.request
from collections.abc import AsyncIterator
import anthropic
import openai


MODEL_REGISTRY: dict[str, type] = {}


def _register(cls):
    MODEL_REGISTRY[cls.id] = cls
    return cls


class LLMAdapter:
    id: str
    label: str
    color: str

    async def stream(self, messages: list[dict], system: str = "") -> AsyncIterator[str]:
        raise NotImplementedError
        yield  # mark as async generator


@_register
class ClaudeAdapter(LLMAdapter):
    id = "claude"
    label = "Claude"
    color = "#D97706"

    def __init__(self, max_tokens: int = 1024):
        self.client = anthropic.AsyncAnthropic()
        self.model = "claude-sonnet-4-6"
        self.max_tokens = max_tokens

    async def stream(self, messages: list[dict], system: str = "") -> AsyncIterator[str]:
        async with self.client.messages.stream(
            model=self.model,
            max_tokens=self.max_tokens,
            system=system or "You are a helpful assistant.",
            messages=messages,
        ) as s:
            async for text in s.text_stream:
                yield text


@_register
class GPT4oAdapter(LLMAdapter):
    id = "gpt4o"
    label = "GPT-4o"
    color = "#10A37F"

    def __init__(self, max_tokens: int = 1024,
                 model: str = "gpt-4o",
                 base_url: str | None = None,
                 api_key: str | None = None):
        kwargs: dict = {}
        if base_url:
            kwargs["base_url"] = base_url
        if api_key:
            kwargs["api_key"] = api_key
        self.client = openai.AsyncOpenAI(**kwargs)
        self.model = model
        self.max_tokens = max_tokens

    async def stream(self, messages: list[dict], system: str = "") -> AsyncIterator[str]:
        all_messages = []
        if system:
            all_messages.append({"role": "system", "content": system})
        all_messages.extend(messages)
        response = await self.client.chat.completions.create(
            model=self.model,
            max_tokens=self.max_tokens,
            messages=all_messages,
            stream=True,
        )
        async for chunk in response:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta


@_register
class DeepSeekAdapter(GPT4oAdapter):
    id = "deepseek"
    label = "DeepSeek"
    color = "#6366F1"

    def __init__(self, max_tokens: int = 1024):
        api_key = os.environ.get("DEEPSEEK_API_KEY")
        if not api_key:
            raise ValueError("DEEPSEEK_API_KEY is not set")
        super().__init__(
            model="deepseek-chat",
            max_tokens=max_tokens,
            base_url="https://api.deepseek.com",
            api_key=api_key,
        )


@_register
class GrokAdapter(GPT4oAdapter):
    id = "grok"
    label = "Grok"
    color = "#EC4899"

    def __init__(self, max_tokens: int = 1024):
        api_key = os.environ.get("GROK_API_KEY")
        if not api_key:
            raise ValueError("GROK_API_KEY is not set")
        super().__init__(
            model="grok-3-latest",
            max_tokens=max_tokens,
            base_url="https://api.x.ai/v1",
            api_key=api_key,
        )


def _list_ollama_models(base_url: str = "http://localhost:11434") -> list[str]:
    try:
        with urllib.request.urlopen(f"{base_url}/api/tags", timeout=1) as resp:
            data = json.load(resp)
        return [m["name"] for m in data.get("models", [])]
    except Exception:
        return []


def _register_ollama_models(base_url: str = "http://localhost:11434") -> None:
    # ponytail: rotates through a fixed palette rather than assigning real per-model colors
    colors = ["#0EA5E9", "#84CC16", "#F97316", "#A855F7", "#14B8A6", "#EAB308"]
    for i, name in enumerate(_list_ollama_models(base_url)):
        factory = functools.partial(
            GPT4oAdapter, model=name, base_url=f"{base_url}/v1", api_key="ollama",
        )
        factory.id = "ollama-" + name.replace(":", "-").replace(".", "-")
        factory.label = name
        factory.color = colors[i % len(colors)]
        MODEL_REGISTRY[factory.id] = factory


_register_ollama_models()
