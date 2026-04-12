"""
Simple test endpoint for smoke testing
"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/ping")
async def ping():
    """Simple endpoint to test API is working"""
    return {"message": "pong"}
