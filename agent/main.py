from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv
load_dotenv()

from agent.agent_executor import run_agent
from agent.utils.memory_store import get_history, append_messages, clear_session, ping

app = FastAPI(
    title="CareSphere Agent Service",
    description="LangChain tool-calling agent with Redis memory",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["POST", "GET", "DELETE"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    userId: str
    message: str
    token: str
    sessionId: str          # NEW — frontend generates this once per chat session


class ChatResponse(BaseModel):
    reply: str
    sessionId: str          # Echo back so frontend can store it


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    if not req.userId or not req.message or not req.token or not req.sessionId:
        raise HTTPException(status_code=400, detail="userId, message, token, and sessionId are required")


    history = get_history(req.sessionId)

    reply = run_agent(
        token=req.token,
        user_id=req.userId,
        message=req.message,
        chat_history=history,
    )

  
    append_messages(req.sessionId, req.message, reply)

    return ChatResponse(reply=reply, sessionId=req.sessionId)


@app.delete("/chat/{session_id}")
async def clear_chat(session_id: str):
    """Clear a session's history — called when user starts a new chat."""
    clear_session(session_id)
    return {"status": "cleared", "sessionId": session_id}


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "caresphere-agent",
        "port": 8002,
        "redis": "connected" if ping() else "disconnected",
    }