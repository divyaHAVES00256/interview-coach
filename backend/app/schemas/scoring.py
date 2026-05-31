# backend/app/schemas/scoring.py
# Pydantic v2 style schemas for the answers + results endpoints

from typing import Optional
from pydantic import BaseModel, ConfigDict


# Request / Response for POST /api/v1/answers
class AnswerSubmitRequest(BaseModel):
    """
    Frontend sends this when the user stops recording
    """
    question_id: int
    transcript: str
    audio_duration: float


class AnswerSubmitResponse(BaseModel):
    """
    Returned immediately after the Answer row is created
    """
    answer_id: int
    processing_status: str          


# Score response (used by both the poll endpoint and results page)
class ScoreResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    answer_id: int
    technical_accuracy: float
    clarity: float
    star_alignment: float
    completeness: float
    overall_score: float
    strengths_json: list[str]       
    improvements_json: list[str]
    ideal_answer: str
    follow_up_question: str


# Answer response (used inside SessionResultsResponse)
class AnswerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    question_id: int
    transcript: str
    audio_duration: Optional[float]
    filler_word_count: Optional[int]
    processing_status: str
    attempt_number: int


#  Nested triple used inside SessionResultsResponse 
class QuestionResult(BaseModel):
    """
    One row on the results page = one question + its answer + its score
    """
    model_config = ConfigDict(from_attributes=True)

    question_id: int
    question_text: str
    order_index: int
    question_type: str
    answer: Optional[AnswerResponse] = None
    score: Optional[ScoreResponse] = None


#  Top-level results response 
class SessionResultsResponse(BaseModel):
    """
    Everything the results page needs in one round trip
    """
    model_config = ConfigDict(from_attributes=True)

    session_id: int
    domain: str
    difficulty: str
    company_mode: Optional[str]
    status: str
    results: list[QuestionResult]