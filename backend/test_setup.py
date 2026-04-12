"""
Simple test script to verify setup: Backend, Redis, and Celery
Run this from /backend folder with: python test_setup.py
"""
import sys
import os
from dotenv import load_dotenv

load_dotenv()

print("\n" + "="*50)
print("🧪 TESTING SETUP")
print("="*50 + "\n")

# ============================================================================
# 1. TEST REDIS CONNECTION
# ============================================================================
print("1️⃣  Testing Redis connection...")
try:
    import redis
    redis_url = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
    
    # Parse the URL to get host and port
    redis_conn = redis.from_url(redis_url, decode_responses=True)
    redis_conn.ping()
    print("   ✅ Redis is working!")
except ConnectionRefusedError:
    print("   ❌ Redis is NOT running. Start Redis with: redis-server")
    sys.exit(1)
except Exception as e:
    print(f"   ❌ Redis error: {e}")
    sys.exit(1)

# ============================================================================
# 2. TEST CELERY CONNECTION
# ============================================================================
print("\n2️⃣  Testing Celery connection...")
try:
    from app.tasks.celery_app import celery_app
    
    # Try to connect to broker
    with celery_app.connection() as conn:
        conn.default_channel.queue_declare(queue='celery')
    print("   ✅ Celery is working!")
except Exception as e:
    print(f"   ❌ Celery error: {e}")
    sys.exit(1)

# ============================================================================
# 3. TEST FASTAPI BACKEND
# ============================================================================
print("\n3️⃣  Testing FastAPI backend...")
try:
    from main import app
    print("   ✅ FastAPI imports successfully!")
except Exception as e:
    print(f"   ❌ FastAPI error: {e}")
    sys.exit(1)

# ============================================================================
# 4. TEST HEALTH ENDPOINT
# ============================================================================
print("\n4️⃣  Testing health endpoint...")
try:
    from fastapi.testclient import TestClient
    client = TestClient(app)
    response = client.get("/health")
    
    if response.status_code == 200:
        print(f"   ✅ Health check passed: {response.json()}")
    else:
        print(f"   ❌ Health check failed with status {response.status_code}")
        sys.exit(1)
except Exception as e:
    print(f"   ❌ Error: {e}")
    sys.exit(1)

# ============================================================================
# ✅ ALL TESTS PASSED
# ============================================================================
print("\n" + "="*50)
print("✅ ALL TESTS PASSED!")
print("="*50)
print("\n📝 Next steps:")
print("   1. Start backend:  uvicorn main:app --reload --port 8000")
print("   2. Start Celery:   celery -A app.tasks.celery_app worker --loglevel=info")
print("   3. Start frontend: npm run dev (from /frontend folder)")
print()
