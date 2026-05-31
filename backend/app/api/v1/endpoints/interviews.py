# backend/app/api/v1/endpoints/interviews.py
# REST endpoints for creating, fetching, and ending interview sessions

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Any

from app.db.database import get_db
from app.dependencies import get_current_user
from app.models.user import User 
from app.models.interview_session import InterviewSession
from app.models.question import Question
from app.models.answer import Answer
from app.models.score import Score
from app.schemas.interview import (
    EndInterviewRequest,
    InterviewSessionResponse,
    InterviewStartRequest,
    QuestionResponse,
    SessionListItem,
)
from app.services.question_bank import get_questions_for_session

router = APIRouter()

#  GET /api/v1/interviews — list all sessions for current use
@router.get(
    "",
    response_model=list[SessionListItem],
)
def list_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[SessionListItem]:
    """
    Returns all sessions for the current user, newest first
    """
    sessions = (
        db.query(InterviewSession)
        .filter(InterviewSession.user_id == current_user.id)
        .order_by(InterviewSession.started_at.desc())
        .all()
    )
 
    result: list[SessionListItem] = []
 
    for session in sessions:
        # JOIN path: Score → Answer → Question → session_id
        avg_score = (
            db.query(func.avg(Score.overall_score))
            .join(Answer, Score.answer_id == Answer.id)
            .join(Question, Answer.question_id == Question.id)
            .filter(Question.session_id == session.id)
            .scalar()
        )
 
        result.append(
            SessionListItem(
                id=session.id,
                domain=session.domain,
                difficulty=session.difficulty,
                status=session.status,
                started_at=session.started_at,
                overall_score=round(float(avg_score), 1) if avg_score is not None else None,
            )
        )
 
    return result

# POST /api/v1/interviews/start
@router.post(
    "/start",
    response_model=InterviewSessionResponse,
    status_code=status.HTTP_201_CREATED,
)
def start_interview(
    body: InterviewStartRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    #step 1: Create a new InterviewSession AND pre-populate its questions
    session = InterviewSession(
        user_id=current_user.id,
        domain=body.domain,
        company_mode=body.company_mode,
        difficulty=body.difficulty.value,   
        status="in_progress",
        started_at=datetime.now(timezone.utc),
    )
    # Add sesion to db
    db.add(session)
    db.flush() # writes to DB, generates session.id, stays in transaction

    # Step 2: fetch questions from the bank
    raw_questions = get_questions_for_session(
        domain=body.domain,
        difficulty=body.difficulty,
        count=5,
    )

    if not raw_questions:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not load questions for this domain. Please try again.",
        )
    
    # Step 3: create Question ORM objects/rows
    question_objs: list[Question] = []
    for index, q in enumerate(raw_questions):
        question_obj = Question(
            session_id=session.id,
            question_text=q["text"],
            question_type=q["type"],
            order_index=index,       # 0-based ordering
            is_follow_up=False,      # Phase 5 — follow-ups come in Phase 6
        )
        db.add(question_obj)
        question_objs.append(question_obj)

    # Step 4: commit everything atomically and refresh
    db.commit()
    db.refresh(session)
    for q_obj in question_objs:
        db.refresh(q_obj)

    # Manually attach questions
    session.questions = question_objs

    return session


# GET /api/v1/interviews/{session_id}
@router.get(
    "/{session_id}", 
    response_model=InterviewSessionResponse
)
def get_interview(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    
    # Fetch a session by ID
    session = (
        db.query(InterviewSession)
        .filter(
            InterviewSession.id == session_id,
            InterviewSession.user_id == current_user.id,
        )
        .first()
    )

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or does not belong to you",
        )

    # Eagerly load questions so the response_model can serialize them
    questions = (
        db.query(Question)
        .filter(Question.session_id == session_id)
        .order_by(Question.order_index)
        .all()
    )
    session.questions = questions

    return session


# PATCH /api/v1/interviews/{session_id}/end
@router.patch(
    "/{session_id}/end", 
    response_model=InterviewSessionResponse
)
def end_interview(
    session_id: int,
    body: EndInterviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    
    # Mark the session as completed 
    session = (
        db.query(InterviewSession)
        .filter(
            InterviewSession.id == session_id,
            InterviewSession.user_id == current_user.id,
        )
        .first()
    )

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

     # Idempotent — ending an already-ended session is fine: earlier we raised error of "Already completed"
    if session.status == "completed":
        questions = (
            db.query(Question)
            .filter(Question.session_id == session_id)
            .order_by(Question.order_index)
            .all()
        )
        session.questions = questions
        return session

    session.status = "completed"
    session.ended_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(session)

    questions = (
        db.query(Question)
        .filter(Question.session_id == session_id)
        .order_by(Question.order_index)
        .all()
    )
    session.questions = questions

    return session