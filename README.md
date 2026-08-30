<div align="center">

# 🎯 AI Interview Coach

### *Speak. Get scored. Get placed.*

An AI-powered mock interview platform where you speak your answers, get real-time transcription,
and receive detailed AI-generated feedback — all running **100% locally**, no cloud costs.

<br/>

![Phase](https://img.shields.io/badge/Phase-7%20Complete-success?style=for-the-badge&logo=checkmarx)
![Stack](https://img.shields.io/badge/Stack-Next.js%2014%20%2B%20FastAPI-blue?style=for-the-badge)
![DB](https://img.shields.io/badge/Database-PostgreSQL-336791?style=for-the-badge&logo=postgresql)
![AI](https://img.shields.io/badge/LLM-Ollama%20%28Local%29-black?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

<br/>

<img src="./docs/landing_page.png" alt="AI Interview Coach Landing Page" width="800" style="border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.2);" />

</div>

---

### 🏆 Seven Important Engineering Decisions

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

`run_in_executor` is the standard bridge between Python's async world and CPU-heavy synchronous code. Without it, transcription works in single-user testing and silently degrades under any real load.

---

#### `5` &nbsp; 🧠 Fire-and-Forget LLM Scoring — API Returns in <200ms

> [!NOTE]
> Ollama takes 60–90 seconds to score an answer. Calling it synchronously inside an API handler would make the frontend hang with a spinner for over a minute. This project decouples submission from scoring completely using Celery.

```
POST /api/v1/answers  ← frontend submits transcript
    ↓
Answer row created  (processing_status = "pending")
    ↓
score_answer_task.delay(answer_id)   ← queued in Redis instantly
    ↓
HTTP 202 returned to frontend        ← in under 200ms

Meanwhile, in the Celery worker:
    Answer loaded → status = "scoring"
        → OllamaScorer.score(transcript, question)
            → Ollama llama3.2 generates JSON evaluation
                → Score row written to DB
                    → status = "scored"

Frontend polls GET /api/v1/answers/{id}/score every 3 seconds
    → returns Score when ready, status string while waiting
```

The API response time and the LLM inference time are completely independent. The user sees a "Scoring…" indicator, not a frozen browser tab.

**Files:** `backend/app/tasks/scoring_task.py` · `backend/app/services/scoring.py` · `backend/app/api/v1/endpoints/answers.py`

---

#### `6` &nbsp; 🛡️ Fault-Tolerant LLM JSON Parsing — Three Recovery Layers

> [!NOTE]
> LLMs don't reliably return clean JSON. They wrap it in markdown code fences, add preamble text, include trailing commas, or hallucinate extra keys. This project's `OllamaScorer` never crashes — it always returns a usable score.

```python
def _safe_parse_json(self, raw: str) -> dict | None:
    # Layer 1: direct parse — works when LLM is well-behaved
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass

    # Layer 2: strip ```json ... ``` markdown fences
    cleaned = re.sub(r"```json|```", "", raw).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Layer 3: regex — find the first {...} block in the response
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    return None  # all layers failed → _fallback_score() is used
```

Additionally: all numeric scores are clamped to 0.0–10.0, and `overall_score` is **always recalculated locally** as `round((ta + cl + sa + co) / 4, 1)` — the model's arithmetic is never trusted.

**File:** `backend/app/services/scoring.py`

---

#### `7` &nbsp; 🗄️ Production Database Migrations — Not `create_all()`

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
│  POST   /api/v1/auth/*              JWT · bcrypt                    │
│  GET    /api/v1/interviews          List sessions + scores          │
│  POST   /api/v1/interviews/start    Create session + questions      │
│  PATCH  /api/v1/interviews/{id}/end End session                     │
│  POST   /api/v1/answers             Submit transcript → queue       │
│  GET    /api/v1/answers/{id}/score  Poll scoring status             │
│  GET    /api/v1/results/{id}        Full session results            │
│  GET    /api/v1/analytics           Score trends + domain stats     │
│  WS     /ws/interview/{id}          Binary audio → transcription    │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                  ASYNC SCORING PIPELINE                     │    │
│  │  Redis Queue → Celery Worker → OllamaScorer → Score row     │    │
│  │  POST /answers returns 202 in <200ms while Ollama runs      │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌──────────────────┐          ┌───────────────────────┐            │
│  │  Redis Broker    │          │  PostgreSQL            │           │
│  │  Result Backend  │          │  5 tables, versioned   │           │
│  └──────────────────┘          └───────────────────────┘            │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐      │
│  │faster-whisper│  │Ollama llama3 │  │  Static Question Bank │      │
│  │  (CPU, int8) │  │  (local LLM) │  │  (FAISS in Phase 6)   │      │
│  └──────────────┘  └──────────────┘  └───────────────────────┘      │
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
- [Scoring Pipeline](#-scoring-pipeline)
- [Database Schema](#-database-schema)
- [API Reference](#-api-reference)
- [Development Phases](#-development-phases)

---

## 🤔 What This Project Does

AI Interview Coach simulates a real placement interview. Here's what happens end to end:

```
You select domain + difficulty → session starts with 5 questions
       ↓
First question displayed on screen
       ↓
You hit Record and speak your answer
       ↓
faster-whisper transcribes in real time (local, 5-second chunks)
       ↓
You stop recording → transcript submitted to backend
       ↓
Answer row created in DB → Celery fires scoring task instantly
       ↓
API returns in <200ms → "Scoring your answer…" shown to user
       ↓
Ollama llama3.2 scores on 4 dimensions (runs in background):
  Technical Accuracy · Clarity · STAR Alignment · Completeness
       ↓
Score, strengths, improvements, ideal answer + follow-up question
       ↓
Results page shows full breakdown
       ↓
Dashboard tracks all sessions with live stats + streak
       ↓
Analytics page shows score trends, skill radar, domain & difficulty charts
```

Everything runs on your machine — no OpenAI, no cloud bills, no rate limits.

---

## 🛠 Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | Next.js 14 (App Router), JavaScript, Tailwind CSS | UI + routing |
| **Component Library** | shadcn/ui | Pre-built accessible components |
| **Charts** | Chart.js + react-chartjs-2 | Score analytics dashboard (Phase 7) |
| **Backend** | Python FastAPI | REST API + WebSockets |
| **Auth** | JWT (python-jose) + bcrypt | Stateless authentication |
| **Task Queue** | Celery + Redis (Memurai on Windows) | Async scoring jobs |
| **Database** | PostgreSQL + SQLAlchemy ORM + Alembic | Persistent storage + migrations |
| **Speech-to-Text** | faster-whisper (local) | Real-time transcription |
| **LLM / Scoring** | Ollama — llama3.2 (local) | 4-dimension answer evaluation |
| **HTTP Client** | httpx | Sync calls from scoring service to Ollama |
| **Question Bank** | Static Python dict (FAISS in Phase 6) | Domain-specific questions |
| **Audio Capture** | MediaRecorder API + Web Audio API | Browser mic recording + waveform |

> 💡 **Zero external API costs** — every AI component runs locally.

---

## 📁 Project Structure

```
interview-coach/
├── .env                              # All secrets — NEVER commit this
├── .env.example                      # Safe template to share
│
├── frontend/
│   ├── .env.local
│   └── src/
│       ├── middleware.js             # Guards /dashboard, /interview, /results
│       ├── app/
│       │   ├── api/
│       │   │   ├── auth/
│       │   │   │   ├── [action]/route.js   # BFF: login/register/logout/me
│       │   │   │   └── token/route.js      # Exposes JWT for WebSocket auth
│       │   │   └── v1/[...path]/route.js   # Generic BFF proxy → FastAPI
│       │   ├── (auth)/
│       │   │   ├── login/page.js
│       │   │   └── register/page.js
│       │   ├── (dashboard)/
│       │   │   ├── dashboard/page.js       # Real stats + session history
│       │   │   ├── analytics/page.js       # Score trends, domain & difficulty charts
│       │   │   ├── interview/[id]/page.js  # Question + recorder + submit
│       │   │   └── results/[id]/page.js    # Score breakdown page
│       │   └── page.js                     # Landing page
│       ├── components/
│       │   ├── ui/                         # shadcn/ui primitives
│       │   └── interview/
│       │       └── AudioRecorder.jsx       # Waveform + controls
│       ├── hooks/
│       │   └── useAudioRecorder.js         # MediaRecorder + WebSocket hook
│       ├── lib/
│       │   └── auth.js                     # login(), register(), logout(), getMe()
│       └── services/
│           ├── interviews.js               # start, get, end, list sessions
│           ├── answers.js                  # submit, pollScore, getResults
│           └── analytics.js               # getAnalytics() — fetches /api/v1/analytics
│
└── backend/
    ├── main.py                       # All routers registered
    ├── requirements.txt
    ├── alembic.ini
    ├── alembic/versions/
    └── app/
        ├── api/v1/endpoints/
        │   ├── auth.py               # register, login, me, logout, refresh
        │   ├── interviews.py         # list, start, get, end
        │   ├── websocket.py          # WS /ws/interview/{id}
        │   ├── answers.py            # submit transcript, poll score
        │   ├── results.py            # full session results
        │   └── analytics.py         # GET /analytics — trend, domain, difficulty
        ├── core/
        │   ├── config.py             # Pydantic settings from .env
        │   └── security.py           # bcrypt + JWT
        ├── db/database.py            # SQLAlchemy engine + get_db()
        ├── dependencies.py           # get_current_user()
        ├── models/                   # 5 SQLAlchemy models
        │   ├── user.py
        │   ├── interview_session.py
        │   ├── question.py
        │   ├── answer.py
        │   └── score.py
        ├── schemas/
        │   ├── user.py
        │   ├── interview.py          # Session, Question, SessionListItem
        │   ├── scoring.py            # AnswerSubmit, ScoreResponse, Results
        │   └── analytics.py         # AnalyticsResponse + sub-schemas
        ├── services/
        │   ├── question_bank.py      # Static question dict by domain
        │   └── scoring.py            # OllamaScorer — calls llama3.2
        └── tasks/
            ├── celery_app.py         # Celery + Redis config
            └── scoring_task.py       # score_answer_task (Celery worker)
```

---

## ✅ Prerequisites

| Tool | Version | Purpose | Windows Notes |
|---|---|---|---|
| Node.js | 18+ | Next.js frontend | — |
| Python | 3.10+ | FastAPI backend | — |
| PostgreSQL | 16 | Main database | — |
| Redis / Memurai | Latest | Celery broker | Use [Memurai](https://www.memurai.com/) on Windows |
| Ollama | Latest | Local LLM | Run `ollama pull llama3.2` after install |
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
pip install -r requirements.txt
```

### 4. Frontend setup

```bash
cd frontend
npm install
npm install react-chartjs-2 chart.js
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
| **1 — Redis** | Memurai runs as a Windows service. Verify: `redis-cli ping` → `PONG` |
| **2 — Backend** | `cd backend && uvicorn main:app --reload --host 0.0.0.0 --port 8000` |
| **3 — Celery** | `cd backend && celery -A app.tasks.celery_app worker --loglevel=info --pool=solo` |
| **4 — Frontend** | `cd frontend && npm run dev` |

### ✅ Verify everything is running

| Service | Check | Expected |
|---|---|---|
| Redis | `redis-cli ping` | `PONG` |
| Celery | Terminal 3 on startup | `score_answer_task` in `[tasks]` list |
| FastAPI | `http://localhost:8000/health` | `{"status":"ok","version":"0.7.0"}` |
| Ollama | `ollama list` | `llama3.2` in the list |
| faster-whisper | Backend terminal on startup | Model loaded message |
| Next.js | `http://localhost:3000` | Landing page |
| Full flow | Record answer → stop → wait 3s | Score appears on results page |
| Analytics | `http://localhost:3000/analytics` | Charts render after first scored session |

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

### WebSocket Close Codes

| Code | Meaning |
|---|---|
| `1000` | Normal closure |
| `4001` | Unauthorized — JWT invalid or expired |
| `4004` | Session not found |

---

## 🧠 Scoring Pipeline

```
POST /api/v1/answers
  { question_id, transcript, audio_duration }
        ↓
  Answer row created  (processing_status = "pending")
  score_answer_task.delay(answer_id)  ← queued in Redis
  HTTP 202 returned immediately
        ↓
Celery worker picks up task
  status → "scoring"
  OllamaScorer.score(transcript, question_text)
    → POST http://localhost:11434/api/generate
    → llama3.2 returns JSON evaluation
    → _safe_parse_json() (3-layer fallback)
    → all scores clamped to 0.0–10.0
    → overall_score recalculated locally
  Score row written to DB
  status → "scored"
        ↓
Frontend polls GET /api/v1/answers/{id}/score every 3 seconds
  "pending" / "scoring"  →  keep polling
  "scored"               →  render ScoreResponse
  "failed"               →  show error message
```

### Score Dimensions

| Dimension | What It Measures |
|---|---|
| `technical_accuracy` | Correctness of technical content |
| `clarity` | How clearly the answer was communicated |
| `star_alignment` | Use of Situation-Task-Action-Result structure |
| `completeness` | How thoroughly the question was addressed |
| `overall_score` | Mean of all four — calculated locally, never from LLM |

---

## 🗄 Database Schema

```
users (1) ──→ interview_sessions (many) ──→ questions (many) ──→ answers (many) ──→ scores (1)
```

<details>
<summary><strong>users</strong></summary>

| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| email | String | Unique, indexed |
| hashed_password | String | bcrypt — never plaintext |
| name | String | Display name |
| is_active | Boolean | Soft delete |
| created_at / updated_at | DateTime | |

</details>

<details>
<summary><strong>interview_sessions</strong></summary>

| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| user_id | Integer FK | → users.id |
| domain | String | backend / frontend / ml / system_design / dsa / behavioral |
| difficulty | String | easy / medium / hard |
| company_mode | String | nullable |
| status | Enum | pending / in_progress / completed / abandoned |
| started_at / ended_at | DateTime | |

</details>

<details>
<summary><strong>questions · answers · scores</strong></summary>

**questions:** session_id FK · question_text · order_index · question_type · is_follow_up

**answers:** question_id FK · transcript · audio_duration · filler_word_count · filler_words_json · processing_status (`pending` / `scoring` / `scored` / `failed`) · attempt_number

**scores:** answer_id FK (unique) · technical_accuracy · clarity · star_alignment · completeness · overall_score · strengths_json · improvements_json · ideal_answer · follow_up_question

All score columns are `Float`, scale 0.0–10.0.

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

Docs at **`http://localhost:8000/docs`**

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
| `GET` | `/` | ✅ | ✅ |
| `POST` | `/start` | ✅ | ✅ |
| `GET` | `/{id}` | ✅ | ✅ |
| `PATCH` | `/{id}/end` | ✅ | ✅ |

### Answers — `/api/v1/answers`

| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| `POST` | `/` | ✅ | Returns 202 immediately |
| `GET` | `/{id}/score` | ✅ | Poll every 3s |

### Results — `/api/v1/results`

| Method | Endpoint | Auth | Status |
|---|---|---|---|
| `GET` | `/{session_id}` | ✅ | ✅ |

### Analytics — `/api/v1/analytics`

| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| `GET` | `/` | ✅ | Returns score trends, domain & difficulty stats, dimension averages |

### WebSocket — `/ws`

| Protocol | Endpoint | Auth |
|---|---|---|
| `WS` | `/interview/{session_id}?token=<jwt>` | Token in query param |

---

## 🗺 Development Phases

| Phase | What Gets Built | Status |
|---|---|---|
| **Phase 1** | FastAPI scaffold, CORS, Celery + Redis wired up | ✅ Complete |
| **Phase 2** | PostgreSQL schema, 5 SQLAlchemy models, Alembic migrations | ✅ Complete |
| **Phase 3** | JWT auth, httpOnly cookies, BFF proxy, middleware route guards | ✅ Complete |
| **Phase 4** | Interview session API, WebSocket audio pipeline, faster-whisper, live waveform UI | ✅ Complete |
| **Phase 5** | Question display, transcript persistence, Ollama scoring, Celery pipeline, results page, live dashboard | ✅ Complete |
| **Phase 6** | Multi-question sessions, (FAISS vector search and vosk filler word detection later) | ✅ Complete |
| **Phase 7** | Chart.js analytics dashboard, score trends, skill radar, domain & difficulty performance breakdown | ✅ Complete |
| **Phase 8** | Polish, error handling, performance tuning, deployment prep | 🔜 Next |
| **Phase 9** | Reserved | ⏳ Planned |

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
APP_ENV=development
DEBUG=True
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
```

### Frontend — `frontend/.env.local`

```env
JWT_SECRET_KEY=your_generated_secret_here   # must match backend .env exactly
```

> ⚠️ Never commit either file. Both are in `.gitignore`.

---

## 🙈 .gitignore

```gitignore
.env
.env.local
backend/venv/
__pycache__/
*.pyc
frontend/node_modules/
frontend/.next/
.DS_Store
Thumbs.db
```

---

<div align="center">

Built by DIVYAꨄ — BTech CSE, Netaji Subhas University Of Technology, Delhi.

</div>
