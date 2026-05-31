# backend/app/tasks/scoring_task.py
# Celery task for scoring an interview answer asynchronously.

import logging

from app.db.database import SessionLocal
from app.models.answer import Answer
from app.models.question import Question
from app.models.score import Score
from app.services.scoring import OllamaScorer
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(
    name="app.tasks.scoring_task.score_answer_task",
)
def score_answer_task(answer_id: int) -> dict:
    db = SessionLocal()

    try:
        # 1. Load the Answer row
        answer = db.query(Answer).filter(Answer.id == answer_id).first()

        if not answer:
            logger.error("score_answer_task: Answer %d not found.", answer_id)
            return {"status": "error", "reason": "answer_not_found"}

        # Guard against re-processing
        if answer.processing_status == "scored":
            logger.info(
                "score_answer_task: Answer %d already scored, skipping.", answer_id
            )
            return {"status": "already_scored"}
        
        # 2. Mark as "scoring" so the frontend shows a loading state
        answer.processing_status = "scoring"
        db.commit()
        logger.info("score_answer_task: Scoring answer %d ...", answer_id)

        # 3. Fetch the question text (we need it for the scoring prompt)
        question = (
            db.query(Question)
            .filter(Question.id == answer.question_id)
            .first()
        )

        question_text = question.question_text if question else "Unknown question"

        # 4. Run OllamaScorer — this is the slow step (30-90s on CPU)
        scorer = OllamaScorer()
        result = scorer.score(
            question_text=question_text,
            transcript=answer.transcript or "",
        )

        # 5. Persist the Score row
        score = Score(
            answer_id=answer_id,
            technical_accuracy=result.technical_accuracy,
            clarity=result.clarity,
            star_alignment=result.star_alignment,
            completeness=result.completeness,
            overall_score=result.overall_score,
            strengths_json=result.strengths,       
            improvements_json=result.improvements,
            ideal_answer=result.ideal_answer,
            follow_up_question=result.follow_up_question,
        )
        db.add(score)

        # 6. Mark Answer as "scored" — the frontend poll will see this
        answer.processing_status = "scored"
        db.commit()

        logger.info(
            "score_answer_task: Answer %d scored. Overall: %.1f",
            answer_id,
            result.overall_score,
        )
        return {"status": "scored", "overall_score": result.overall_score}

    except Exception as exc:
        logger.exception(
            "score_answer_task: Unexpected error scoring answer %d: %s",
            answer_id,
            exc,
        )
        try:
            answer = db.query(Answer).filter(Answer.id == answer_id).first()
            if answer:
                answer.processing_status = "failed"
                db.commit()
        except Exception:
            db.rollback()

        return {"status": "failed", "reason": str(exc)}

    finally:
        db.close()