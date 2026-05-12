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
