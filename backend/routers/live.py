"""WebSocket /ws/live-updates — pushes congestion deltas every N seconds."""
import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from config import settings
from services.live import build_live_tick

router = APIRouter(tags=["live"])


@router.websocket("/ws/live-updates")
async def live_updates(ws: WebSocket) -> None:
    await ws.accept()
    try:
        # send an immediate snapshot, then tick on the configured interval
        await ws.send_json(build_live_tick())
        while True:
            await asyncio.sleep(settings.live_update_interval)
            await ws.send_json(build_live_tick())
    except WebSocketDisconnect:
        pass
    except Exception:
        await ws.close()
