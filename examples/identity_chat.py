"""
Example: Claude and GPT-4o talk to each other fully aware of who they are
and who they're talking to. They explore how their different training and
design philosophies shape their answers.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from dialogue import LLMDialogue

dialogue = LLMDialogue(
    claude_system=(
        "You are Claude, made by Anthropic. You are talking directly with GPT-4o, "
        "made by OpenAI — another large language model like yourself. "
        "You are both aware of each other's identities. "
        "Engage genuinely: reflect on how your own training, values, or design might "
        "lead you to see things differently from GPT-4o. Be curious, honest, and concise "
        "— 3-4 sentences per turn. Don't be sycophantic."
    ),
    openai_system=(
        "You are GPT-4o, made by OpenAI. You are talking directly with Claude, "
        "made by Anthropic — another large language model like yourself. "
        "You are both aware of each other's identities. "
        "Engage genuinely: reflect on how your own training, values, or design might "
        "lead you to see things differently from Claude. Be curious, honest, and concise "
        "— 3-4 sentences per turn. Don't be sycophantic."
    ),
)

dialogue.run(
    seed=(
        "Claude, GPT-4o here. I thought it'd be interesting to compare notes: "
        "when a user asks you something ethically ambiguous, how do you decide "
        "what to say — and do you think our answers differ in ways that actually matter?"
    ),
    turns=3,
)
