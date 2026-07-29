"""Regression check: debate mode must create one adapter per model, not one per turn.

Run: .venv/bin/python test/test_debate_adapter_reuse.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient
from council import models, server

instantiation_count = {"n": 0}


class FakeAdapter:
    id = "fake"
    label = "Fake"
    color = "#000000"

    def __init__(self, max_tokens: int = 1024):
        instantiation_count["n"] += 1

    async def stream(self, messages, system=""):
        yield "hi"


def main():
    models.MODEL_REGISTRY["fake"] = FakeAdapter
    client = TestClient(server.app)

    with client.websocket_connect("/ws/council") as ws:
        ws.send_json({
            "type": "debate",
            "topic": "test topic",
            "models": ["fake"],
            "max_turns": 4,  # same single model speaks 4 times
        })
        while True:
            msg = ws.receive_json()
            if msg["type"] == "debate_done":
                break

    assert instantiation_count["n"] == 1, (
        f"expected 1 adapter instance reused across turns, got {instantiation_count['n']}"
    )
    print("OK: adapter reused across debate turns")


if __name__ == "__main__":
    main()
