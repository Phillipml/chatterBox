from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException, status

from app.config import settings
from app.db import get_db
from app.schemas.message import MessageCreate, MessageOut
from app.services import llm

router = APIRouter(
    prefix="/conversations/{conversation_id}/messages",
    tags=["messages"],
)


def _conversations():
    return get_db()[settings.conversations_collection]


def _messages():
    return get_db()[settings.messages_collection]


def _parse_oid(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except InvalidId:
        raise HTTPException(status_code=404, detail="Conversation not found")


async def _get_conversation_or_404(conversation_id: str) -> ObjectId:
    oid = _parse_oid(conversation_id)
    doc = await _conversations().find_one({"_id": oid})
    if doc is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return oid


def _to_out(doc: dict) -> MessageOut:
    return MessageOut(
        id=str(doc["_id"]),
        conversation_id=str(doc["conversation_id"]),
        role=doc["role"],
        content=doc["content"],
        created_at=doc["created_at"],
    )


def _to_llm_messages(docs: list[dict]) -> list[dict]:
    """Mongo role 'ai' → OpenAI/Groq role 'assistant'."""
    mapped = []
    for doc in docs:
        role = "assistant" if doc["role"] == "ai" else "user"
        mapped.append({"role": role, "content": doc["content"]})
    return mapped


@router.get("", response_model=list[MessageOut])
async def list_messages(conversation_id: str):
    oid = await _get_conversation_or_404(conversation_id)
    cursor = _messages().find({"conversation_id": oid}).sort("created_at", 1)
    return [_to_out(doc) async for doc in cursor]


@router.post("", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
async def create_message(conversation_id: str, body: MessageCreate):
    oid = await _get_conversation_or_404(conversation_id)
    now = datetime.now(timezone.utc)

    # 1) salva user
    user_doc = {
        "conversation_id": oid,
        "role": "user",
        "content": body.content,
        "created_at": now,
    }
    user_result = await _messages().insert_one(user_doc)
    user_doc["_id"] = user_result.inserted_id

    # 2) contexto (últimas N, ordem cronológica)
    limit = settings.llm_context_limit
    history = (
        await _messages()
        .find({"conversation_id": oid})
        .sort("created_at", -1)
        .limit(limit)
        .to_list(length=limit)
    )
    history.reverse()

    # 3) Groq
    ai_text = await llm.chat(_to_llm_messages(history))

    # 4) salva ai
    ai_now = datetime.now(timezone.utc)
    ai_doc = {
        "conversation_id": oid,
        "role": "ai",
        "content": ai_text,
        "created_at": ai_now,
    }
    ai_result = await _messages().insert_one(ai_doc)
    ai_doc["_id"] = ai_result.inserted_id

    # 5) bump updated_at da conversa
    await _conversations().update_one(
        {"_id": oid},
        {"$set": {"updated_at": ai_now}},
    )

    # 6) devolve a resposta da IA (pedido do case)
    return _to_out(ai_doc)