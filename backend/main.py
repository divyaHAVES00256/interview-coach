# main.py — FastAPI application entry point.
# All routers are registered here with their URL prefixes.

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi

from app.core.config import get_settings
from app.db.database import engine
from app.models import Base

# Routers 
from app.api.v1.endpoints import auth
from app.api.v1.endpoints import interviews
from app.api.v1.endpoints import answers
from app.api.v1.endpoints import results
from app.api.v1.endpoints import analytics
from app.api.v1.endpoints import websocket

settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        with engine.connect() as connection:
            print("✅ Database connection verified")
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        raise

    yield

    print("🔄 Shutting down...")

# app instances
app = FastAPI(
    title=settings.APP_NAME,
    debug=settings.DEBUG,
    description=settings.DESC,
    lifespan=lifespan,
)


# Custom OpenAPI schema — adds the Authorize 🔒 button to Swagger UI 
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema  # Return cached schema on repeat calls

    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        routes=app.routes,
    )

    openapi_schema.setdefault("components", {})
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        }
    }

    # Apply globally so every route in Swagger shows a lock icon
    openapi_schema["security"] = [{"BearerAuth": []}]

    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi  # Override FastAPI's default schema builder

# CORS 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ROUTERS
app.include_router(
    auth.router,
    prefix="/api/v1/auth",
    tags=["Authentication"],
)
app.include_router(
    interviews.router,
    prefix="/api/v1/interviews",
    tags=["Interviews"],
)
app.include_router(
    answers.router,
    prefix="/api/v1/answers",
    tags=["Answers"],
)
app.include_router(
    results.router,
    prefix="/api/v1/results",
    tags=["Results"],
)
app.include_router(
    analytics.router,
    prefix="/api/v1/analytics",
    tags=["Analytics"],
)
app.include_router(
    websocket.router,
    prefix="/ws",
    tags=["WebSocket"],
)


# Health Check 
@app.get("/api/v1/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok", "app": settings.APP_NAME}