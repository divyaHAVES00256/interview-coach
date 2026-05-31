# backend/app/api/v1/endpoints/results.py
# GET /api/v1/results/{session_id}
# Returns everything the results page needs in one request (questions, answer, score)

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.interview_session import InterviewSession
from app.models.question import Question
from app.models.answer import Answer
from app.models.score import Score
from app.schemas.scoring import (
    SessionResultsResponse,
    QuestionResult,
    AnswerResponse,
    ScoreResponse,
)

router = APIRouter()

@router.get(
    "/{session_id}",
    response_model=SessionResultsResponse,
)
def get_session_results(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SessionResultsResponse:
    #  1. Load session + ownership check 
    session = (
        db.query(InterviewSession)
        .filter(InterviewSession.id == session_id)
        .first()
    )
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found",
        )
    if session.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not own this session",
        )

    #  2. Load all questions ordered by order_index 
    questions = (
        db.query(Question)
        .filter(Question.session_id == session_id)
        .order_by(Question.order_index)
        .all()
    )

    #  3. For each question, find the latest answer + its score 
    results: list[QuestionResult] = []

    for q in questions:
        answer_orm = (
            db.query(Answer)
            .filter(Answer.question_id == q.id)
            .order_by(Answer.attempt_number.desc())
            .first()
        )

        answer_schema: AnswerResponse | None = None
        score_schema: ScoreResponse | None = None

        if answer_orm is not None:
            answer_schema = AnswerResponse.model_validate(answer_orm)

            # Only fetch score if the answer finished processing
            if answer_orm.processing_status == "scored":
                score_orm = (
                    db.query(Score)
                    .filter(Score.answer_id == answer_orm.id)
                    .first()
                )
                if score_orm:
                    score_schema = ScoreResponse.model_validate(score_orm)

        results.append(
            QuestionResult(
                question_id=q.id,
                question_text=q.question_text,
                order_index=q.order_index,
                question_type=q.question_type,
                answer=answer_schema,
                score=score_schema,
            )
        )

    # 4. Build and return the top-level response 
    return SessionResultsResponse(
        session_id=session.id,
        domain=session.domain,
        difficulty=session.difficulty,
        company_mode=session.company_mode,
        status=session.status,
        results=results,
    )