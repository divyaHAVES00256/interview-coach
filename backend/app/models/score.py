# score.py — AI-generated evaluation of one answer
# stores the OUTPUT from LangChain + Ollama scoring pipeline
from sqlalchemy import Column, Integer, Float, Text, ForeignKey
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.sql import func
from sqlalchemy import DateTime
from sqlalchemy.orm import relationship
from app.db.database import Base


class Score(Base):
    __tablename__ = "scores"

    id = Column(Integer, primary_key=True, index=True)

    # fk to answers
    answer_id = Column(Integer, ForeignKey("answers.id"), nullable=False, unique=True, index=True)

    # correct tech knowledge?
    technical_accuracy = Column(Float, nullable=True)

    # well structured or rambling?
    clarity = Column(Float, nullable=True)

    # (Situation, Task, Action, Result) -> for behavioral ques?
    star_alignment = Column(Float, nullable=True)

    # covered all imp topics?
    completeness = Column(Float, nullable=True)

    # total score
    overall_score = Column(Float, nullable=True)
    
    # feedback
    # a) what explained good
    strengths_json = Column(JSON, nullable=True)
    # b) what is missing
    improvements_json = Column(JSON, nullable=True)

    # ai gen strong ans
    ideal_answer = Column(Text, nullable=True)

    # follow-up question the interviewer might ask based on this answer 
    follow_up_question = Column(Text, nullable=True)

    # when ai gen score (good for celery)
    scored_at = Column(DateTime(timezone=True), nullable=True)

    # 1 ans -> 1 score 
    answer = relationship("Answer", back_populates="score")

    def __repr__(self):
        return f"<Score id={self.id} answer_id={self.answer_id} overall={self.overall_score}>"