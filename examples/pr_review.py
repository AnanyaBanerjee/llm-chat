"""
Example: Claude and GPT-4o each independently review a PR, then compare
notes until they reach consensus or hit 10 turns.

How it works:
  Phase 1 — Independent review: each model sees only the diff and gives
             its own verdict (no influence from the other).
  Phase 2 — Discussion: both reviews are shared with both models, and
             they debate until they agree or reach 10 turns.

To use your own PR: replace PR_DIFF below with any unified diff string.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import anthropic
import openai
from dialogue import LLMDialogue

# ── Swap this out for any real PR diff ───────────────────────────────────────
PR_DIFF = """
diff --git a/auth.py b/auth.py
--- a/auth.py
+++ b/auth.py
@@ -12,8 +12,12 @@ def login(username, password):
     user = db.get_user(username)
-    if user and user.password == password:
+    if user and user.password == hash_password(password):
         return generate_token(user)
     return None

+def hash_password(password):
+    import hashlib
+    return hashlib.md5(password.encode()).hexdigest()
+
"""
# ─────────────────────────────────────────────────────────────────────────────

REVIEW_PROMPT = (
    "You are a senior software engineer. Review the following PR diff. "
    "List security issues, bugs, and suggested improvements. Be specific and concise.\n\n"
    f"PR diff:\n```\n{PR_DIFF}\n```"
)

DIVIDER = "─" * 60


# ── Phase 1: independent reviews ─────────────────────────────────────────────
print("=" * 60)
print("PHASE 1: Independent reviews (models don't see each other yet)")
print("=" * 60 + "\n")

claude_client = anthropic.Anthropic()
openai_client = openai.OpenAI()

claude_review = claude_client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=512,
    messages=[{"role": "user", "content": REVIEW_PROMPT}],
).content[0].text

print(f"[Claude's review]\n{claude_review}\n{DIVIDER}")

openai_review = openai_client.chat.completions.create(
    model="gpt-4o",
    max_tokens=512,
    messages=[{"role": "user", "content": REVIEW_PROMPT}],
).choices[0].message.content

print(f"[GPT-4o's review]\n{openai_review}\n{DIVIDER}")


# ── Phase 2: discussion until consensus ──────────────────────────────────────
print("\n" + "=" * 60)
print("PHASE 2: Comparing notes (up to 10 turns)")
print("=" * 60 + "\n")

DISCUSS_SYSTEM = (
    "You are {name}, made by {org}. "
    "You and {other} (made by {other_org}) have both independently reviewed the same PR. "
    "Your goal is to compare findings, resolve any disagreements, and converge on a "
    "shared final verdict. Be direct — 3-5 sentences per turn. "
    "When you genuinely agree with the other reviewer and have nothing new to add, "
    "end your message with exactly: [[CONSENSUS]]"
)

dialogue = LLMDialogue(
    claude_system=DISCUSS_SYSTEM.format(
        name="Claude", org="Anthropic", other="GPT-4o", other_org="OpenAI"
    ),
    openai_system=DISCUSS_SYSTEM.format(
        name="GPT-4o", org="OpenAI", other="Claude", other_org="Anthropic"
    ),
    max_tokens=512,
)

seed = (
    f"Hi Claude, GPT-4o here. I've reviewed the PR and here's what I found:\n\n"
    f"{openai_review}\n\n"
    f"I see you noted:\n\n{claude_review}\n\n"
    f"Where do we agree, and where should we push back on each other?"
)

transcript = dialogue.run(
    seed=seed,
    turns=10,
    stop_fn=lambda reply: "[[CONSENSUS]]" in reply,
)

print(f"\nDiscussion ended after {len(transcript)} messages.")
