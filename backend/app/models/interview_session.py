# interview_session.py — Tracks a single interview session
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base
import enum


class SessionStatus(str, enum.Enum):
    PENDING = "pending"         
    IN_PROGRESS = "in_progress" 
    COMPLETED = "completed"     
    ABANDONED = "abandoned"     


class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(Integer, primary_key=True, index=True)

    # foreign Key
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True) #User  →  InterviewSession

    # interview config 
    domain = Column(String, nullable=False)
    company_mode = Column(String, nullable=True)

    # difficulty level 
    difficulty = Column(String, default="medium", nullable=False)

    # status 
    status = Column(
        Enum(SessionStatus),
        default=SessionStatus.PENDING,
        nullable=False,
    )

    # timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=True)
    ended_at = Column(DateTime(timezone=True), nullable=True)

    # relationships 
    user = relationship("User", back_populates="sessions")

    questions = relationship(
        "Question",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="Question.order_index",
    )

    def __repr__(self):
        return f"<InterviewSession id={self.id} user_id={self.user_id} status={self.status}>"