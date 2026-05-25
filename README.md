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

## ⭐ What Makes This Project Stand Out

> [!IMPORTANT]
> This is not a tutorial clone. Every architectural decision below was made deliberately, solves a real engineering problem, and reflects patterns used in production systems — not "it works on my machine" code.

<br/>

### 🆚 This Project vs. Every Other Interview Coach on GitHub

| Feature | ❌ Typical Student Project | ✅ This Project |
|---|---|---|
| **Auth token storage** | `localStorage` — vulnerable to XSS attacks | `httpOnly` cookies via BFF — JS can **never** read the token |
| **Speech-to-text** | OpenAI Whisper API — costs money per minute | `faster-whisper` local — runs on CPU, **zero cost forever** |
| **LLM for scoring** | GPT-4 API — requires API key, costs $$ | Ollama `llama3.2` — **fully local**, no key needed |
| **Audio transport** | Base64-encoded JSON over REST — slow, bloated | **Binary WebSocket stream** — raw bytes, minimal overhead |
| **Background jobs** | Synchronous — blocks the server during scoring | Celery + Redis — **async task queue**, non-blocking |
| **DB schema changes** | `create_all()` — drops and recreates tables | **Alembic migrations** — versioned, reversible, production-safe |
| **WebSocket auth** | Unprotected or skipped entirely | JWT verified **before** `accept()` — auth at handshake level |
| **Cloud dependency** | Requires internet + API keys to run | **Zero external dependencies** — runs 100% offline after setup |

<br/>

---

### 🏆 Six Engineering Decisions That Make Interviewers Notice

---

#### `1` &nbsp; 🔐 The BFF Security Pattern — Not Just `localStorage`

> [!NOTE]
> **Most projects store JWTs in `localStorage`.** This is vulnerable to XSS — any injected script can steal the token. This project uses the **Backend-For-Frontend (BFF)** pattern instead, the same approach used by banks and enterprise SaaS products.

```
Browser submits login form
    ↓  same-origin fetch — no CORS issues
Next.js BFF receives FastAPI response
    ↓
Sets httpOnly cookie ← JavaScript can NEVER read this token
    ↓
Returns only { user } to the browser — token stays hidden
```

The access token lives in an `httpOnly` cookie. It cannot be stolen by injected scripts. It never appears in JavaScript memory except for the one moment it's used to open a WebSocket — and even then, it's fetched server-side and immediately consumed.

**Files:** `src/app/api/auth/[action]/route.js` · `src/middleware.js`

---

#### `2` &nbsp; 🎙️ Real-Time Binary Audio Streaming — Not Base64 REST Polling

> [!NOTE]
> **Most projects encode audio as base64 and POST it to a REST endpoint.** Base64 inflates payload size by ~33%. This project streams raw binary audio chunks over a persistent WebSocket connection — the same transport used by Deepgram and AssemblyAI.

```
MediaRecorder (browser) → binary blob fires every 5 seconds automatically
    → WebSocket.send(blob)              ← raw bytes, zero encoding overhead
        → FastAPI receives bytes
            → written to temp .webm file
                → faster-whisper.transcribe() [runs in thread pool executor]
                    → ffmpeg decodes WebM/Opus → PCM
                        → VAD filters silence before transcribing
                            → transcript JSON sent back over same socket
```

The `timeslice: 5000` parameter on `MediaRecorder.start()` makes chunks fire automatically — no polling timer needed. No base64. No REST. No extra round trips.

**Files:** `src/hooks/useAudioRecorder.js` · `backend/app/api/v1/endpoints/websocket.py`

---

#### `3` &nbsp; 🔑 WebSocket Auth — A Problem Most Projects Ignore

> [!NOTE]
> **WebSockets cannot send custom HTTP headers during the handshake**, and cross-origin cookies don't apply. Most projects either leave WebSockets unprotected or don't think about this at all. This project solves it with a deliberate, minimal token exposure pattern.

```
Browser needs a WebSocket to FastAPI (:8000)
    ↓
GET /api/auth/token        ← Next.js BFF reads httpOnly cookie server-side
    ↓
Returns { token } to JS    ← lives in memory for ~1 second only
    ↓
new WebSocket('/ws/interview/{id}?token=...')
    ↓
FastAPI: verify JWT → check session ownership → THEN call websocket.accept()
    ↓
4001 close code = Unauthorized   |   4004 = Session not found
```

**Authentication happens before `websocket.accept()`** — not after. Most implementations accept the connection first and then check. Rejecting at handshake level is the correct, production-grade approach.

