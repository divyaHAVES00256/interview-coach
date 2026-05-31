# backend/app/services/scoring.py
"""
OllamaScorer — sends interview Q&A to a local Ollama instance for scoring.
"""

import json
import re
import logging
from dataclasses import dataclass, field
from typing import Any, Optional

import httpx

logger = logging.getLogger(__name__)

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "llama3.2"

# for long answers. Tune down if your machine is fast.
REQUEST_TIMEOUT_SECONDS = 120.0


# Data class for a clean, typed score result
@dataclass
class ScoreResult:
    technical_accuracy: float
    clarity: float
    star_alignment: float
    completeness: float
    overall_score: float
    strengths: list[str] = field(default_factory=list)
    improvements: list[str] = field(default_factory=list)
    ideal_answer: str = ""
    follow_up_question: str = ""



# Fallback score returned when Ollama is unreachable or returns garbage
def _fallback_score(reason: str) -> ScoreResult:
    logger.warning("Using fallback score. Reason: %s", reason)
    return ScoreResult(
        technical_accuracy=0.0,
        clarity=0.0,
        star_alignment=0.0,
        completeness=0.0,
        overall_score=0.0,
        strengths=["Could not evaluate — scoring service unavailable."],
        improvements=["Please ensure Ollama is running: `ollama serve`"],
        ideal_answer="Scoring unavailable.",
        follow_up_question="N/A",
    )

# JSON parsing helpers
def _safe_parse_json(raw_text: str) -> Optional[dict[str, Any]]:
    text = raw_text.strip()

    # Attempt 1: direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Attempt 2: strip markdown fences (```json ... ``` or ``` ... ```)
    fence_pattern = r"```(?:json)?\s*([\s\S]*?)\s*```"
    match = re.search(fence_pattern, text)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass

    # Attempt 3: find the first { ... } block in the text
    # This handles "Sure! Here is my evaluation: {...}"
    brace_pattern = r"\{[\s\S]*\}"
    match = re.search(brace_pattern, text)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass

    logger.error("Could not parse JSON from Ollama response. Raw text:\n%s", text[:500])
    return None


def _clamp(value: Any, lo: float = 0.0, hi: float = 10.0) -> float:
    """
    Ensures a score value is a float clamped between lo and hi.
    Guards against Ollama returning strings like "8/10" or values out of range.
    """
    try:
        return max(lo, min(hi, float(value)))
    except (TypeError, ValueError):
        return 5.0  # neutral fallback if unparseable


# Main scorer class
class OllamaScorer:

    def _build_prompt(self, question: str, transcript: str) -> str:
        return f"""You are an expert technical interviewer evaluating a candidate's spoken interview answer.

QUESTION ASKED:
{question}

CANDIDATE'S ANSWER (transcribed from speech):
{transcript if transcript.strip() else "[No answer was provided]"}

Evaluate the candidate's answer on these four dimensions, each scored 0 to 10:
- technical_accuracy: Is the technical content correct and well-explained?
- clarity: Is the answer clearly structured and easy to follow?
- star_alignment: Does the answer follow the STAR method (Situation, Task, Action, Result)? For purely technical answers, score based on structure.
- completeness: Does the answer fully address the question without major gaps?

Respond ONLY with a valid JSON object in this exact format. Do not include any text, explanation, or markdown before or after the JSON:

{{
  "technical_accuracy": <number 0-10>,
  "clarity": <number 0-10>,
  "star_alignment": <number 0-10>,
  "completeness": <number 0-10>,
  "overall_score": <average of the four scores above, rounded to one decimal>,
  "strengths": ["specific strength 1", "specific strength 2", "specific strength 3"],
  "improvements": ["specific improvement 1", "specific improvement 2", "specific improvement 3"],
  "ideal_answer": "A concise model answer that would score 9-10 on all dimensions.",
  "follow_up_question": "One follow-up question you would ask this candidate based on their answer."
}}"""

    def score(self, question_text: str, transcript: str) -> ScoreResult:
        #  Call Ollama and return a ScoreResul
        prompt = self._build_prompt(question_text, transcript)

        try:
            response = httpx.post(
                OLLAMA_URL,
                json={
                    "model": MODEL_NAME,
                    "prompt": prompt,
                    "stream": False,   # get the full response in one JSON blob
                },
                timeout=REQUEST_TIMEOUT_SECONDS,
            )
            response.raise_for_status()

        except httpx.ConnectError:
            return _fallback_score(
                "Cannot connect to Ollama. Is it running? Run: ollama serve"
            )
        except httpx.TimeoutException:
            return _fallback_score(
                f"Ollama timed out after {REQUEST_TIMEOUT_SECONDS}s. "
                "Try a shorter answer or increase REQUEST_TIMEOUT_SECONDS."
            )
        except httpx.HTTPStatusError as exc:
            return _fallback_score(f"Ollama returned HTTP {exc.response.status_code}")

        # The Ollama response JSON has a "response" key with the generated text
        try:
            ollama_payload = response.json()
            raw_text: str = ollama_payload.get("response", "")
        except Exception:
            return _fallback_score("Could not decode Ollama's outer response JSON.")

        # Parse the LLM's inner JSON (the actual score object)
        parsed = _safe_parse_json(raw_text)
        if parsed is None:
            return _fallback_score("LLM did not return parseable JSON.")

        # Extract and sanitize each field — never trust raw LLM output blindly
        ta = _clamp(parsed.get("technical_accuracy", 5))
        cl = _clamp(parsed.get("clarity", 5))
        sa = _clamp(parsed.get("star_alignment", 5))
        co = _clamp(parsed.get("completeness", 5))

        # Recalculate overall_score ourselves to guarantee correctness
        # (don't trust the model's arithmetic)
        overall = round((ta + cl + sa + co) / 4, 1)

        strengths = parsed.get("strengths", [])
        improvements = parsed.get("improvements", [])

        # Ensure these are lists of strings
        if not isinstance(strengths, list):
            strengths = [str(strengths)]
        if not isinstance(improvements, list):
            improvements = [str(improvements)]

        return ScoreResult(
            technical_accuracy=ta,
            clarity=cl,
            star_alignment=sa,
            completeness=co,
            overall_score=overall,
            strengths=[str(s) for s in strengths],
            improvements=[str(i) for i in improvements],
            ideal_answer=str(parsed.get("ideal_answer", "")),
            follow_up_question=str(parsed.get("follow_up_question", "")),
        )