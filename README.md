# Model Syndicate

**Run experiments across multiple LLMs simultaneously.** Debate topics, compare outputs side-by-side, and get independent code reviews — all from a single local interface.

![Model Syndicate UI](docs/screenshot.png)

---

## What is it?

Model Syndicate is a local research tool that lets you pit AI models against each other or compare their answers on any task. Instead of switching between ChatGPT, Claude, and others manually, you run them all at once and watch them respond — or argue — in real time.

It has two layers:

- **Web UI** — a browser-based interface for interactive experiments with Claude, GPT-4o, DeepSeek, and Grok
- **Python API** — a lightweight `LLMDialogue` class for scripted two-model conversations you can run from the terminal or integrate into your own code

---

## What can you do with it?

**Compare how different models think**
Ask the same question to all four models and read their answers side by side. Useful for spotting where models agree, where they diverge, and which one gives the clearest answer for your use case.

**Run structured debates**
Give models a topic and let them argue it out turn by turn, each seeing what the others have said. Great for stress-testing an idea, exploring tradeoffs, or just watching Claude and GPT-4o disagree about thermodynamics.

**Get multi-model code reviews**
Paste a PR diff and get independent reviews from each model simultaneously. Different models catch different things — one might flag a security issue another misses.

**Run scripted dialogue experiments**
Use the Python API to set up custom two-model conversations with full control over system prompts, turn limits, and conversation seeds. Build debate pipelines, peer-review loops, or Socratic dialogues in a few lines of code.

---

## Modes

### Compare Output
All selected models answer the same task at the same time. Responses stream into side-by-side cards.

### Debate
Models argue a topic in round-robin order — each turn, the active model sees the full debate history before responding. Set a turn limit (2–20) to control cost.

### PR Review
Paste a unified diff. Every selected model reviews it independently and streams its findings into its own card. No cross-model influence — pure independent review.

---

## Setup

### Prerequisites

- Python 3.9+
- Node.js 18+
- API keys for the models you want to use

### 1. Clone the repo

```bash
git clone https://github.com/your-username/llm-chat.git
cd llm-chat
```

### 2. Install Python dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure API keys

Copy the example env file and fill in your keys:

```bash
cp .env.example .env
```

```ini
# .env
ANTHROPIC_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
DEEPSEEK_API_KEY=your_key_here   # optional
GROK_API_KEY=your_key_here       # optional
```

| Model | Key | Get it at |
|---|---|---|
| Claude | `ANTHROPIC_API_KEY` | console.anthropic.com |
| GPT-4o | `OPENAI_API_KEY` | platform.openai.com |
| DeepSeek | `DEEPSEEK_API_KEY` | platform.deepseek.com |
| Grok | `GROK_API_KEY` | console.x.ai |

Models with missing keys show an error card — the others still work.

### 4. Start the backend

```bash
python -m uvicorn council.server:app --host 127.0.0.1 --port 8765 --reload
```

### 5. Start the frontend

```bash
cd frontend
npm install   # first time only
npm run dev
```

### 6. Open in your browser

```
http://localhost:5173
```

---

## Python API

For scripted experiments without the UI, use `LLMDialogue` directly:

```python
from dialogue import LLMDialogue

d = LLMDialogue(
    claude_system="You are Claude. Argue that open-source AI is safer.",
    openai_system="You are GPT-4o. Argue that closed-source AI is safer.",
)

transcript = d.run(
    seed="Is open-source or closed-source AI development safer for humanity?",
    turns=4,
)
```

`run()` prints the conversation live and returns a typed transcript:

```python
[
    {"speaker": "Claude", "turn": 1, "text": "..."},
    {"speaker": "OpenAI", "turn": 1, "text": "..."},
    ...
]
```

Stop early when a condition is met using `stop_fn`:

```python
transcript = d.run(
    seed="...",
    turns=10,
    stop_fn=lambda reply: "[[CONSENSUS]]" in reply,
)
```

### Built-in examples

```bash
python examples/debate.py        # Claude vs GPT-4o on AI safety
python examples/peer_review.py   # Claude writes, GPT-4o critiques, repeat
python examples/socratic.py      # GPT-4o asks Socratic questions, Claude answers
python examples/identity_chat.py # Claude and GPT-4o talk knowing who the other is
python examples/pr_review.py     # Both models review a PR diff, then discuss
```

### Parameters

| Parameter | Default | Description |
|---|---|---|
| `claude_model` | `claude-sonnet-4-6` | Any Anthropic model ID |
| `openai_model` | `gpt-4o` | Any OpenAI chat model ID |
| `max_tokens` | `1024` | Max tokens per reply |
| `turns` | `4` | Number of back-and-forth rounds |
| `stop_fn` | `None` | Optional early-exit callback |

---

## Architecture

```
llm-chat/
├── dialogue.py          # LLMDialogue — two-model scripted conversations
├── examples/            # Ready-to-run experiment scripts
├── council/
│   ├── models.py        # Async adapters for Claude, GPT-4o, DeepSeek, Grok
│   └── server.py        # FastAPI + WebSocket backend (compare / debate / PR review)
└── frontend/            # React + Vite UI (TypeScript + Tailwind)
```

The backend and frontend communicate over a single persistent WebSocket. All model calls are async — in Compare and PR Review modes, all selected models stream in parallel.

---

## .env.example

```ini
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
DEEPSEEK_API_KEY=
GROK_API_KEY=
```