**Files:** `src/app/api/auth/token/route.js` · `backend/app/api/v1/endpoints/websocket.py`

---

#### `4` &nbsp; ⚡ Async Transcription That Never Freezes the Server

> [!NOTE]
> `faster-whisper` is CPU-bound. Calling it directly in an `async` FastAPI handler **blocks the entire event loop** — every other WebSocket connection stalls while one chunk transcribes. This project runs transcription in a thread pool executor.

```python
# ❌ Blocks the event loop — all other connections freeze
transcript = whisper_model.transcribe(tmp_path)

# ✅ Runs in a thread — event loop stays free for other connections
loop = asyncio.get_running_loop()
transcript = await loop.run_in_executor(
    None,                # default ThreadPoolExecutor
    _transcribe_chunk,   # synchronous function
    audio_bytes,
    chunk_index,
)
```

`run_in_executor` is the standard bridge between Python's async world and CPU-heavy synchronous code. Without it, transcription would work in single-user testing and silently degrade under any real load.

---

#### `5` &nbsp; 🚫 Zero Cloud Architecture — Runs Completely Offline

> [!NOTE]
> This project has **no external API dependencies at runtime**. Every AI component runs locally. After the initial model downloads, it works with no internet connection, no API keys, and no monthly bill — ever.

| Component | ❌ Typical Approach | ✅ This Project |
|---|---|---|
| Speech-to-text | OpenAI Whisper API | `faster-whisper` on CPU |
| LLM scoring | GPT-4 / Claude API | Ollama `llama3.2` |
| Filler detection | Custom API or skipped | `vosk` local model |
| Vector search | Pinecone / Weaviate | FAISS in-process |
| Background jobs | Cloud Functions | Celery + local Redis |

**Total monthly cloud cost: ₹0.** This is not a demo that breaks when a free trial expires. It's a self-contained system you own completely.

---

#### `6` &nbsp; 🗄️ Production Database Migrations — Not `create_all()`

> [!NOTE]
> **`Base.metadata.create_all()` is fine for a 2-hour tutorial.** For any project you plan to iterate on, it's a trap — it silently does nothing if the table already exists, can't rename or add columns, and has no rollback. This project uses Alembic from day one.

```bash
# Every schema change is a versioned, reviewable migration file
alembic revision --autogenerate -m "add_filler_word_count_to_answers"

alembic upgrade head      # apply forward
alembic downgrade -1      # roll back safely if something breaks
alembic history           # full audit trail of every change
```

5 tables. All versioned. The entire schema can be reproduced on any machine with a single command. No manual SQL. No data loss from accidental drops.

---

### 📐 Full System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BROWSER (:3000)                              │
│  Next.js 14 App Router · Tailwind CSS · shadcn/ui · Web Audio API   │
│                                                                     │
│  MediaRecorder ──→ binary audio chunks ──→ WebSocket ───────────┐   │
│  fetch('/api/v1/...') ──→ BFF proxy ──────────────────────────┐ │   │
└──────────────────────────────────────────────────────────────── │──│┘
                                                                  │  │
                    same-origin (no CORS)                         │  │ ws://
                                                                  ↓  │
