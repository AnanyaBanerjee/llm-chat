# llm-chat

A minimal framework for running conversations between Claude and OpenAI models. Each model's output becomes the other's next input, with separate conversation histories maintained per model.

## Setup

**1. Clone and enter the repo**

```bash
cd ~/Desktop/repos/llm-chat
```

**2. Install dependencies**

```bash
pip install -r requirements.txt
```

**3. Set your API keys**

```bash
export ANTHROPIC_API_KEY=your_anthropic_key_here
export OPENAI_API_KEY=your_openai_key_here
```

Or copy `.env.example` to `.env` and fill in the values (use a tool like [`python-dotenv`](https://pypi.org/project/python-dotenv/) to load it).

For DeepSeek and Grok (optional — only needed for the Model Council UI):

```bash
export DEEPSEEK_API_KEY=your_deepseek_key_here
export GROK_API_KEY=your_grok_key_here
```

## Model Council UI

A local web UI that fans out any question to multiple LLMs simultaneously and lets them compare notes.

**1. Start the backend** (from the repo root)

```bash
pip install fastapi uvicorn   # first time only
python -m uvicorn council.server:app --host 127.0.0.1 --port 8765 --reload
```

**2. Start the frontend** (in a second terminal)

```bash
cd frontend
npm install   # first time only
npm run dev
```

**3. Open your browser at `http://localhost:5173`**

From there you can toggle which models to include, type a task, and hit **Ask Council**. All selected models stream their responses side-by-side. Once they've all answered, **Compare Notes** sends each model the full set of responses and asks it to react — streamed into a second section under each card.

Models with missing API keys will show an error card without affecting the others.

---

## Usage

**Run a built-in example**

```bash
python examples/debate.py       # Claude vs GPT-4o on AI safety
python examples/peer_review.py  # Claude writes, GPT-4o critiques, repeat
python examples/socratic.py     # GPT-4o asks Socratic questions, Claude answers
```

**Use `LLMDialogue` directly**

```python
from dialogue import LLMDialogue

d = LLMDialogue(
    claude_system="You are Claude. Be concise — 2-3 sentences per turn.",
    openai_system="You are GPT-4o. Be concise — 2-3 sentences per turn.",
)

transcript = d.run(
    seed="What is the most important unsolved problem in computer science?",
    turns=4,
)
```

`run()` prints the conversation live and returns a transcript:

```python
[
    {"speaker": "Claude", "turn": 1, "text": "..."},
    {"speaker": "OpenAI", "turn": 1, "text": "..."},
    ...
]
```

## How it works

```
[Seed message]
      │
      ▼
  Claude ──reply──► OpenAI ──reply──► Claude ──► ...
```

- Claude and OpenAI each maintain their **own message history** — neither model sees the other's system prompt or internal state.
- Claude always speaks first; OpenAI's last reply seeds the next round.
- The `seed` can be a question, a topic, a piece of text to review, or any opening prompt.

## Conversation patterns

| Pattern | How to set it up |
|---|---|
| Debate | Give them opposing system prompts |
| Peer review | One generates, one critiques |
| Socratic dialogue | One asks only questions, one answers |
| Co-authoring | Take turns writing sections of a document |
| Red team / Blue team | One attacks a plan, one defends it |

## Parameters

| Parameter | Default | Description |
|---|---|---|
| `claude_model` | `claude-sonnet-4-6` | Any Anthropic model ID |
| `openai_model` | `gpt-4o` | Any OpenAI chat model ID |
| `max_tokens` | `1024` | Max tokens per response |
| `turns` | `4` | Number of full back-and-forth rounds |
