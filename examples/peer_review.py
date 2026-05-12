"""
Example: Claude writes, GPT-4o critiques, repeat.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from dialogue import LLMDialogue

dialogue = LLMDialogue(
    claude_system=(
        "You are a technical writer. When given a topic or a critique, write or revise "
        "a clear, concise explanation of that topic (3-4 sentences). "
        "When revising, acknowledge the critique briefly before your improved version."
    ),
    openai_system=(
        "You are a rigorous editor. When given a piece of writing, identify the single "
        "most important thing to improve — clarity, accuracy, structure, or tone — "
        "and explain concisely what should change and why (2-3 sentences). "
        "Do not rewrite the passage yourself."
    ),
)

dialogue.run(
    seed="Write a short explanation of how transformer attention works.",
    turns=3,
)
