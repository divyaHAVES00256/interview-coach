<div align="center">

# 🎯 AI Interview Coach

### *Speak. Get scored. Get placed.*

An AI-powered mock interview platform where you speak your answers, get real-time transcription,
and receive detailed AI-generated feedback — all running **100% locally**, no cloud costs.

<br/>

![Phase](https://img.shields.io/badge/Phase-4%20Complete-success?style=for-the-badge&logo=checkmarx)
![Stack](https://img.shields.io/badge/Stack-Next.js%2014%20%2B%20FastAPI-blue?style=for-the-badge)
![DB](https://img.shields.io/badge/Database-PostgreSQL-336791?style=for-the-badge&logo=postgresql)
![AI](https://img.shields.io/badge/LLM-Ollama%20%28Local%29-black?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

<br/>

<img src="./docs/landing_page.png" alt="AI Interview Coach Landing Page" width="800" style="border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.2);" />

</div>

---

## 📋 Table of Contents

- [What This Project Does](#-what-this-project-does)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Local Setup](#-local-setup)
- [Running the Project](#-running-the-project)
- [Environment Variables](#-environment-variables)
- [Authentication Architecture](#-authentication-architecture)
- [WebSocket Architecture](#-websocket-architecture)
- [Database Schema](#-database-schema)
- [API Reference](#-api-reference)
- [Development Phases](#-development-phases)

---

## 🤔 What This Project Does

AI Interview Coach simulates a real placement interview. Here's what happens end to end:

```
You speak your answer
       ↓
faster-whisper transcribes it in real time (local, no cloud)
       ↓
vosk detects filler words ("um", "uh", "like")
       ↓
Ollama (llama3.2) scores your answer on 4 dimensions
       ↓
LangChain + FAISS retrieves relevant domain knowledge
       ↓
You get a score, ideal answer, and follow-up question
       ↓
Dashboard tracks your progress over time
```

Everything runs on your machine — no OpenAI, no cloud bills.

---

## 🛠 Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | Next.js 14 (App Router), JavaScript, Tailwind CSS | UI + routing |
| **Component Library** | shadcn/ui | Pre-built accessible components |
| **Charts** | Chart.js | Score analytics + progress graphs |
| **Backend** | Python FastAPI | REST API + WebSockets |
| **Auth** | JWT (python-jose) + bcrypt | Stateless authentication |
| **Task Queue** | Celery + Redis | Async transcription + scoring jobs |
| **Database** | PostgreSQL + SQLAlchemy ORM + Alembic | Persistent storage + migrations |
| **Speech-to-Text** | faster-whisper (local) | High-accuracy transcription |
| **Filler Detection** | vosk (local) | Real-time "um/uh/like" detection |
| **LLM / Scoring** | Ollama — llama3.2 (local) | Answer evaluation + ideal answers |
| **RAG Pipeline** | LangChain + FAISS (local) | Domain-specific question generation |
| **Audio Capture** | MediaRecorder API + Web Audio API | Browser mic recording + waveform |

> 💡 **Zero external API costs** — every AI component runs locally via Ollama.

---

## 📁 Project Structure

```
interview-coach/
├── .env                              # All secrets — NEVER commit this
├── .env.example                      # Safe template to share with teammates
│
├── frontend/                         # Next.js 14 application
│   ├── .env.local                    # Frontend JWT secret for middleware
│   └── src/
│       ├── middleware.js             # Protects /dashboard, /interview, /results
│       ├── app/
│       │   ├── api/
│       │   │   ├── auth/
│       │   │   │   ├── [action]/
│       │   │   │   │   └── route.js  # BFF proxy (login/register/logout/me/refresh)
│       │   │   │   └── token/
│       │   │   │       └── route.js  # ✅ NEW — Exposes JWT for WebSocket auth
│       │   │   └── v1/
│       │   │       └── [...path]/
│       │   │           └── route.js  # ✅ NEW — Generic BFF proxy → FastAPI /api/v1/*
│       │   ├── (auth)/
│       │   │   ├── login/
│       │   │   │   └── page.js       # Login form (shadcn/ui)
│       │   │   └── register/
│       │   │       └── page.js       # Register form (shadcn/ui)
│       │   ├── (dashboard)/
│       │   │   ├── dashboard/
│       │   │   │   └── page.js       # ✅ NEW — Start interview form
│       │   │   ├── interview/[id]/
│       │   │   │   └── page.js       # ✅ NEW — Live interview session page
│       │   │   └── results/[id]/     # page.js — Phase 5
│       │   ├── layout.js
│       │   └── page.js               # Landing page
│       ├── components/
│       │   ├── ui/                   # shadcn/ui primitives
│       │   ├── interview/
│       │   │   └── AudioRecorder.jsx # ✅ NEW — Waveform + controls component
│       │   ├── dashboard/            # Stats cards, history — Phase 5
│       │   └── charts/               # Chart.js wrappers — Phase 7
│       ├── hooks/
│       │   └── useAudioRecorder.js   # ✅ NEW — MediaRecorder + WebSocket hook
│       ├── lib/
│       │   ├── utils.js              # shadcn auto-generated
│       │   └── auth.js               # login(), register(), logout(), getMe()
│       └── services/
│           └── interviews.js         # ✅ NEW — startInterview(), getInterview(), endInterview()
│
└── backend/                          # FastAPI application
    ├── main.py                       # ✅ UPDATED — Interview + WebSocket routers registered
    ├── requirements.txt
    ├── alembic.ini
    ├── alembic/
    │   ├── env.py
    │   └── versions/
    │       └── xxxx_initial_schema.py
    └── app/
        ├── api/v1/endpoints/
        │   ├── auth.py               # register, login, me, logout, refresh
        │   ├── interviews.py         # ✅ NEW — start, get, end session routes
        │   └── websocket.py          # ✅ NEW — WS /ws/interview/{session_id}
        ├── core/
        │   ├── config.py             # Pydantic settings from .env
        │   └── security.py           # ✅ UPDATED — added decode_access_token()
        ├── db/
        │   └── database.py           # SQLAlchemy engine + get_db()
        ├── dependencies.py           # get_current_user() reusable dependency
        ├── models/                   # All 5 SQLAlchemy models
        ├── schemas/
        │   ├── user.py               # UserCreate, UserLogin, UserResponse, TokenResponse
        │   └── interview.py          # ✅ NEW — InterviewStartRequest, SessionResponse, WS message schemas
        ├── services/                 # Business logic — Phase 5
        ├── tasks/
        │   └── celery_app.py         # Celery + Redis
        └── utils/                    # Helper functions — Phase 5
```

---

## ✅ Prerequisites

| Tool | Version | Purpose | Windows Notes |
|---|---|---|---|
| Node.js | 18+ | Next.js frontend | — |
| Python | 3.10+ | FastAPI backend | — |
| PostgreSQL | 16 | Main database | — |
| Redis / Memurai | Latest | Celery broker | Use [Memurai](https://www.memurai.com/) on Windows |
| Ollama | Latest | Local LLM | — |
| **ffmpeg** | **Latest** | **WebM audio decoding for faster-whisper** | **Add `bin/` folder to System PATH. Verify with `ffmpeg -version`.** |
| Git | Any | Version control | — |

> ⚠️ **Windows PowerShell**: If `venv` activation is blocked, run:
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```

> ⚠️ **ffmpeg is required** for Phase 4 transcription. The browser sends audio as WebM/Opus — faster-whisper uses ffmpeg internally to decode it. Without ffmpeg in your PATH, all transcription calls will silently fail.

---

## 🚀 Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/interview-coach.git
cd interview-coach
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Generate a secure JWT secret (run this once, paste the output into `.env`):
```bash
cd backend
python -c "import secrets; print(secrets.token_hex(32))"
```

Copy the **same secret** into `frontend/.env.local`:
```bash
# frontend/.env.local
JWT_SECRET_KEY=paste_the_same_secret_here
```

> ⚠️ Both files must have the **exact same** `JWT_SECRET_KEY`. If they differ, every login will break at the middleware verification step.

### 3. Backend setup

```bash
cd backend
python -m venv venv

# Activate (Windows Git Bash)
source venv/Scripts/activate

# Activate (Windows CMD)
venv\Scripts\activate

pip install -r requirements.txt
```

### 4. Frontend setup

```bash
cd frontend
npm install
```

### 5. Database setup

Open `psql` and run:
```sql
CREATE DATABASE interview_coach;
CREATE USER interview_user WITH PASSWORD 'yourpassword';
GRANT ALL PRIVILEGES ON DATABASE interview_coach TO interview_user;
\c interview_coach
GRANT ALL ON SCHEMA public TO interview_user;
\q
```

### 6. Run database migrations

```bash
cd backend
alembic upgrade head
```

This creates all 5 tables: `users`, `interview_sessions`, `questions`, `answers`, `scores`.

### 7. Pull the Ollama model

```bash
ollama pull llama3.2
```

---

## ▶️ Running the Project

You need **4 terminals** running simultaneously:

### Terminal 1 — Redis
```bash
# Memurai runs as a Windows service — just verify it's alive:
redis-cli ping
# Expected output: PONG
```

### Terminal 2 — Backend (FastAPI)
```bash
cd interview-coach/backend
source venv/Scripts/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Healthy startup output:
```
✅ faster-whisper model loaded (tiny, int8)
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

> ⚠️ **First startup after Phase 4**: faster-whisper will download the `tiny` model (~75 MB) from HuggingFace automatically. This only happens once — subsequent startups are instant.

### Terminal 3 — Celery Worker
```bash
cd interview-coach/backend
source venv/Scripts/activate
celery -A app.tasks.celery_app worker --loglevel=info --pool=solo
```
> `--pool=solo` is **required** on Windows (multiprocessing limitation).

### Terminal 4 — Frontend (Next.js)
```bash
cd interview-coach/frontend
npm run dev
```

### ✅ Verify everything is running

| Service | Check | Expected |
|---|---|---|
| PostgreSQL | `psql -U postgres -c "SELECT 1;"` | Returns `1` |
| Redis | `redis-cli ping` | `PONG` |
| ffmpeg | `ffmpeg -version` | Version string (required for transcription) |
| FastAPI health | `http://localhost:8000/health` | `{"status":"ok","version":"0.4.0"}` |
| FastAPI docs | `http://localhost:8000/docs` | Swagger UI with Auth + Interviews + WebSocket groups |
| faster-whisper | Backend terminal on startup | `✅ faster-whisper model loaded (tiny, int8)` |
| Next.js | `http://localhost:3000` | Landing page |
| Register page | `http://localhost:3000/register` | Sign-up form |
| Login page | `http://localhost:3000/login` | Login form |
| Dashboard | `http://localhost:3000/dashboard` | Start Interview form (after login) |
| Interview page | `http://localhost:3000/interview/{id}` | Waveform + live transcript (after starting session) |
| Protected route | `http://localhost:3000/dashboard` (logged out) | Redirects to `/login` |
| Celery | Terminal 3 output | `celery@yourpc ready.` |

---

## 🔐 Authentication Architecture

Phase 3 introduced **JWT authentication** using a **BFF (Backend for Frontend)** pattern.

### Why BFF instead of direct API calls?

When the browser calls FastAPI on `:8000` from Next.js on `:3000`, cross-origin cookie rules make `httpOnly` cookies unreliable on localhost. The BFF pattern solves this cleanly:

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (:3000)                      │
│                                                             │
│   Submits form → fetch('/api/auth/login')   ← same origin   │
└────────────────────────┬────────────────────────────────────┘
                         │ Same origin (no CORS)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Next.js BFF Layer (:3000)                      │
│         src/app/api/auth/[action]/route.js                  │
│                                                             │
│   1. Forwards request to FastAPI                            │
│   2. Receives { access_token, refresh_token, user }         │
│   3. Sets httpOnly cookies on :3000 domain                  │
│   4. Returns only { user } to browser ← token stays hidden  │
└────────────────────────┬────────────────────────────────────┘
                         │ Server-to-server (no CORS issues)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  FastAPI Backend (:8000)                    │
│                                                             │
│   Verifies credentials → returns tokens in response body    │
└─────────────────────────────────────────────────────────────┘
```

### Phase 4 addition — Generic API Proxy

All interview REST calls also go through the BFF via a catch-all proxy route:

```
fetch('/api/v1/interviews/start')    ← frontend calls Next.js
        ↓
src/app/api/v1/[...path]/route.js    ← Next.js reads httpOnly cookie
        ↓
fetch('http://localhost:8000/api/v1/interviews/start', {
  headers: { Authorization: 'Bearer <token>' }   ← injected server-side
})
        ↓
FastAPI verifies token → returns response → proxied back to browser
```

This means the browser never touches `localhost:8000` directly for REST calls, and the token stays in an httpOnly cookie at all times.

### Token Security

| Property | Access Token | Refresh Token |
|---|---|---|
| **Lifetime** | 30 minutes | 7 days |
| **Storage** | `httpOnly` cookie | `httpOnly` cookie |
| **JS readable?** | ❌ Never (except via `/api/auth/token` for WS — see below) | ❌ Never |
| **Cookie path** | `/` (all routes) | `/api/auth/refresh` only |
| **Used for** | Every API call | Getting a new access token |

### Route Protection (Middleware)

`src/middleware.js` runs **before every page load** using Next.js Edge Runtime:

```
Request to /dashboard
        ↓
middleware.js reads access_token cookie
        ↓
jose.jwtVerify() checks signature + expiry
        ↓
Valid? → Let through     Invalid/missing? → Redirect to /login
```

### Adding Auth to Any New FastAPI Route

```python
from app.dependencies import get_current_user
from app.models.user import User
from fastapi import Depends

@router.get("/my-protected-route")
async def protected(current_user: User = Depends(get_current_user)):
    return {"message": f"Hello {current_user.name}"}
```

---

## 🔌 WebSocket Architecture

Phase 4 added real-time audio transcription over WebSocket.

### Why WebSocket auth is different from REST auth

The browser's `fetch()` automatically sends same-origin cookies, which is how the REST BFF proxy picks up the auth token. WebSocket connections (`new WebSocket(url)`) do **not** send cross-origin cookies, and cannot carry custom headers during the handshake. The connection goes directly from the browser to FastAPI on `:8000` — the Next.js BFF cannot sit in between.

**Solution: short-lived token exposure via BFF**

```
Browser needs to open WebSocket to FastAPI (:8000)
        ↓
fetch('/api/auth/token')          ← BFF reads httpOnly cookie server-side
        ↓
Returns { token: 'eyJ...' }       ← token briefly visible to JS
        ↓
new WebSocket('ws://localhost:8000/ws/interview/{id}?token=eyJ...')
        ↓
FastAPI decodes ?token=, verifies JWT, checks session ownership
        ↓
Connection accepted → binary audio chunks flow in → transcripts flow out
```

> In production, replace this with a **single-use WebSocket ticket** stored in Redis (expires in 30 seconds, consumed on connection). This eliminates the brief token exposure entirely.

### Audio Pipeline (per 5-second chunk)

```
MediaRecorder (browser)
  → audio/webm;codecs=opus binary blob every 5s
    → WebSocket.send(blob)
      → FastAPI receives bytes
        → saved to temp .webm file
          → faster-whisper.transcribe() [runs in thread pool]
            → ffmpeg decodes WebM → PCM
              → Whisper VAD filters silence
                → transcript text returned
                  → JSON sent back over WebSocket
                    → UI appends to Live Transcript
```

### WebSocket Message Protocol

All messages are JSON. Server → client message types:

| `type` | When sent | Key fields |
|---|---|---|
| `status` | On connect, before/after each chunk | `status`, `message` |
| `transcript` | After transcription completes | `text`, `chunk_index`, `is_final` |
| `error` | On server error | `code`, `message` |
| `pong` | In response to client `ping` | — |

Client → server message types:

| `type` | Purpose |
|---|---|
| Binary blob | Audio chunk (WebM/Opus) |
| `{ type: "ping" }` | Keepalive |

### WebSocket Close Codes

| Code | Meaning |
|---|---|
| `1000` | Normal closure (user stopped recording) |
| `4001` | Unauthorized — JWT invalid or expired |
| `4004` | Session not found or doesn't belong to user |

---

## 🗄 Database Schema

All tables are managed by **Alembic**. Never modify the DB manually — always edit the SQLAlchemy model and generate a migration.

### Table Relationships

```
users (1)
  └──→ interview_sessions (many)
         └──→ questions (many)
                └──→ answers (many)
                       └──→ scores (1)
```

### Tables

<details>
<summary><strong>users</strong></summary>

| Column | Type | Notes |
|---|---|---|
| id | Integer PK | Auto-increment |
| email | String | Unique, indexed |
| hashed_password | String | bcrypt hash — never stored as plaintext |
| name | String | Display name |
| is_active | Boolean | Soft delete — deactivate, never hard delete |
| created_at | DateTime | Set by PostgreSQL server clock |
| updated_at | DateTime | Auto-updated on every change |

</details>

<details>
<summary><strong>interview_sessions</strong></summary>

| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| user_id | Integer FK | → users.id, indexed |
| domain | String | e.g. "backend", "ml", "system_design" |
| company_mode | String | nullable — e.g. "google" for company-specific prep |
| difficulty | String | easy / medium / hard |
| status | Enum | pending / in_progress / completed / abandoned |
| started_at | DateTime | Set when user clicks Start |
| ended_at | DateTime | Set when session finishes |

</details>

<details>
<summary><strong>questions</strong></summary>

| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| session_id | Integer FK | → interview_sessions.id |
| question_text | Text | Unlimited length |
| order_index | Integer | Position in session (0, 1, 2…) |
| question_type | String | technical / behavioral / system_design / hr |
| is_follow_up | Boolean | True if AI generated it from a previous answer |

</details>

<details>
<summary><strong>answers</strong></summary>

| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| question_id | Integer FK | → questions.id |
| transcript | Text | Output from faster-whisper |
| audio_duration | Float | Seconds spoken |
| filler_word_count | Integer | Total count across all filler types |
| filler_words_json | JSON | e.g. `{"um": 4, "uh": 2, "like": 1}` |
| processing_status | String | pending → transcribing → scoring → scored |
| attempt_number | Integer | Supports retries (1 = first attempt) |

</details>

<details>
<summary><strong>scores</strong></summary>

| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| answer_id | Integer FK | → answers.id, unique (one-to-one with answer) |
| technical_accuracy | Float | 0.0 – 10.0 |
| clarity | Float | 0.0 – 10.0 |
| star_alignment | Float | 0.0 – 10.0 (STAR method alignment for behavioral Qs) |
| completeness | Float | 0.0 – 10.0 |
| overall_score | Float | Weighted average of above |
| strengths_json | JSON | Array of strength strings |
| improvements_json | JSON | Array of improvement strings |
| ideal_answer | Text | AI-generated model answer |
| follow_up_question | Text | What an interviewer would ask next |

</details>

### Working with Migrations

```bash
# After every model change:
alembic revision --autogenerate -m "describe_what_you_changed"
alembic upgrade head

# Undo the last migration:
alembic downgrade -1

# See full history:
alembic history
```

> ⚠️ **Rule**: New DB columns always go through Alembic. Never use `Base.metadata.create_all()` after Phase 1.

---

## 📡 API Reference

Full interactive docs at **`http://localhost:8000/docs`** when the backend is running. The Authorize button (🔒) accepts `Bearer <token>` to test protected routes.

### Auth Routes — `/api/v1/auth`

| Method | Endpoint | Description | Auth Required | Status |
|---|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Create account, get tokens | ❌ | ✅ Done |
| `POST` | `/api/v1/auth/login` | Login, get tokens | ❌ | ✅ Done |
| `GET` | `/api/v1/auth/me` | Get current user profile | ✅ | ✅ Done |
| `POST` | `/api/v1/auth/logout` | Logout (BFF clears cookies) | ❌ | ✅ Done |
| `POST` | `/api/v1/auth/refresh` | Get new access token | ❌ | ✅ Done |

### Interview Routes — `/api/v1/interviews`

| Method | Endpoint | Description | Auth Required | Status |
|---|---|---|---|---|
| `POST` | `/api/v1/interviews/start` | Start a new session | ✅ | ✅ Done |
| `GET` | `/api/v1/interviews/{id}` | Get session details | ✅ | ✅ Done |
| `PATCH` | `/api/v1/interviews/{id}/end` | End a session (→ completed) | ✅ | ✅ Done |

### WebSocket — `/ws`

| Protocol | Endpoint | Description | Auth | Status |
|---|---|---|---|---|
| `WS` | `/ws/interview/{session_id}` | Real-time audio transcription | `?token=<jwt>` query param | ✅ Done |

### Results Routes — `/api/v1/results` *(Phase 5)*

| Method | Endpoint | Description | Auth Required | Status |
|---|---|---|---|---|
| `GET` | `/api/v1/results/{id}` | Full feedback + scores | ✅ | ⏳ Phase 5 |
| `GET` | `/api/v1/results/{id}/scores` | Just score breakdown | ✅ | ⏳ Phase 5 |

---

## 🗺 Development Phases

| Phase | What Gets Built | Status |
|---|---|---|
| **Phase 1** | Project scaffold, FastAPI + Next.js wired up, CORS verified, Celery + Redis connected | ✅ Complete |
| **Phase 2** | PostgreSQL schema, 5 SQLAlchemy models, Alembic migrations, Pydantic config | ✅ Complete |
| **Phase 3** | JWT auth — register, login, httpOnly cookies, BFF proxy, protected routes, middleware | ✅ Complete |
| **Phase 4** | Interview session API, WebSocket real-time transcription, faster-whisper + ffmpeg integration, waveform UI, live transcript feed | ✅ Complete |
| **Phase 5** | Ollama scoring, filler word detection via vosk, Celery async pipeline, feedback generation | 🔜 Next |
| **Phase 6** | RAG pipeline — LangChain + FAISS question bank, domain-specific question generation | ⏳ Planned |
| **Phase 7** | Dashboard UI, Chart.js analytics, results page, score history | ⏳ Planned |
| **Phase 8** | Polish, error handling, loading states, performance tuning, deployment prep | ⏳ Planned |

---

## 🔑 Environment Variables

### Backend — `interview-coach/.env`

```env
# PostgreSQL
DATABASE_URL=postgresql://interview_user:yourpassword@localhost:5432/interview_coach

# Redis
REDIS_URL=redis://localhost:6379/0

# JWT — generate with: python -c "import secrets; print(secrets.token_hex(32))"
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
# Options for WHISPER_MODEL_SIZE: tiny (fastest) | base (balanced) | small | medium
# Start with "tiny" during development, switch to "base" for better accuracy
WHISPER_MODEL_SIZE=tiny
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

### Frontend — `frontend/.env.local`

```env
# Must be EXACTLY the same value as JWT_SECRET_KEY in the backend .env
# Used by Next.js middleware to verify tokens without calling the backend
JWT_SECRET_KEY=your_generated_secret_here
```

> ⚠️ Both `.env` and `.env.local` are in `.gitignore` — never commit them.
> ⚠️ The `.env` file must live at the **project root** (`interview-coach/.env`), not inside `backend/`.

---

## 🐛 Known Issues & Fixes

### `passlib` + `bcrypt >= 4.0.0` crash on Windows

**Symptom:** `ValueError: password cannot be longer than 72 bytes` when calling `/register`

**Cause:** `passlib` hasn't been maintained in years and breaks with newer `bcrypt`. Its internal backend detection test crashes with modern `bcrypt`.

**Fix applied in Phase 3:** Replaced `passlib` entirely with `bcrypt` used directly:
```python
import bcrypt
bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
```

---

### faster-whisper transcription returns empty / errors on audio chunks

**Symptom:** WebSocket receives `[Transcription error: ...]` or `[silence]` for every chunk even when speaking.

**Cause 1 — ffmpeg not in PATH:**
faster-whisper needs ffmpeg to decode WebM/Opus audio from the browser. Without it, the decode step fails silently.

**Fix:** Download ffmpeg from https://ffmpeg.org/download.html, extract, add the `bin/` folder to your Windows **System** PATH (not User PATH). Restart the backend terminal completely, then verify with `ffmpeg -version`.

**Cause 2 — Model not downloaded yet:**
On first startup, the model downloads from HuggingFace. If the backend started offline, the model may be missing.

**Fix:** Ensure internet access on first startup. The backend terminal will show the download progress.

---

### WebSocket closes immediately with code `4001`

**Symptom:** DevTools shows WebSocket connection closing right after opening with `code=4001 reason=Unauthorized`.

**Cause:** The JWT token passed as `?token=` is expired or the `/api/auth/token` BFF route returned an error.

**Fix:** Log out and log back in to get a fresh token, then retry. Access tokens expire after 30 minutes.

---

### Safari: microphone recording doesn't work

**Symptom:** `AudioRecorder` shows an error on Safari browsers.

**Cause:** Safari does not support `audio/webm;codecs=opus`. The `MediaRecorder` API has limited support on Safari.

**Fix:** Use Chrome, Firefox, or Edge. This is a known browser limitation and is acceptable for a portfolio/placement project.

---

## 🙈 .gitignore

```gitignore
# Secrets — never commit these
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

# Local AI model indexes and downloads
backend/data/

# OS
.DS_Store
Thumbs.db
```

---

<div align="center">

Built by DIVYAꨄ — BTech CSE, Netaji Subhas University Of Technology, Delhi.

</div>