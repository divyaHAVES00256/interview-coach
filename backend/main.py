# main.py — FastAPI application entry point

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from app.db.database import engine, Base
from app.models import User, InterviewSession, Question, Answer, Score
from app.core.config import get_settings

# set up logging so we can see what's happening at startup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up AI Interview Coach API...")
    logger.info(f"Environment: {settings.APP_ENV}")

    try:
        # create all tables that don't exist yet
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Database tables created/verified successfully")
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
        raise 

    yield 

    logger.info("Shutting down AI Interview Coach API...")


# create the FastAPI app with lifespan
app = FastAPI(
    title="AI Interview Coach API",
    version="0.2.0",
    description="Backend API for AI-powered interview practice platform",
    lifespan=lifespan,
)

# CORS Middleware (unchanged from Phase 1)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# routes
@app.get("/health")
def health_check():
    """Health check endpoint — verifies API is running."""
    return {
        "status": "healthy",
        "version": "0.2.0",
        "environment": settings.APP_ENV,
    }


@app.get("/")
def root():
    return {"message": "AI Interview Coach API", "docs": "/docs"}


from app.api.v1.endpoints import test
app.include_router(test.router, prefix="/api/v1")