# backend/app/api/v1/endpoints/answers.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.answer import Answer
from app.models.score import Score
from app.models.question import Question
from app.models.interview_session import InterviewSession
from app.schemas.scoring import (
    AnswerSubmitRequest,
    AnswerSubmitResponse,
    ScoreResponse,
)
from app.tasks.scoring_task import score_answer_task

router = APIRouter()


#  POST /api/v1/answers 
#  create Answer row, fire Celery task
@router.post(
    "",
    response_model=AnswerSubmitResponse,
    status_code=status.HTTP_202_ACCEPTED,   # 202 = "accepted, processing later"
)
def submit_answer(
    body: AnswerSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AnswerSubmitResponse:
    """
    Called by the frontend right after the user stops recording
    """

    #  1. Ownership check 
    # We walk: Question → InterviewSession → user_id
    question = db.query(Question).filter(Question.id == body.question_id).first()
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Question {body.question_id} not found",
        )

    session = (
        db.query(InterviewSession)
        .filter(InterviewSession.id == question.session_id)
        .first()
    )
    if not session or session.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not own this interview session",
        )

    #  2. Create Answer row 
    existing_count = (
        db.query(Answer)
        .filter(Answer.question_id == body.question_id)
        .count()
    )

    answer = Answer(
        question_id=body.question_id,
        transcript=body.transcript,
        audio_duration=body.audio_duration,
        filler_word_count=0,            # vosk fills this in Phase 6
        filler_words_json=None,         # vosk fills this in Phase 6
        processing_status="pending",
        attempt_number=existing_count + 1,
    )
    db.add(answer)
    db.commit()
    db.refresh(answer)

    # 3. Fire Celery task (non-blocking) 
    # .delay() sends the job to Redis 
    score_answer_task.delay(answer.id)

    # 4. Return immediately 
    return AnswerSubmitResponse(
        answer_id=answer.id,
        processing_status=answer.processing_status,  # "pending"
    )


# GET /api/v1/answers/{answer_id}/score 
# poll until scored or failed
@router.get(
    "/{answer_id}/score",
)
def get_answer_score(
    answer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Frontend polls this every 3 seconds
    """

    # Ownership check 
    answer = db.query(Answer).filter(Answer.id == answer_id).first()
    if not answer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Answer {answer_id} not found",
        )

    # Walk back to session → verify user owns it
    question = db.query(Question).filter(Question.id == answer.question_id).first()
    session = (
        db.query(InterviewSession)
        .filter(InterviewSession.id == question.session_id)
        .first()
    )
    if not session or session.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not own this answer",
        )

    # Return based on current status 
    if answer.processing_status == "scored":
        score = (
            db.query(Score)
            .filter(Score.answer_id == answer_id)
            .first()
        )
        if not score:
            return {"processing_status": "scoring"}

        return ScoreResponse.model_validate(score)

    # For pending / scoring / failed — just return the status string.
    # The frontend only needs to know "keep polling" vs "stop polling".
    return {"processing_status": answer.processing_status}