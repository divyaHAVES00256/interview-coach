# backend/app/schemas/interview.py
# Pydantic v2 schemas for interview session data validation
# validate incoming requests and shape outgoing responses.

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class DifficultyLevel(str, Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"


# ── Request schemas (client → server) ────────────────────────────────────────

class InterviewStartRequest(BaseModel):
    domain: str = Field(
        ...,
        examples=["backend", "frontend", "ml", "system_design", "dsa"],
        description="The technical domain for this interview session",
    )
    company_mode: Optional[str] = Field(
        default=None,
        examples=["google", "amazon", None],
        description="Optional: tailor questions to a specific company's style",
    )
    difficulty: DifficultyLevel = DifficultyLevel.medium


# ── Response schemas (server → client) ───────────────────────────────────────

class InterviewSessionResponse(BaseModel):
    id: int
    user_id: int
    domain: str
    company_mode: Optional[str]
    difficulty: str
    status: str
    started_at: Optional[datetime]
    ended_at: Optional[datetime]

    model_config = {"from_attributes": True}


# ── WebSocket message schemas (server → client) ───────────────────────────────

class WSTranscriptMessage(BaseModel):
    type: str = "transcript"
    text: str                       # transcribed speech text
    is_final: bool = True           # for future streaming (partial) transcripts
    chunk_index: int                # which audio chunk this came from


class WSStatusMessage(BaseModel):
    type: str = "status"
    status: str                     # "connected" | "processing" | "idle"
    message: Optional[str] = None


class WSErrorMessage(BaseModel):
    type: str = "error"
    code: str                       
    message: str                    