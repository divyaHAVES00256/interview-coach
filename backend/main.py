# main.py — FastAPI application entry point.
# CHANGES from Phase 2: Added auth router registration.

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.db.database import engine
from app.models import Base  # all models
from app.api.v1.endpoints.auth import router as auth_router # auth router 

settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: verify database is reachable
    try:
        with engine.connect() as connection:
            print("✅ Database connection verified")
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        raise  

    yield  # Server runs here, accepting requests

    # Shutdown Server
    print("🔄 Shutting down...")

# creates backend application
app = FastAPI(
    title=settings.APP_NAME,
    debug=settings.DEBUG,
    lifespan=lifespan,
)

# CORS 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], 
    allow_credentials=True,                  # allow cookies
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── ROUTERS ──────────────────────────────────────────────────────────────────

app.include_router(
    auth_router,
    prefix="/api/v1/auth",
    tags=["Authentication"],
)

# # You'll add more routers here in later phases:
# # app.include_router(interview_router, prefix="/api/v1/interviews", tags=["Interviews"])


# # ── Health Check ─────────────────────────────────────────────────────────────

@app.get("/api/v1/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok", "app": settings.APP_NAME}