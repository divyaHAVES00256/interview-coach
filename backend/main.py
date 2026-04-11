"""
main.py — FastAPI entry point.
Run from the /backend folder with: uvicorn main:app --reload --port 8000
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.api.v1.endpoints import test


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("✅ Server starting up...")
    yield
    print("🛑 Server shutting down...")


app = FastAPI(title="AI Interview Coach API", version="0.1.0", lifespan=lifespan)

# IMPORTANT: middleware must be added BEFORE routers, otherwise
# the browser's preflight OPTIONS request won't get CORS headers.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(test.router, prefix="/api/v1/test", tags=["smoke-test"])


@app.get("/health", tags=["system"])
async def health_check():
    return {"status": "healthy"}