"""POST /api/chat -- LLM (Groq) streaming reply with rule-based fallback."""
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from models.schemas import ChatRequest
from services.chatbot import stream_reply

router = APIRouter(tags=["chat"])


@router.post("/chat")
async def chat(req: ChatRequest) -> StreamingResponse:
    """Stream the bot reply token-by-token as text/plain chunks."""

    history = [t.model_dump() for t in (req.history or [])]

    async def streamer():
        async for chunk in stream_reply(req.message, history=history):
            if chunk:
                yield chunk

    return StreamingResponse(streamer(), media_type="text/plain; charset=utf-8")
