from __future__ import annotations
import asyncio
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

            if data["type"] == "ask":
                task: str = data["task"]
                model_ids: list[str] = data.get("models", list(MODEL_REGISTRY.keys()))
                system: str = data.get("system", "You are a helpful assistant. Be concise.")

                async def stream_one(mid: str):
                    try:
                        adapter = MODEL_REGISTRY[mid]()
                        async for chunk in adapter.stream(
                            messages=[{"role": "user", "content": task}],
                            system=system,
                        ):
                            await websocket.send_json({"type": "chunk", "model": mid, "text": chunk})
                        await websocket.send_json({"type": "done", "model": mid})
                    except Exception as e:
                        await websocket.send_json({"type": "error", "model": mid, "error": str(e)})

                await asyncio.gather(*[stream_one(mid) for mid in model_ids if mid in MODEL_REGISTRY])

            elif data["type"] == "compare":
                task: str = data.get("task", "")
                responses: dict[str, str] = data["responses"]
                model_ids: list[str] = data.get("models", list(responses.keys()))

                others_summary = "\n\n".join(
                    f"**{MODEL_REGISTRY[mid].label}**: {text}"
                    for mid, text in responses.items()
                    if mid in MODEL_REGISTRY
                )
                compare_prompt = (
                    f"You and other AI models all answered the same question:\n\n"
                    f"> {task}\n\n"
                    f"Here are all responses:\n\n{others_summary}\n\n"
                    "Where do you agree with the others? Where do you disagree, and why? "
                    "What's missing from the collective answer? Be direct, 3-5 sentences."
                )

                async def stream_compare(mid: str):
                    my_response = responses.get(mid, "")
                    system = (
                        f"You are {MODEL_REGISTRY[mid].label}. "
                        "You are comparing notes with other AI models in a council."
                    )
                    try:
                        adapter = MODEL_REGISTRY[mid]()
                        msgs = (
                            [
                                {"role": "user", "content": task},
                                {"role": "assistant", "content": my_response},
                                {"role": "user", "content": compare_prompt},
                            ]
                            if task
                            else [{"role": "user", "content": compare_prompt}]
                        )
                        async for chunk in adapter.stream(messages=msgs, system=system):
                            await websocket.send_json({"type": "compare_chunk", "model": mid, "text": chunk})
                        await websocket.send_json({"type": "compare_done", "model": mid})
                    except Exception as e:
                        await websocket.send_json({"type": "error", "model": mid, "error": str(e)})

                await asyncio.gather(*[stream_compare(mid) for mid in model_ids if mid in MODEL_REGISTRY])

    except WebSocketDisconnect:
        pass
