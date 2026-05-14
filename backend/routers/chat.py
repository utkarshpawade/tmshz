"""POST /api/chat — rule-based TrafficBot with a streamed reply."""
import asyncio

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from models.schemas import ChatRequest
from services.chatbot import generate_reply

router = APIRouter(tags=["chat"])


@router.post("/chat")
async def chat(req: ChatRequest) -> StreamingResponse:
    """Stream the bot reply token-by-token as text/plain chunks."""
    reply = generate_reply(req.message)

    async def streamer():
        words = reply.split(" ")
        for i, word in enumerate(words):
            yield word if i == 0 else " " + word
            await asyncio.sleep(0.035)

    return StreamingResponse(streamer(), media_type="text/plain; charset=utf-8")
