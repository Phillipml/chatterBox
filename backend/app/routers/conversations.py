from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException, Response, status

from app.config import settings
from app.db import get_db
from app.schemas.conversation import ConversationCreate, ConversationOut
from app.services import chat

router = APIRouter(prefix="/conversations", tags=["conversations"])


def _collection():
    return get_db()[settings.conversations_collection]


def _to_out(doc: dict) -> ConversationOut:
    return ConversationOut(
        id=str(doc["_id"]),
        title=doc.get("title"),
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )


@router.post("", response_model=ConversationOut, status_code=status.HTTP_201_CREATED)
async def create_conversation(body: ConversationCreate):
    now = datetime.now(timezone.utc)
    doc = {
        "title": body.title,
        "created_at": now,
        "updated_at": now,
    }
    result = await _collection().insert_one(doc)
    doc["_id"] = result.inserted_id
    return _to_out(doc)


@router.get("", response_model=list[ConversationOut])
async def list_conversations():
    cursor = _collection().find().sort("updated_at", -1)
    return [_to_out(doc) async for doc in cursor]


@router.get("/{conversation_id}", response_model=ConversationOut)
async def get_conversation(conversation_id: str):
    try:
        oid = ObjectId(conversation_id)
    except InvalidId:
        raise HTTPException(status_code=404, detail="Conversation not found")

    doc = await _collection().find_one({"_id": oid})
    if doc is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return _to_out(doc)


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_conversation(conversation_id: str):
    await chat.delete_conversation(conversation_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)