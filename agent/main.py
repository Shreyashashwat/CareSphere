from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv
load_dotenv()

from agent.agent_executor import run_agent

app = FastAPI(
    title="CareSphere Agent Service",
    description="LangChain tool-calling agent for CareSphere",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


class ChatMessage(BaseModel):
    role: str      
    content: str


class ChatRequest(BaseModel):
    userId: str
    message: str
    token: str                                     
    chat_history: Optional[List[ChatMessage]] = []


class ChatResponse(BaseModel):
    reply: str


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    if not req.userId or not req.message or not req.token:
        raise HTTPException(status_code=400, detail="userId, message, and token are required")


    history = [{"role": m.role, "content": m.content} for m in req.chat_history]

    reply = run_agent(
        token=req.token,
        user_id=req.userId,
        message=req.message,
        chat_history=history,
    )

    return ChatResponse(reply=reply)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "caresphere-agent", "port": 8002}