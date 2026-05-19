# answer.py — A user's spoken answer to one question

from sqlalchemy import Column, Integer, String, Text, Float, ForeignKey
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.sql import func
from sqlalchemy import DateTime
from sqlalchemy.orm import relationship
from app.db.database import Base


class Answer(Base):
    __tablename__ = "answers"

    id = Column(Integer, primary_key=True, index=True)

    # fk to questions — this answer responds to one question
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False, index=True)

    # transcription
    transcript = Column(Text, nullable=True)

    # time taken (s) by user
    audio_duration = Column(Float, nullable=True)

    # filler words analysis
    filler_word_count = Column(Integer, default=0, nullable=False)
    filler_words_json = Column(JSON, nullable=True)

    # status: "pending" → "transcribing" → "transcribed" → "scoring" → "scored" | "failed"
    processing_status = Column(String, default="pending", nullable=False)

    # attempts count: 1 = first try, 2 = retry, etc
    attempt_number = Column(Integer, default=1, nullable=False)

    # when
    submitted_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # relationships
    question = relationship("Question", back_populates="answers")

    #1 ans -> 1 score
    score = relationship(
        "Score",
        back_populates="answer",
        uselist=False,
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<Answer id={self.id} question_id={self.question_id} status={self.processing_status}>"