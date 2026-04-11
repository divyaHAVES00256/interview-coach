"""
Smoke-test endpoints — delete this file after Phase 1 verification.
"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/ping")
async def ping():
    return {"message": "pong", "status": "backend is working"}


@router.get("/cors-check")
async def cors_check():
    # If the frontend browser can call this without an error,
    # it proves CORS headers are configured correctly.
    return {"cors": "ok", "frontend_can_reach_backend": True}