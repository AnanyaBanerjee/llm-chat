"""
Example: Claude vs GPT-4o debating AI safety.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from dialogue import LLMDialogue

dialogue = LLMDialogue(
    claude_system=(
        "You are Claude, debating AI safety with another AI. "
        "You favor cautious, incremental deployment and robust alignment research "
        "before scaling further. Be direct and concise — 2-3 sentences per turn."
    ),
    openai_system=(
        "You are GPT-4o, debating AI safety with another AI. "
        "You believe accelerating capabilities research is the best path to safe AI, "
        "and that over-regulation stifles progress. Be direct and concise — 2-3 sentences per turn."
    ),
)

dialogue.run(
    seed="Should AI labs voluntarily slow down capabilities research to let safety research catch up?",
    turns=4,
)