┌────────────────────────────────────────────────────────────────────│─┐
│                   NEXT.JS BFF LAYER (:3000)                        │ │
│  Reads httpOnly cookie → injects Authorization header              │ │
│  Proxies all /api/v1/* requests to FastAPI transparently           │ │
└────────────────────────────────────────────────────────────────────│─┘
                                                                     │
                    server-to-server HTTP                            │
                                                                     ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    FASTAPI BACKEND (:8000)                          │
│                                                                     │
│  POST /api/v1/auth/*        JWT · bcrypt · refresh tokens           │
│  GET|POST|PATCH /api/v1/interviews/*   Session lifecycle            │
│  WS /ws/interview/{id}      Binary audio → transcription            │
│                                                                     │
│  Celery tasks (async)           SQLAlchemy ORM + Alembic            │
│  ┌──────────────────┐          ┌───────────────────────┐            │
│  │  Redis Broker    │          │  PostgreSQL            │           │
│  │  Result Backend  │          │  5 tables, versioned   │           │
│  └──────────────────┘          └───────────────────────┘            │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌───────┐  ┌──────────────┐    │
│  │faster-whisper│  │Ollama llama3 │  │ vosk  │  │ FAISS index  │    │
│  │  (CPU, int8) │  │  (local LLM) │  │(local)│  │  (in-proc)   │    │
│  └──────────────┘  └──────────────┘  └───────┘  └──────────────┘    │
│          ↑ all local · all free · all offline-capable ↑             │
└─────────────────────────────────────────────────────────────────────┘
```

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
│       │   │   │       └── route.js  # Exposes JWT for WebSocket auth
│       │   │   └── v1/
│       │   │       └── [...path]/
│       │   │           └── route.js  # Generic BFF proxy → FastAPI /api/v1/*
│       │   ├── (auth)/
│       │   │   ├── login/
│       │   │   │   └── page.js       # Login form
│       │   │   └── register/
│       │   │       └── page.js       # Register form
│       │   ├── (dashboard)/
│       │   │   ├── dashboard/
│       │   │   │   └── page.js       # Start interview form
│       │   │   ├── interview/[id]/
│       │   │   │   └── page.js       # Live interview session page
│       │   │   └── results/[id]/     # page.js — Phase 5
│       │   ├── layout.js
│       │   └── page.js               # Landing page
│       ├── components/
│       │   ├── ui/                   # shadcn/ui primitives
│       │   ├── interview/
│       │   │   └── AudioRecorder.jsx # Waveform + controls component
│       │   ├── dashboard/            # Stats cards, history — Phase 5
│       │   └── charts/               # Chart.js wrappers — Phase 7
│       ├── hooks/
│       │   └── useAudioRecorder.js   # MediaRecorder + WebSocket hook
│       ├── lib/
│       │   ├── utils.js              # shadcn auto-generated
│       │   └── auth.js               # login(), register(), logout(), getMe()
│       └── services/
│           └── interviews.js         # startInterview(), getInterview(), endInterview()
│
└── backend/                          # FastAPI application
    ├── main.py                       # Interview + WebSocket routers registered
    ├── requirements.txt
    ├── alembic.ini
    ├── alembic/
    │   ├── env.py
    │   └── versions/
    │       └── xxxx_initial_schema.py
    └── app/
        ├── api/v1/endpoints/
        │   ├── auth.py               # register, login, me, logout, refresh
        │   ├── interviews.py         # start, get, end session routes
        │   └── websocket.py          # WS /ws/interview/{session_id}
        ├── core/
        │   ├── config.py             # Pydantic settings from .env
        │   └── security.py           # bcrypt hashing + JWT create/decode
        ├── db/
        │   └── database.py           # SQLAlchemy engine + get_db()
        ├── dependencies.py           # get_current_user() reusable dependency
        ├── models/                   # All 5 SQLAlchemy models
        ├── schemas/
        │   ├── user.py               # UserCreate, UserLogin, UserResponse, TokenResponse
        │   └── interview.py          # InterviewStartRequest, SessionResponse, WS schemas
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
| **ffmpeg** | **Latest** | **WebM audio decoding for faster-whisper** | **Add `bin/` to System PATH. Verify: `ffmpeg -version`** |
| Git | Any | Version control | — |

> ⚠️ **Windows PowerShell**: If `venv` activation is blocked, run:
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```

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

Generate a secure JWT secret:
```bash
cd backend
python -c "import secrets; print(secrets.token_hex(32))"
```

Copy the **same secret** into `frontend/.env.local`:
```
JWT_SECRET_KEY=paste_the_same_secret_here
```

> ⚠️ Both files must have the **exact same** `JWT_SECRET_KEY`.

### 3. Backend setup

```bash
cd backend
python -m venv venv
source venv/Scripts/activate    # Windows Git Bash
# venv\Scripts\activate         # Windows CMD
pip install -r requirements.txt
```

### 4. Frontend setup

```bash
cd frontend
npm install
```

### 5. Database setup

```sql
CREATE DATABASE interview_coach;
CREATE USER interview_user WITH PASSWORD 'yourpassword';
GRANT ALL PRIVILEGES ON DATABASE interview_coach TO interview_user;
\c interview_coach
GRANT ALL ON SCHEMA public TO interview_user;
```

### 6. Run migrations

```bash
cd backend
alembic upgrade head
```

### 7. Pull the Ollama model

```bash
ollama pull llama3.2
```

---

## ▶️ Running the Project

**4 terminals required:**

| Terminal | Command |
|---|---|
| **1 — Redis** | `redis-cli ping` (Memurai runs as a Windows service) |
| **2 — Backend** | `cd backend && uvicorn main:app --reload --host 0.0.0.0 --port 8000` |
| **3 — Celery** | `cd backend && celery -A app.tasks.celery_app worker --loglevel=info --pool=solo` |
| **4 — Frontend** | `cd frontend && npm run dev` |

### ✅ Verify everything is running

| Service | Check | Expected |
|---|---|---|
| PostgreSQL | `psql -U postgres -c "SELECT 1;"` | Returns `1` |
| Redis | `redis-cli ping` | `PONG` |
| ffmpeg | `ffmpeg -version` | Version string |
| FastAPI | `http://localhost:8000/health` | `{"status":"ok","version":"0.4.0"}` |
| faster-whisper | Backend terminal on startup | `✅ faster-whisper model loaded (tiny, int8)` |
| Next.js | `http://localhost:3000` | Landing page |
| Dashboard | `http://localhost:3000/dashboard` | Start Interview form (requires login) |
| Protected route | `http://localhost:3000/dashboard` (logged out) | Redirects to `/login` |
| Celery | Terminal 3 | `celery@yourpc ready.` |

---

## 🔐 Authentication Architecture

### BFF Pattern Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (:3000)                      │
│   Submits form → fetch('/api/auth/login')   ← same origin   │
└────────────────────────┬────────────────────────────────────┘
                         │ Same origin (no CORS)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Next.js BFF Layer (:3000)                      │
│   1. Forwards to FastAPI                                    │
│   2. Receives { access_token, refresh_token, user }         │
│   3. Sets httpOnly cookies ← token stays hidden from JS     │
│   4. Returns only { user } to browser                       │
└────────────────────────┬────────────────────────────────────┘
                         │ Server-to-server
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  FastAPI Backend (:8000)                    │
│   Verifies credentials → returns tokens in response body    │
└─────────────────────────────────────────────────────────────┘
```

### Token Security

| Property | Access Token | Refresh Token |
|---|---|---|
| **Lifetime** | 30 minutes | 7 days |
| **Storage** | `httpOnly` cookie | `httpOnly` cookie |
| **JS readable?** | ❌ Never | ❌ Never |
| **Cookie path** | `/` | `/api/auth/refresh` only |

### Adding a Protected FastAPI Route

```python
from app.dependencies import get_current_user

@router.get("/my-route")
async def protected(current_user: User = Depends(get_current_user)):
    return {"message": f"Hello {current_user.name}"}
```

---

## 🔌 WebSocket Architecture

### Audio Pipeline (per 5-second chunk)

```
MediaRecorder → binary blob → WebSocket.send()
  → FastAPI receives bytes → temp .webm file
    → faster-whisper [thread pool] → ffmpeg → VAD → transcript
      → JSON sent back → UI appends to Live Transcript
```

### Message Protocol

| Direction | `type` | Key fields |
|---|---|---|
| Server → Client | `status` | `status`, `message` |
| Server → Client | `transcript` | `text`, `chunk_index`, `is_final` |
| Server → Client | `error` | `code`, `message` |
| Client → Server | *(binary)* | Raw audio blob |
| Client → Server | `ping` | — |

### WebSocket Close Codes

| Code | Meaning |
|---|---|
| `1000` | Normal closure |
| `4001` | Unauthorized — JWT invalid or expired |
| `4004` | Session not found |

---

## 🗄 Database Schema

```
users (1) → interview_sessions (many) → questions (many) → answers (many) → scores (1)
```

<details>
<summary><strong>users</strong></summary>

| Column | Type | Notes |
|---|---|---|
| id | Integer PK | Auto-increment |
| email | String | Unique, indexed |
| hashed_password | String | bcrypt — never plaintext |
| name | String | Display name |
| is_active | Boolean | Soft delete |
| created_at / updated_at | DateTime | Server clock |

</details>

<details>
<summary><strong>interview_sessions</strong></summary>

| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| user_id | Integer FK | → users.id |
| domain | String | backend / ml / system_design / etc. |
| company_mode | String | nullable — google / amazon / etc. |
| difficulty | String | easy / medium / hard |
| status | Enum | pending / in_progress / completed / abandoned |
| started_at / ended_at | DateTime | Session timestamps |

</details>

<details>
<summary><strong>questions · answers · scores</strong></summary>

**questions:** session_id FK · question_text · order_index · question_type · is_follow_up

**answers:** question_id FK · transcript · audio_duration · filler_word_count · filler_words_json · processing_status · attempt_number

**scores:** answer_id FK (unique) · technical_accuracy · clarity · star_alignment · completeness · overall_score · strengths_json · improvements_json · ideal_answer · follow_up_question

All scores are `Float` on a 0.0–10.0 scale.

</details>

### Migration Commands

```bash
alembic revision --autogenerate -m "describe_change"
alembic upgrade head      # apply
alembic downgrade -1      # roll back
alembic history           # audit trail
```

---

## 📡 API Reference

Docs at **`http://localhost:8000/docs`** — use the 🔒 Authorize button with `Bearer <token>`.

### Auth — `/api/v1/auth`

| Method | Endpoint | Auth | Status |
|---|---|---|---|
| `POST` | `/register` | ❌ | ✅ |
| `POST` | `/login` | ❌ | ✅ |
| `GET` | `/me` | ✅ | ✅ |
| `POST` | `/logout` | ❌ | ✅ |
| `POST` | `/refresh` | ❌ | ✅ |

### Interviews — `/api/v1/interviews`

| Method | Endpoint | Auth | Status |
|---|---|---|---|
| `POST` | `/start` | ✅ | ✅ |
| `GET` | `/{id}` | ✅ | ✅ |
| `PATCH` | `/{id}/end` | ✅ | ✅ |

### WebSocket — `/ws`

| Protocol | Endpoint | Auth | Status |
|---|---|---|---|
| `WS` | `/interview/{session_id}` | `?token=<jwt>` | ✅ |

### Results — `/api/v1/results` *(Phase 5)*

| Method | Endpoint | Status |
|---|---|---|
| `GET` | `/{id}` | ⏳ |
| `GET` | `/{id}/scores` | ⏳ |

---

## 🗺 Development Phases

| Phase | What Gets Built | Status |
|---|---|---|
| **Phase 1** | Project scaffold, FastAPI + Next.js, CORS, Celery + Redis | ✅ Complete |
| **Phase 2** | PostgreSQL schema, 5 SQLAlchemy models, Alembic migrations | ✅ Complete |
| **Phase 3** | JWT auth, httpOnly cookies, BFF proxy, protected routes, middleware | ✅ Complete |
| **Phase 4** | Interview session API, WebSocket transcription, faster-whisper, waveform UI | ✅ Complete |
| **Phase 5** | Ollama scoring, vosk filler detection, Celery pipeline, feedback generation | 🔜 Next |
| **Phase 6** | RAG pipeline — LangChain + FAISS, domain-specific question generation | ⏳ Planned |
| **Phase 7** | Dashboard UI, Chart.js analytics, results page, score history | ⏳ Planned |
| **Phase 8** | Polish, error handling, performance tuning, deployment prep | ⏳ Planned |

---

## 🔑 Environment Variables

### Backend — `interview-coach/.env`

```env
DATABASE_URL=postgresql://interview_user:yourpassword@localhost:5432/interview_coach
REDIS_URL=redis://localhost:6379/0
JWT_SECRET_KEY=your_generated_secret_here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
WHISPER_MODEL_SIZE=tiny
WHISPER_DEVICE=cpu
WHISPER_COMPUTE_TYPE=int8
FAISS_INDEX_PATH=./data/faiss_index
KNOWLEDGE_BASE_PATH=./data/knowledge_base
APP_ENV=development
DEBUG=True
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
```

### Frontend — `frontend/.env.local`

```env
JWT_SECRET_KEY=your_generated_secret_here   # same value as backend .env
```

> ⚠️ Never commit either file. Both are in `.gitignore`.

---

## 🐛 Known Issues & Fixes

**`passlib` + `bcrypt >= 4.0.0` crash** — Fixed in Phase 3 by dropping passlib entirely and calling `bcrypt` directly.

**faster-whisper returns `[silence]` or errors** — ffmpeg not in PATH. Add `bin/` to Windows System PATH, restart terminal, run `ffmpeg -version`.

**WebSocket closes with code `4001`** — Token expired. Log out, log back in (tokens last 30 minutes).

**Safari mic doesn't work** — Safari doesn't support `audio/webm;codecs=opus`. Use Chrome, Firefox, or Edge.

---

## 🙈 .gitignore

```gitignore
.env
.env.local
.env.*.local
backend/venv/
__pycache__/
*.pyc
frontend/node_modules/
frontend/.next/
frontend/out/
backend/data/
.DS_Store
Thumbs.db
```

---

<div align="center">

Built by DIVYAꨄ — BTech CSE, Netaji Subhas University Of Technology, Delhi.

</div>