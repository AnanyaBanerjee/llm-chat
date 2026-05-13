from __future__ import annotations
import asyncio
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from .models import MODEL_REGISTRY

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/models")
def list_models():
    return [
        {"id": cls.id, "label": cls.label, "color": cls.color}
        for cls in MODEL_REGISTRY.values()
    ]


@app.websocket("/ws/council")
async def council_ws(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()

            # ── Verbosity directive (shared across all modes) ─────────────
            VERBOSITY_DIRECTIVE: dict[str, str] = {
                "short":  "IMPORTANT: Reply in 2 sentences or fewer. No lists, no headers, no elaboration.",
                "medium": "Keep your reply to 4-5 sentences. Be direct and skip unnecessary preamble.",
            }
            VERBOSITY_MAX_TOKENS: dict[str, int] = {
                "short":  120,
                "medium": 350,
                "none":   1024,
            }

            def verbosity_suffix(v: str) -> str:
                directive = VERBOSITY_DIRECTIVE.get(v, "")
                return f" {directive}" if directive else ""

            verbosity: str = data.get("verbosity", "none")
            max_tokens: int = VERBOSITY_MAX_TOKENS.get(verbosity, 1024)

            # ── Compare: all models answer simultaneously ─────────────────
            if data["type"] == "compare":
                task: str = data["task"]
                model_ids: list[str] = data.get("models", list(MODEL_REGISTRY.keys()))
                system = "You are a helpful assistant." + verbosity_suffix(verbosity)

                async def stream_compare(mid: str):
                    try:
                        adapter = MODEL_REGISTRY[mid](max_tokens=max_tokens)
                        async for chunk in adapter.stream(
                            messages=[{"role": "user", "content": task}],
                            system=system,
                        ):
                            await websocket.send_json({"type": "chunk", "model": mid, "text": chunk})
                        await websocket.send_json({"type": "done", "model": mid})
                    except Exception as e:
                        await websocket.send_json({"type": "error", "model": mid, "error": str(e)})

                await asyncio.gather(*[
                    stream_compare(mid) for mid in model_ids if mid in MODEL_REGISTRY
                ])

            # ── Debate: round-robin, each model sees the full thread ──────
            elif data["type"] == "debate":
                topic: str = data["topic"]
                model_ids: list[str] = data["models"]
                max_turns: int = min(int(data.get("max_turns", 6)), 20)

                # Shared log of (model_id, full_text) visible to all models
                debate_log: list[tuple[str, str]] = []

                for turn_idx in range(max_turns):
                    mid = model_ids[turn_idx % len(model_ids)]

                    if not debate_log:
                        user_msg = (
                            f"The debate topic is: {topic}\n\n"
                            "Make your opening argument. Be direct and concise."
                        )
                    else:
                        history = "\n\n".join(
                            f"[{MODEL_REGISTRY[prev_mid].label}]: {text}"
                            for prev_mid, text in debate_log
                        )
                        user_msg = (
                            f"Debate topic: {topic}\n\n"
                            f"Debate so far:\n{history}\n\n"
                            "Your turn. Respond directly to the previous point. "
                            "Advance the debate, don't repeat what's been said."
                        )

                    system = (
                        f"You are {MODEL_REGISTRY[mid].label}, participating in a debate. "
                        "Take a clear position, be direct, and push back when you disagree. "
                        "Do not introduce yourself — just argue."
                        + verbosity_suffix(verbosity)
                    )

                    await websocket.send_json({
                        "type": "debate_turn_start",
                        "model": mid,
                        "turn": turn_idx + 1,
                    })

                    try:
                        adapter = MODEL_REGISTRY[mid](max_tokens=max_tokens)
                        full_text = ""
                        async for chunk in adapter.stream(
                            messages=[{"role": "user", "content": user_msg}],
                            system=system,
                        ):
                            full_text += chunk
                            await websocket.send_json({
                                "type": "debate_chunk",
                                "model": mid,
                                "turn": turn_idx + 1,
                                "text": chunk,
                            })
                        debate_log.append((mid, full_text))
                        await websocket.send_json({
                            "type": "debate_turn_done",
                            "model": mid,
                            "turn": turn_idx + 1,
                        })
                    except Exception as e:
                        await websocket.send_json({"type": "error", "model": mid, "error": str(e)})
                        break

                await websocket.send_json({"type": "debate_done"})

            # ── PR Review: all models review the diff simultaneously ──────
            elif data["type"] == "pr_review":
                diff: str = data["diff"]
                model_ids: list[str] = data.get("models", list(MODEL_REGISTRY.keys()))

                review_prompt = (
                    "You are a senior software engineer doing a code review. "
                    "Review the following PR diff. Identify security issues, bugs, and suggested improvements. "
                    "Be specific. Use bullet points."
                    + verbosity_suffix(verbosity)
                    + f"\n\n```diff\n{diff}\n```"
                )

                async def stream_review(mid: str):
                    try:
                        adapter = MODEL_REGISTRY[mid](max_tokens=max_tokens)
                        async for chunk in adapter.stream(
                            messages=[{"role": "user", "content": review_prompt}],
                        ):
                            await websocket.send_json({"type": "chunk", "model": mid, "text": chunk})
                        await websocket.send_json({"type": "done", "model": mid})
                    except Exception as e:
                        await websocket.send_json({"type": "error", "model": mid, "error": str(e)})

                await asyncio.gather(*[
                    stream_review(mid) for mid in model_ids if mid in MODEL_REGISTRY
                ])

    except WebSocketDisconnect:
        pass
