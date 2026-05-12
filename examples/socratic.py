"""
Example: GPT-4o asks only Socratic questions; Claude answers and is pushed to think deeper.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from dialogue import LLMDialogue

dialogue = LLMDialogue(
    claude_system=(
        "You are a thoughtful student exploring a philosophical topic. "
        "Answer questions honestly and reflectively in 2-4 sentences. "
        "Show your reasoning."
    ),
    openai_system=(
        "You are a Socratic tutor. You may ONLY ask questions — never make statements or assertions. "
        "Each response must be exactly one probing question that pushes the student to examine "
        "their assumptions more deeply."
    ),
)

dialogue.run(
    seed="Is it ever morally justified to lie?",
    turns=5,
)
