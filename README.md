# 🎯 AI Interview Coach

An AI-powered mock interview platform where users speak their answers, get real-time transcription, and receive detailed AI-generated feedback with scores and improvement suggestions.

> **Status:** Phase 2 complete — PostgreSQL schema, SQLAlchemy ORM models, Alembic migrations, and environment configuration verified.

---

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Local Setup](#local-setup)
- [Running the Project](#running-the-project)
- [Environment Variables](#environment-variables)
- [Database Schema](#database-schema)
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
| Database | PostgreSQL (SQLAlchemy ORM + Alembic) |
| Speech-to-Text | faster-whisper (local) |
| Filler Detection | vosk (local) |
| LLM / Scoring | Ollama — llama3.2 (local) |
| RAG Pipeline | LangChain + FAISS (local) |

> Everything runs locally — no cloud API costs during development.

---

## Project Structure

```
interview-coach/
├── .env                              # All environment variables (never commit this)
├── .env.example                      # Template for environment variables
│
├── frontend/                         # Next.js 14 application
│   └── src/
│       ├── app/
│       │   ├── (auth)/
│       │   │   ├── login/            # page.js not created yet
│       │   │   └── register/         # page.js not created yet
│       │   ├── (dashboard)/
│       │   │   ├── dashboard/        # page.js not created yet
│       │   │   ├── interview/[id]/   # page.js not created yet
│       │   │   └── results/[id]/     # page.js not created yet
│       │   ├── layout.js
│       │   └── page.js
│       ├── components/
│       │   ├── ui/                   # shadcn/ui components
│       │   ├── interview/            # Mic recorder, transcript display
│       │   ├── dashboard/            # Stats cards, history list
│       │   └── charts/               # Chart.js wrappers
│       ├── lib/                      # Utility functions, auth helpers
│       ├── hooks/                    # Custom React hooks
│       └── services/                 # Axios wrappers for API calls
│
└── backend/                          # FastAPI application
    ├── venv/                         # Python virtual environment (never commit)
    ├── main.py                       # FastAPI entry point with DB startup
    ├── requirements.txt
    ├── alembic.ini                   # Alembic configuration
    ├── alembic/
    │   ├── env.py                    # Alembic environment (reads .env)
    │   └── versions/
    │       └── xxxx_initial_schema.py  # First migration — all 5 tables
    └── app/
        ├── api/
        │   └── v1/
        │       └── endpoints/        # auth.py, interviews.py (coming Phase 3)
        ├── core/
        │   └── config.py             # ✅ Pydantic BaseSettings from .env
        ├── db/
        │   └── database.py           # ✅ SQLAlchemy engine, session, Base
        ├── models/
        │   ├── __init__.py           # ✅ All models imported here
        │   ├── user.py               # ✅ User model
        │   ├── interview_session.py  # ✅ InterviewSession + SessionStatus enum
        │   ├── question.py           # ✅ Question model
        │   ├── answer.py             # ✅ Answer model
        │   └── score.py              # ✅ Score model
        ├── schemas/                  # Pydantic request/response schemas (Phase 3)
        ├── services/                 # Business logic layer (Phase 3)
        ├── tasks/
        │   └── celery_app.py         # ✅ Celery instance connected to Redis
        └── utils/                    # Helper functions
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
cp .env.example .env
```

Generate a secure JWT secret key:
```bash
cd backend
python -c "import secrets; print(secrets.token_hex(32))"
# Paste the output into JWT_SECRET_KEY in your .env file
```

### 3. Backend setup

```bash
cd backend
python -m venv venv

# Activate (Windows Git Bash)
source venv/Scripts/activate

# Activate (Windows Command Prompt)
venv\Scripts\activate

pip install -r requirements.txt
```

### 4. Frontend setup

```bash
cd frontend
npm install
```

### 5. Database setup

Open psql and run:
```sql
-- Create the database
CREATE DATABASE interview_coach;

-- Create a dedicated app user (don't use postgres superuser in apps)
CREATE USER interview_user WITH PASSWORD 'yourpassword';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE interview_coach TO interview_user;

-- Connect to the new database
\c interview_coach

-- Required for PostgreSQL 15+ — grants schema access
GRANT ALL ON SCHEMA public TO interview_user;

\q
```

### 6. Run database migrations

```bash
cd backend
alembic upgrade head
```

This creates all 5 tables: `users`, `interview_sessions`, `questions`, `answers`, `scores`.

Verify:
```bash
psql -U interview_user -d interview_coach
\dt
\q
```

### 7. Pull the Ollama model

```bash
ollama pull llama3.2
```

---

## Running the Project

You need **4 terminals** running simultaneously:

### Terminal 1 — Redis
```bash
# If using Memurai on Windows, it runs as a Windows service automatically.
# Verify it's running:
redis-cli ping
# Expected: PONG
```

### Terminal 2 — Backend (FastAPI)
```bash
cd interview-coach/backend
source venv/Scripts/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

On successful startup you should see:
```
✅ Database tables created/verified successfully
INFO: Application startup complete.
```

### Terminal 3 — Celery Worker
```bash
cd interview-coach/backend
source venv/Scripts/activate
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
| FastAPI health | `http://localhost:8000/health` | `{"status":"healthy","version":"0.2.0"}` |
| FastAPI docs | `http://localhost:8000/docs` | Swagger UI |
| Next.js | `http://localhost:3000` | Landing page |
| Celery | Terminal 3 output | `celery@yourpc ready.` |

---

## Environment Variables

Create a `.env` file at the **project root** (`interview-coach/.env`) with these variables:

```env
# PostgreSQL
DATABASE_URL=postgresql://interview_user:yourpassword@localhost:5432/interview_coach

# Redis
REDIS_URL=redis://localhost:6379/0

# JWT Authentication
JWT_SECRET_KEY=your_generated_secret_here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

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
DEBUG=True
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
```

> ⚠️ Never commit `.env` to Git. It is already in `.gitignore`.
>
> ⚠️ The `.env` file must live at the **project root** (`interview-coach/.env`), not inside `backend/`. The config uses an absolute path resolution so it works regardless of which directory you run commands from.

---

## Database Schema

All tables are managed by **Alembic** (database migration tool). Never modify the database manually — always change the SQLAlchemy model and run a new migration.

### Table Relationships

```
users (1)
  └──→ interview_sessions (many)
         └──→ questions (many)
                └──→ answers (many)
                       └──→ scores (one)
```

### Tables

**`users`**
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | Auto-increment |
| email | String | Unique, indexed |
| hashed_password | String | bcrypt hash — never plaintext |
| name | String | Display name |
| is_active | Boolean | Soft delete — deactivate instead of deleting |
| created_at | DateTime | Set by PostgreSQL server clock |
| updated_at | DateTime | Auto-updated on change |

**`interview_sessions`**
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| user_id | Integer FK | → users.id, indexed |
| domain | String | e.g. "Software Engineering" |
| company_mode | String | nullable — e.g. "Google" or None |
| difficulty | String | easy / medium / hard |
| status | Enum | pending / in_progress / completed / abandoned |
| started_at | DateTime | Set when user clicks Start |
| ended_at | DateTime | Set when session finishes |

**`questions`**
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| session_id | Integer FK | → interview_sessions.id |
| question_text | Text | Unlimited length |
| order_index | Integer | Position in session (0, 1, 2...) |
| question_type | String | technical / behavioral / system_design / hr |
| is_follow_up | Boolean | True if AI generated it from a previous answer |

**`answers`**
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| question_id | Integer FK | → questions.id |
| transcript | Text | Output from Whisper/Vosk |
| audio_duration | Float | Seconds spoken |
| filler_word_count | Integer | Total count |
| filler_words_json | JSON | e.g. `{"um": 4, "uh": 2, "like": 1}` |
| processing_status | String | pending → transcribing → scoring → scored |
| attempt_number | Integer | Supports retries (1 = first attempt) |

**`scores`**
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| answer_id | Integer FK | → answers.id, unique (one-to-one) |
| technical_accuracy | Float | 0.0 – 10.0 |
| clarity | Float | 0.0 – 10.0 |
| star_alignment | Float | 0.0 – 10.0 (STAR method for behavioral Qs) |
| completeness | Float | 0.0 – 10.0 |
| overall_score | Float | Weighted average |
| strengths_json | JSON | Array of strength strings |
| improvements_json | JSON | Array of improvement strings |
| ideal_answer | Text | AI-generated model answer |
| follow_up_question | Text | What the interviewer would ask next |

### Working with Migrations

```bash
# Every time you change a model file:
alembic revision --autogenerate -m "describe_what_changed"
alembic upgrade head

# Roll back the last migration if something goes wrong:
alembic downgrade -1

# See migration history:
alembic history
```

---

## API Reference

Full interactive docs at `http://localhost:8000/docs` when the backend is running.

| Method | Endpoint | Description | Status |
|---|---|---|---|
| GET | `/health` | Server health check | ✅ Done |
| GET | `/api/v1/test/ping` | Smoke test ping | ✅ Done |
| GET | `/api/v1/test/cors-check` | CORS verification | ✅ Done |
| POST | `/api/v1/auth/register` | Register new user | 🔜 Phase 3 |
| POST | `/api/v1/auth/login` | Login, get JWT token | 🔜 Phase 3 |
| GET | `/api/v1/auth/me` | Get current user | 🔜 Phase 3 |
| POST | `/api/v1/interviews/start` | Start a new session | 🔜 Phase 4 |
| GET | `/api/v1/interviews/{id}` | Get session details | 🔜 Phase 4 |
| GET | `/api/v1/results/{id}` | Get feedback + scores | 🔜 Phase 5 |
| WS | `/ws/transcribe/{session_id}` | Real-time transcription | 🔜 Phase 4 |

---

## Development Phases

| Phase | What gets built | Status |
|---|---|---|
| **Phase 1** | Project scaffold, local environment, service connectivity, CORS verified | ✅ Complete |
| **Phase 2** | PostgreSQL schema, SQLAlchemy ORM models, Alembic migrations, Pydantic config | ✅ Complete |
| **Phase 3** | JWT authentication — register, login, protected routes, frontend auth pages | 🔜 Next |
| **Phase 4** | Interview session API, WebSocket transcription, faster-whisper integration | ⏳ Planned |
| **Phase 5** | Ollama scoring, filler word detection, Celery async tasks, feedback generation | ⏳ Planned |
| **Phase 6** | RAG pipeline, LangChain + FAISS question bank | ⏳ Planned |
| **Phase 7** | Dashboard UI, Chart.js analytics, results page | ⏳ Planned |
| **Phase 8** | Polish, error handling, performance tuning | ⏳ Planned |

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

*Built by DIVYAꨄ — BTech CSE, Netaji Subhas University Of Technology, Delhi*