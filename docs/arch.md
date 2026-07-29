# Architecture

Model Syndicate has two independent halves that share nothing but a naming
convention (model `id`s like `claude`, `gpt4o`, `deepseek`, `grok`):

1. **Web app** — FastAPI backend + React/Vite frontend, driven over a single WebSocket.
2. **Python API** — `LLMDialogue`, a standalone class for scripted two-model conversations. Not used by the web app.

## Web app

```
frontend/src/App.tsx  ──ws──►  council/server.py  ──►  council/models.py  ──►  Anthropic / OpenAI-compatible SDKs
      │                              │
      └─ localStorage-free UI        └─ FastAPI: GET /models, WS /ws/council
         state machine (idle/                 (only 2 routes total)
         running/done per mode)
```

### Backend (`council/`)

- `server.py` — the entire API surface: `GET /models` (lists the registry for
  the model-picker UI) and one WebSocket, `/ws/council`. The socket is a
  long-lived loop: each inbound JSON message is a self-contained request
  (`{"type": "compare" | "debate" | "pr_review", ...}`), handled inline, with
  results streamed back as a sequence of typed JSON frames
  (`chunk`/`done`/`error`, or the `debate_turn_start`/`debate_chunk`/
  `debate_turn_done`/`debate_done` sequence for debates). No REST endpoints
  for the actual model calls — everything model-related goes over the socket
  so tokens can stream as they arrive.
- `models.py` — `MODEL_REGISTRY`, a dict of adapter classes keyed by id,
  populated via the `@_register` decorator. Each `LLMAdapter` subclass wraps
  one provider behind a single method: `stream(messages, system) -> AsyncIterator[str]`.
  `ClaudeAdapter` talks to `anthropic.AsyncAnthropic` directly; `GPT4oAdapter`
  wraps `openai.AsyncOpenAI` and is reused as-is for `DeepSeekAdapter` and
  `GrokAdapter` by pointing `base_url`/`api_key` at their OpenAI-compatible
  endpoints. Adding a provider means adding one adapter class here — nothing
  else changes.

### Frontend (`frontend/src/`)

- `App.tsx` owns all state: one WebSocket ref, per-mode phase (`idle` →
  `running` → `done`), and per-model card state (`text`/`status`/`error`).
  There's no router and no global store — three parallel mode branches
  (`compare`, `debate`, `pr_review`) live side by side in one component, each
  with its own state slices, gated by `mode`.
- The WS message handler is a single `switch` on `msg.type` that mutates the
  right state slice depending on `activeModeRef` (tracks which mode is
  "live" so late-arriving frames from a superseded request land correctly).
- `components/`: `ModeSelector` (tab switcher), `ModelSelector` (checkbox
  row), `TaskInput` (textarea + ⌘↵ submit), `ModelCard` (one streaming output
  card, used by compare + pr_review), `DebateThread` (chat-style transcript
  for debate mode, groups messages by turn/model).
- Verbosity ("short"/"medium"/"none") is a UI-only concept sent as a string
  in every WS payload; the backend maps it to a system-prompt suffix + a
  `max_tokens` cap (`server.py:35-50`).

### Request lifecycle (example: Compare)

1. User selects models + types a task → `submitCompare` sends
   `{type: "compare", task, models, verbosity}` over the WS.
2. `server.py` spins up one `stream_compare()` coroutine per model
   concurrently (`asyncio.gather`), each instantiating its adapter fresh and
   calling `.stream()`.
3. Each adapter yields text chunks as the provider streams them; the server
   re-emits each as a `{"type": "chunk", "model": id, "text": ...}` frame.
4. Frontend appends chunks into `compareCards[id].text` as they arrive; a
   `useEffect` flips the mode's phase to `"done"` once every selected model
   has reported `done` or `error`.

Debate differs only in that turns are sequential (round-robin over
`model_ids`) and every turn's prompt includes the full prior transcript
(`debate_log`), so later models see what earlier ones said — compare and
pr_review give each model the same prompt independently, with no cross-model
visibility.

## Python API (`dialogue.py`, `examples/`)

`LLMDialogue` is unrelated to the web app's adapter/registry system — it
talks to `anthropic.Anthropic` and `openai.OpenAI` (sync clients) directly,
keeps two separate message histories, and ping-pongs a single reply string
between Claude and GPT-4o via `run()`. `examples/*.py` are small scripts that
configure a `LLMDialogue` for a specific pattern (debate, peer review,
Socratic, PR review, "identity chat") and call `run()`. This path never
touches `council/`.

## Notable constraints

- No persistence — all state is in-memory (React state on the client,
  closures on the server). Refreshing the page or restarting the server
  loses everything.
- No auth — CORS is wide open (`allow_origins=["*"]`) and the WS accepts
  any connection; intended for local-only use.
- Debate turn count is server-clamped to 20 regardless of what the client
  requests (`server.py:78`).
