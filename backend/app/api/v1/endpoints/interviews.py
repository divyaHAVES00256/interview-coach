# backend/app/api/v1/endpoints/interviews.py
# REST endpoints for creating, fetching, and ending interview sessions

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.db.database import get_db
from app.dependencies import get_current_user
from app.models.user import User 
from app.models.interview_session import InterviewSession

from app.schemas.interview import InterviewStartRequest, InterviewSessionResponse

router = APIRouter()

@router.post(
    "/start",
    response_model=InterviewSessionResponse,
    status_code=status.HTTP_201_CREATED,
)
def start_interview(
    body: InterviewStartRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Create a new InterviewSession row 
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
    db.commit()
    db.refresh(session)  
    return session


@router.get("/{session_id}", response_model=InterviewSessionResponse)
def get_interview(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    
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

    return session


@router.patch("/{session_id}/end", response_model=InterviewSessionResponse)
def end_interview(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    
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

    # Guard against ending a session that's already done
    if session.status != "in_progress":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot end a session with status '{session.status}'. "
                   "Only 'in_progress' sessions can be ended.",
        )

    session.status = "completed"
    session.ended_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(session)
    return session