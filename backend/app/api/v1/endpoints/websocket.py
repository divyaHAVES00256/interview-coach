# backend/app/api/v1/endpoints/websocket.py
# WebSocket endpoint for real-time audio transcription.

import json
import os
import asyncio
import tempfile
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.security import decode_access_token
from app.models.user import User
from app.models.interview_session import InterviewSession  

# ── Load Whisper model once at module load time ───────────────────────────────
try:
    from faster_whisper import WhisperModel
    whisper_model = WhisperModel("tiny", device="cpu", compute_type="int8")
    print("✅ faster-whisper model loaded (tiny, int8)")
except Exception as e:
    whisper_model = None
    print(f"⚠️  faster-whisper failed to load: {e}. Transcription will return placeholder text.")

router = APIRouter()


# ── Helper: authenticate a WebSocket connection ───────────────────────────────

def _get_user_from_token(token: str, db: Session) -> Optional[User]:
    payload = decode_access_token(token)
    if not payload:
        return None

    # 'sub' stores the user ID as a string (set in create_access_token)
    user_id_str = payload.get("sub")
    if not user_id_str:
        return None

    try:
        user_id = int(user_id_str)
    except (ValueError, TypeError):
        return None

    return db.query(User).filter(User.id == user_id, User.is_active == True).first()


# ── Helper: transcribe one audio chunk ───────────────────────────────────────

def _transcribe_chunk(audio_bytes: bytes, chunk_index: int) -> str:
    if whisper_model is None:
        # Fallback when model didn't load 
        return f"[Transcription unavailable — check faster-whisper installation]"

    # NamedTemporaryFile with delete=False so we can pass the path to whisper,
    # then manually delete it in the finally block
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(
            suffix=".webm",
            delete=False,
            prefix=f"interview_chunk_{chunk_index}_",
        ) as tmp_file:
            tmp_file.write(audio_bytes)
            tmp_path = tmp_file.name

        segments, _info = whisper_model.transcribe(
            tmp_path,
            beam_size=1,            
            language="en",      
            vad_filter=True,    
            vad_parameters={"min_silence_duration_ms": 300},
        )

        # segments is a generator — we consume it here (inside the try block)
        transcript = " ".join(seg.text.strip() for seg in segments)
        return transcript if transcript else "[silence]"

    except Exception as e:
        print(f"Transcription error on chunk {chunk_index}: {e}")
        return f"[Transcription error: {str(e)}]"

    finally:
        # Always clean up the temp file, even if transcription threw
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


# ── WebSocket endpoint ────────────────────────────────────────────────────────

@router.websocket("/interview/{session_id}")
async def websocket_interview(
    websocket: WebSocket,
    session_id: int,
    token: str = Query(..., description="JWT access token for authentication"),
    db: Session = Depends(get_db),
):

    # 1. Authenticate — before accepting the connection
    user = _get_user_from_token(token, db)
    if not user:
        await websocket.accept()
        await websocket.close(code=4001, reason="Unauthorized: invalid or expired token")
        return

    # 2. Verify session ownership
    session = (
        db.query(InterviewSession)
        .filter(
            InterviewSession.id == session_id,
            InterviewSession.user_id == user.id,
        )
        .first()
    )
    if not session:
        await websocket.accept()
        await websocket.close(code=4004, reason="Session not found")
        return

    # 3. Accept the WebSocket connection — nothing is sent to client until here
    await websocket.accept()

    # 4. Send initial "connected" confirmation
    await websocket.send_text(json.dumps({
        "type": "status",
        "status": "connected",
        "message": f"Session {session_id} is live. Start speaking.",
    }))

    chunk_index = 0

    try:
        while True:
            data = await websocket.receive()

            # Handle clean disconnection
            if data.get("type") == "websocket.disconnect":
                print(f"Client cleanly disconnected from session {session_id}")
                break

            if "bytes" in data and data["bytes"]:
                audio_bytes = data["bytes"]
                chunk_index += 1

                # Tell the client we received the chunk and are processing
                await websocket.send_text(json.dumps({
                    "type": "status",
                    "status": "processing",
                    "message": f"Transcribing chunk {chunk_index}…",
                }))

                # Run transcription in the thread pool 
                loop = asyncio.get_running_loop()
                transcript = await loop.run_in_executor(
                    None,               
                    _transcribe_chunk,  
                    audio_bytes,        
                    chunk_index,        
                )

                # Send transcript back to client
                await websocket.send_text(json.dumps({
                    "type": "transcript",
                    "text": transcript,
                    "is_final": True,
                    "chunk_index": chunk_index,
                }))

            elif "text" in data and data["text"]:
                # Handle control messages from client (e.g., ping)
                try:
                    msg = json.loads(data["text"])
                    if msg.get("type") == "ping":
                        await websocket.send_text(json.dumps({"type": "pong"}))
                except json.JSONDecodeError:
                    pass  

    except WebSocketDisconnect:
        # This fires when the client closes the connection without a clean close frame
        print(f"WebSocket disconnected (session {session_id}, user {user.id})")

    except Exception as e:
        print(f"Unexpected WebSocket error (session {session_id}): {e}")
        # Try to send an error before the connection dies
        try:
            await websocket.send_text(json.dumps({
                "type": "error",
                "code": "INTERNAL_ERROR",
                "message": "An unexpected server error occurred.",
            }))
        except Exception:
            pass  # Connection may already be dead