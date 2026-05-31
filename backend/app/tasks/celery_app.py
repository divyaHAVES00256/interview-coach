"""
celery_app.py — Creates and configures the Celery instance.

Celery is a task queue: instead of making the user wait for slow operations
(like AI transcription or feedback generation), we hand the work off to a
background worker and return immediately.

This file just creates the Celery object. Actual tasks will be defined
in separate files (transcription.py, feedback.py) in Phase 3+.
"""
import os
from celery import Celery
from dotenv import load_dotenv
from app.core.config import get_settings

load_dotenv()  # reads your .env file so we can use os.getenv()

settings = get_settings()

# The first argument is just a name for this Celery app — use your project name.
# broker = where tasks are sent (Redis queue)
# backend = where task results are stored (also Redis)
celery_app = Celery(
    "interview_coach",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

# Optional Celery settings
celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    # How long to keep task results in Redis (1 hour)
    result_expires=3600,
)

#autodiscover_tasks is unreliable on Windows when tasks are in submodules
#hence explicitly import task modules so Celery registers them on startup
# celery_app.autodiscover_tasks(["app.tasks"]) 
import app.tasks.scoring_task 