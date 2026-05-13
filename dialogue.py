from __future__ import annotations

import anthropic
import openai


class LLMDialogue:
    def __init__(
        self,
        claude_system: str,
        openai_system: str,
        claude_model: str = "claude-sonnet-4-6",
        openai_model: str = "gpt-4o",
        max_tokens: int = 1024,
    ):
        self.claude = anthropic.Anthropic()
        self.openai = openai.OpenAI()
        self.claude_system = claude_system
        self.openai_system = openai_system
        self.claude_model = claude_model
        self.openai_model = openai_model
        self.max_tokens = max_tokens
        self.claude_history: list[dict] = []
        self.openai_history: list[dict] = []

    def _ask_claude(self, message: str) -> str:
        self.claude_history.append({"role": "user", "content": message})
        resp = self.claude.messages.create(
            model=self.claude_model,
            max_tokens=self.max_tokens,
            system=self.claude_system,
            messages=self.claude_history,
        )
        reply = resp.content[0].text
        self.claude_history.append({"role": "assistant", "content": reply})
        return reply

    def _ask_openai(self, message: str) -> str:
        self.openai_history.append({"role": "user", "content": message})
        resp = self.openai.chat.completions.create(
            model=self.openai_model,
            max_tokens=self.max_tokens,
            messages=[{"role": "system", "content": self.openai_system}]
            + self.openai_history,
        )
        reply = resp.choices[0].message.content
        self.openai_history.append({"role": "assistant", "content": reply})
        return reply

    def run(self, seed: str, turns: int = 4, stop_fn=None) -> list[dict]:
        """
        Run a dialogue. Claude speaks first, OpenAI responds, repeat for `turns` rounds.

        stop_fn: optional callable(reply: str) -> bool. If it returns True after any
                 reply, the loop ends early. Useful for consensus detection.

        Returns the full transcript as a list of dicts:
            [{"speaker": "Claude" | "OpenAI", "turn": int, "text": str}, ...]
        """
        transcript: list[dict] = []
        current = seed
        divider = "─" * 60

        print(f"[Seed]\n{seed}\n{divider}")

        for i in range(turns):
            # Claude's turn
            claude_reply = self._ask_claude(current)
            transcript.append({"speaker": "Claude", "turn": i + 1, "text": claude_reply})
            print(f"[Claude #{i + 1}]\n{claude_reply}\n{divider}")

            if stop_fn and stop_fn(claude_reply):
                print("[Stopped early: consensus reached after Claude's reply]")
                break

            # OpenAI's turn
            openai_reply = self._ask_openai(claude_reply)
            transcript.append({"speaker": "OpenAI", "turn": i + 1, "text": openai_reply})
            print(f"[OpenAI #{i + 1}]\n{openai_reply}\n{divider}")

            if stop_fn and stop_fn(openai_reply):
                print("[Stopped early: consensus reached after OpenAI's reply]")
                break

            current = openai_reply

        return transcript
