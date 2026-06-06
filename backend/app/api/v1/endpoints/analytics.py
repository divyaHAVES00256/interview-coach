from __future__ import annotations

from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct

from app.db.database import get_db
from app.dependencies import get_current_user
from app.models.interview_session import InterviewSession
from app.models.question import Question
from app.models.answer import Answer
from app.models.score import Score
from app.schemas.analytics import (
    AnalyticsResponse,
    DimensionAverages,
    ScoreTrendPoint,
    DomainStat,
    DifficultyStat,
)

router = APIRouter()


@router.get("", response_model=AnalyticsResponse)
def get_analytics(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AnalyticsResponse:
    user_id: int = current_user.id

    # ── 1. total_sessions ────────────────────────────────────────────────────
    total_sessions: int = (
        db.query(func.count(InterviewSession.id))
        .filter(InterviewSession.user_id == user_id)
        .scalar()
        or 0
    )

    # ── 2. Base join: sessions → questions → answers → scores ────────────────
    # Re-usable join path that scopes everything to the current user
    base_q = (
        db.query(Score)
        .join(Answer, Answer.id == Score.answer_id)
        .join(Question, Question.id == Answer.question_id)
        .join(InterviewSession, InterviewSession.id == Question.session_id)
        .filter(InterviewSession.user_id == user_id)
    )

    # ── 3. scored_sessions ───────────────────────────────────────────────────
    scored_sessions: int = (
        db.query(func.count(distinct(Question.session_id)))
        .join(Answer, Answer.question_id == Question.id)
        .join(Score, Score.answer_id == Answer.id)
        .join(InterviewSession, InterviewSession.id == Question.session_id)
        .filter(InterviewSession.user_id == user_id)
        .scalar()
        or 0
    )

    # ── 4. avg_overall + best_score ──────────────────────────────────────────
    agg_row = base_q.with_entities(
        func.avg(Score.overall_score),
        func.max(Score.overall_score),
    ).one_or_none()

    avg_overall: Optional[float] = None
    best_score: Optional[float] = None
    if agg_row:
        avg_overall = float(agg_row[0]) if agg_row[0] is not None else None
        best_score = float(agg_row[1]) if agg_row[1] is not None else None

    # ── 5. dimensions ────────────────────────────────────────────────────────
    dim_row = base_q.with_entities(
        func.avg(Score.technical_accuracy),
        func.avg(Score.clarity),
        func.avg(Score.star_alignment),
        func.avg(Score.completeness),
    ).one_or_none()

    dimensions = DimensionAverages(
        technical_accuracy=float(dim_row[0]) if dim_row and dim_row[0] is not None else None,
        clarity=float(dim_row[1]) if dim_row and dim_row[1] is not None else None,
        star_alignment=float(dim_row[2]) if dim_row and dim_row[2] is not None else None,
        completeness=float(dim_row[3]) if dim_row and dim_row[3] is not None else None,
    )

    # ── 6. score_trend ───────────────────────────────────────────────────────
    # Per-session average overall score for sessions with ≥1 Score.
    trend_rows = (
        db.query(
            InterviewSession.id,
            InterviewSession.started_at,
            InterviewSession.domain,
            InterviewSession.difficulty,
            func.avg(Score.overall_score).label("avg_score"),
        )
        .join(Question, Question.session_id == InterviewSession.id)
        .join(Answer, Answer.question_id == Question.id)
        .join(Score, Score.answer_id == Answer.id)
        .filter(InterviewSession.user_id == user_id)
        .group_by(
            InterviewSession.id,
            InterviewSession.started_at,
            InterviewSession.domain,
            InterviewSession.difficulty,
        )
        .order_by(InterviewSession.started_at.asc())
        .limit(30)
        .all()
    )

    score_trend: list[ScoreTrendPoint] = [
        ScoreTrendPoint(
            session_id=row.id,
            date=row.started_at.strftime("%Y-%m-%d") if isinstance(row.started_at, datetime) else str(row.started_at)[:10],
            overall_score=float(row.avg_score),
            domain=row.domain or "",
            difficulty=row.difficulty or "",
        )
        for row in trend_rows
        if row.avg_score is not None
    ]

    # ── 7. by_domain ─────────────────────────────────────────────────────────
    domain_rows = (
        db.query(
            InterviewSession.domain,
            func.count(InterviewSession.id).label("session_count"),
            func.avg(Score.overall_score).label("avg_score"),
        )
        .outerjoin(Question, Question.session_id == InterviewSession.id)
        .outerjoin(Answer, Answer.question_id == Question.id)
        .outerjoin(Score, Score.answer_id == Answer.id)
        .filter(InterviewSession.user_id == user_id)
        .group_by(InterviewSession.domain)
        .order_by(func.count(InterviewSession.id).desc())
        .all()
    )

    by_domain: list[DomainStat] = [
        DomainStat(
            domain=row.domain or "unknown",
            session_count=row.session_count,
            avg_score=float(row.avg_score) if row.avg_score is not None else None,
        )
        for row in domain_rows
    ]

    # ── 8. by_difficulty ─────────────────────────────────────────────────────
    difficulty_rows = (
        db.query(
            InterviewSession.difficulty,
            func.count(InterviewSession.id).label("session_count"),
            func.avg(Score.overall_score).label("avg_score"),
        )
        .outerjoin(Question, Question.session_id == InterviewSession.id)
        .outerjoin(Answer, Answer.question_id == Question.id)
        .outerjoin(Score, Score.answer_id == Answer.id)
        .filter(InterviewSession.user_id == user_id)
        .group_by(InterviewSession.difficulty)
        .order_by(func.count(InterviewSession.id).desc())
        .all()
    )

    by_difficulty: list[DifficultyStat] = [
        DifficultyStat(
            difficulty=row.difficulty or "unknown",
            session_count=row.session_count,
            avg_score=float(row.avg_score) if row.avg_score is not None else None,
        )
        for row in difficulty_rows
    ]

    # ── 9. Assemble response ─────────────────────────────────────────────────
    return AnalyticsResponse(
        total_sessions=total_sessions,
        scored_sessions=scored_sessions,
        avg_overall=avg_overall,
        best_score=best_score,
        dimensions=dimensions,
        score_trend=score_trend,
        by_domain=by_domain,
        by_difficulty=by_difficulty,
    )