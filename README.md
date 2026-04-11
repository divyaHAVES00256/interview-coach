# 🎯 AI Interview Coach

An AI-powered mock interview platform where users speak their answers, get real-time transcription, and receive detailed AI-generated feedback with scores and improvement suggestions.

> **Status:** Phase 1 complete — project scaffold, local dev environment, and service connectivity verified.

---

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Local Setup](#local-setup)
- [Running the Project](#running-the-project)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Development Phases](#development-phases)

---

## Project Overview

AI Interview Coach helps students and job seekers prepare for placements by simulating real interviews. Users speak their answers aloud, and the platform:

1. Transcribes speech in real time using `faster-whisper`
2. Detects filler words ("um", "uh", "like") using `vosk`
3. Scores answers using a local LLM via `Ollama`
4. Generates improvement suggestions using a RAG pipeline (`LangChain` + `FAISS`)
5. Displays analytics — scores over time, filler word frequency, topic coverage

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), JavaScript, Tailwind CSS, shadcn/ui, Chart.js |
| Backend | Python FastAPI, WebSockets |
| Task Queue | Celery + Redis |
| Database | PostgreSQL (SQLAlchemy ORM) |
| Speech-to-Text | faster-whisper (local) |
| Filler Detection | vosk (local) |
| LLM / Scoring | Ollama — llama3.2 (local) |
| RAG Pipeline | LangChain + FAISS (local) |

> Everything runs locally — no cloud API costs during development.

---

## Project Structure

```
interview-coach/
├── .env                          # All environment variables (never commit this)
│
├── frontend/                     # Next.js 14 application
│   └── src/
│       ├── app/
│       │   ├── (auth)/
│       │   │   ├── login/
│       │   │   └── register/
│       │   ├── (dashboard)/
│       │   │   ├── dashboard/
│       │   │   ├── interview/[id]/
│       │   │   └── results/[id]/
│       │   ├── test/             # Phase 1 smoke test page (delete after setup)
│       │   ├── layout.js
│       │   └── page.js
│       ├── components/
│       │   ├── ui/               # shadcn/ui components
│       │   ├── interview/        # Mic recorder, transcript display
│       │   ├── dashboard/        # Stats cards, history list
│       │   └── charts/           # Chart.js wrappers
│       ├── lib/                  # Utility functions, auth helpers
│       ├── hooks/                # Custom React hooks
│       └── services/             # Axios wrappers for API calls
│
└── backend/                      # FastAPI application
    ├── venv/                     # Python virtual environment (never commit this)
    ├── main.py                   # FastAPI entry point
    ├── requirements.txt
    └── app/
        ├── api/
        │   └── v1/
        │       └── endpoints/    # auth.py, interviews.py, results.py
        ├── core/                 # config.py, security.py
        ├── db/                   # database.py, base.py
        ├── models/               # SQLAlchemy ORM models
        ├── schemas/              # Pydantic request/response schemas
        ├── services/             # Business logic layer
        ├── tasks/                # Celery task definitions
        │   └── celery_app.py     # Celery instance and config
        └── utils/                # Helper functions
```

---

## Prerequisites

Install these before setting up the project:

| Tool | Version | Purpose |
|---|---|---|
| Node.js | 18+ | Run Next.js frontend |
| Python | 3.10+ | Run FastAPI backend |
| PostgreSQL | 16 | Main database |
| Redis / Memurai | Latest | Celery broker + cache |
| Ollama | Latest | Local LLM inference |
| Git | Any | Version control |

### Windows-specific notes
- **Redis**: Use [Memurai](https://www.memurai.com/) (Redis-compatible, runs as a Windows service)
- **Celery**: Must use `--pool=solo` flag on Windows (multiprocessing limitation)
- **PowerShell execution policy**: Run `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` if venv activation is blocked

---

## Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/interview-coach.git
cd interview-coach
```

### 2. Set up environment variables

```bash
# Copy the example env file and fill in your values
cp .env.example .env
```

Generate a JWT secret key:
```bash
cd backend
python -c "import secrets; print(secrets.token_hex(32))"
# Paste the output into JWT_SECRET_KEY in your .env file
```

### 3. Backend setup

```bash
cd backend
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Mac/Linux)
source venv/bin/activate

pip install -r requirements.txt
```

Create all `__init__.py` files (Windows):
```bash
type nul > app\__init__.py
type nul > app\api\__init__.py
type nul > app\api\v1\__init__.py
type nul > app\api\v1\endpoints\__init__.py
type nul > app\core\__init__.py
type nul > app\db\__init__.py
type nul > app\models\__init__.py
type nul > app\schemas\__init__.py
type nul > app\services\__init__.py
type nul > app\tasks\__init__.py
type nul > app\utils\__init__.py
```

### 4. Frontend setup

```bash
cd frontend
npm install
```

### 5. Database setup

```bash
# In psql (PostgreSQL shell)
CREATE DATABASE interview_coach;
```

### 6. Pull the Ollama model

```bash
ollama pull llama3.2
```

---

## Running the Project

You need **4 terminals** running simultaneously:

### Terminal 1 — Redis
```bash
# If using Memurai on Windows, it runs as a service automatically.
# Just verify:
redis-cli ping
# Expected: PONG
```

### Terminal 2 — Backend (FastAPI)
```bash
cd interview-coach/backend
venv\Scripts\activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Terminal 3 — Celery Worker
```bash
cd interview-coach/backend
venv\Scripts\activate
celery -A app.tasks.celery_app worker --loglevel=info --pool=solo
```

> `--pool=solo` is required on Windows.

### Terminal 4 — Frontend (Next.js)
```bash
cd interview-coach/frontend
npm run dev
```

### Verify everything is running

| Service | URL / Command | Expected |
|---|---|---|
| PostgreSQL | `psql -U postgres -c "SELECT 1;"` | Returns `1` |
| Redis | `redis-cli ping` | `PONG` |
| FastAPI health | `http://localhost:8000/health` | `{"status":"healthy"}` |
| FastAPI docs | `http://localhost:8000/docs` | Swagger UI |
| Next.js | `http://localhost:3000` | Landing page |
| Smoke test | `http://localhost:3000/test` | All 3 cards green |
| Celery | Terminal 3 output | `celery@yourpc ready.` |

---

## Environment Variables

Create a `.env` file at the project root with these variables:

```env
# PostgreSQL
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/interview_coach
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_DB=interview_coach
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# Redis
REDIS_URL=redis://localhost:6379/0

# JWT Authentication
JWT_SECRET_KEY=your_generated_secret_here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Ollama (local LLM — no API key needed)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

# faster-whisper (local — no API key needed)
WHISPER_MODEL_SIZE=base
WHISPER_DEVICE=cpu
WHISPER_COMPUTE_TYPE=int8

# RAG Pipeline
FAISS_INDEX_PATH=./data/faiss_index
KNOWLEDGE_BASE_PATH=./data/knowledge_base

# App
APP_ENV=development
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
```

> ⚠️ Never commit `.env` to Git. It's already in `.gitignore`.

---

## API Reference

Full interactive docs available at `http://localhost:8000/docs` when the backend is running.

| Method | Endpoint | Description | Status |
|---|---|---|---|
| GET | `/health` | Server health check | ✅ Done |
| GET | `/api/v1/test/ping` | Smoke test ping | ✅ Done |
| GET | `/api/v1/test/cors-check` | CORS verification | ✅ Done |
| POST | `/api/v1/auth/register` | Register new user | 🔜 Phase 2 |
| POST | `/api/v1/auth/login` | Login, get JWT token | 🔜 Phase 2 |
| POST | `/api/v1/interviews/start` | Start a new session | 🔜 Phase 3 |
| GET | `/api/v1/interviews/{id}` | Get session details | 🔜 Phase 3 |
| GET | `/api/v1/results/{id}` | Get feedback + scores | 🔜 Phase 4 |
| WS | `/ws/transcribe/{session_id}` | Real-time transcription | 🔜 Phase 3 |

---

## Development Phases

| Phase | What gets built | Status |
|---|---|---|
| **Phase 1** | Project scaffold, local environment, service connectivity | ✅ Complete |
| **Phase 2** | PostgreSQL models, JWT authentication, user registration/login | 🔜 Next |
| **Phase 3** | WebSocket transcription, faster-whisper integration, live interview session | ⏳ Planned |
| **Phase 4** | Ollama scoring, filler word detection, feedback generation | ⏳ Planned |
| **Phase 5** | RAG pipeline, question bank, FAISS knowledge base | ⏳ Planned |
| **Phase 6** | Dashboard UI, Chart.js analytics, results page | ⏳ Planned |
| **Phase 7** | Polish, error handling, performance tuning | ⏳ Planned |

---

## .gitignore

Make sure your `.gitignore` at the project root includes:

```gitignore
# Environment
.env
.env.local
.env.*.local

# Python
backend/venv/
__pycache__/
*.pyc
*.pyo
*.pyd
.Python
*.egg-info/

# Node
frontend/node_modules/
frontend/.next/
frontend/out/

# Data (local AI model indexes)
backend/data/

# OS
.DS_Store
Thumbs.db
```

---

## Contributing

This is a BTech final year portfolio project. Built with guidance from Claude (Anthropic).

---

*Built by [Your Name] — BTech CSE, [Your College]*