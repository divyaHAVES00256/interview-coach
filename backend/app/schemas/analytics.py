# schemas/analytics.py — 5 Pydantic v2 response shapes that define exactly what the API returns
from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, ConfigDict


class ScoreTrendPoint(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    session_id: int
    date: str          # started_at formatted as "YYYY-MM-DD"
    overall_score: float
    domain: str
    difficulty: str


class DomainStat(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    domain: str
    session_count: int
    avg_score: Optional[float] = None   # None if no scored answers


class DifficultyStat(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    difficulty: str
    session_count: int
    avg_score: Optional[float] = None


class DimensionAverages(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    technical_accuracy: Optional[float] = None
    clarity: Optional[float] = None
    star_alignment: Optional[float] = None
    completeness: Optional[float] = None


class AnalyticsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total_sessions: int
    scored_sessions: int                        # sessions with ≥1 scored answer
    avg_overall: Optional[float] = None
    best_score: Optional[float] = None
    dimensions: DimensionAverages
    score_trend: list[ScoreTrendPoint]          # ordered by date ascending
    by_domain: list[DomainStat]                 # ordered by session_count desc
    by_difficulty: list[DifficultyStat]