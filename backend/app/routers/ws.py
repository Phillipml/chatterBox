import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.exceptions import HTTPException

from app.services import chat, llm

router = APIRouter(tags=["websocket"])


def _msg_payload(doc: dict) -> dict:
    out = chat.message_to_out(doc)
    return out.model_dump(mode="json")


@router.websocket("/ws/conversations/{conversation_id}")
async def conversation_ws(websocket: WebSocket, conversation_id: str):
    await websocket.accept()

    try:
        oid = await chat.get_conversation_or_404(conversation_id)
    except HTTPException as exc:
        await websocket.send_json({"type": "error", "detail": exc.detail})
        await websocket.close(code=1008)
        return

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "detail": "Invalid JSON"})
                continue

            if data.get("type") != "user_message":
                await websocket.send_json({"type": "error", "detail": "Expected type=user_message"})
                continue

            content = (data.get("content") or "").strip()
            if not content:
                await websocket.send_json({"type": "error", "detail": "content is required"})
                continue

            try:
                user_doc = await chat.save_user_message(oid, content)
                await websocket.send_json({"type": "user_saved", "message": _msg_payload(user_doc)})

                await websocket.send_json({"type": "ai_start"})

                history = await chat.load_context(oid)
                pieces: list[str] = []
                async for token in llm.stream_chat(chat.to_llm_messages(history)):
                    pieces.append(token)
                    await websocket.send_json({"type": "ai_token", "content": token})

                ai_text = "".join(pieces)
                ai_doc = await chat.save_ai_message(oid, ai_text)
                await websocket.send_json({"type": "ai_done", "message": _msg_payload(ai_doc)})
            except Exception as exc:
                await websocket.send_json({"type": "error", "detail": str(exc)})
    except WebSocketDisconnect:
        return
