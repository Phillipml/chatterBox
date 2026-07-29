from datetime import UTC, datetime

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException

from app.config import settings
from app.db import get_db
from app.schemas.message import MessageOut


def conversations():
    return get_db()[settings.conversations_collection]


def messages():
    return get_db()[settings.messages_collection]


def parse_conversation_oid(conversation_id: str) -> ObjectId:
    try:
        return ObjectId(conversation_id)
    except InvalidId:
        raise HTTPException(status_code=404, detail="Conversation not found") from None


async def get_conversation_or_404(conversation_id: str) -> ObjectId:
    oid = parse_conversation_oid(conversation_id)
    doc = await conversations().find_one({"_id": oid})
    if doc is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return oid


def message_to_out(doc: dict) -> MessageOut:
    return MessageOut(
        id=str(doc["_id"]),
        conversation_id=str(doc["conversation_id"]),
        role=doc["role"],
        content=doc["content"],
        created_at=doc["created_at"],
    )


def to_llm_messages(docs: list[dict]) -> list[dict]:
    mapped = []
    for doc in docs:
        role = "assistant" if doc["role"] == "ai" else "user"
        mapped.append({"role": role, "content": doc["content"]})
    return mapped


def _title_from_content(content: str) -> str:
    title = content.strip().replace("\n", " ")
    max_len = settings.conversation_title_max_len
    if len(title) > max_len:
        title = title[:max_len].rstrip() + "…"
    return title


async def maybe_set_title(conversation_oid: ObjectId, content: str) -> None:
    conv = await conversations().find_one({"_id": conversation_oid})
    if not conv:
        return
    if conv.get("title"):
        return
    await conversations().update_one(
        {"_id": conversation_oid},
        {"$set": {"title": _title_from_content(content)}},
    )


async def save_user_message(conversation_oid: ObjectId, content: str) -> dict:
    now = datetime.now(UTC)
    doc = {
        "conversation_id": conversation_oid,
        "role": "user",
        "content": content,
        "created_at": now,
    }
    result = await messages().insert_one(doc)
    doc["_id"] = result.inserted_id
    await maybe_set_title(conversation_oid, content)
    return doc


async def load_context(conversation_oid: ObjectId) -> list[dict]:
    limit = settings.llm_context_limit
    history = (
        await messages()
        .find({"conversation_id": conversation_oid})
        .sort("created_at", -1)
        .limit(limit)
        .to_list(length=limit)
    )
    history.reverse()
    return history


async def save_ai_message(conversation_oid: ObjectId, content: str) -> dict:
    now = datetime.now(UTC)
    doc = {
        "conversation_id": conversation_oid,
        "role": "ai",
        "content": content,
        "created_at": now,
    }
    result = await messages().insert_one(doc)
    doc["_id"] = result.inserted_id
    await conversations().update_one(
        {"_id": conversation_oid},
        {"$set": {"updated_at": now}},
    )
    return doc


async def delete_conversation(conversation_id: str) -> None:
    oid = await get_conversation_or_404(conversation_id)
    await messages().delete_many({"conversation_id": oid})
    await conversations().delete_one({"_id": oid})
