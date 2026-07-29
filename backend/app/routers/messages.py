from fastapi import APIRouter, status

from app.schemas.message import MessageCreate, MessageOut
from app.services import chat, llm

router = APIRouter(
    prefix="/conversations/{conversation_id}/messages",
    tags=["messages"],
)


@router.get("", response_model=list[MessageOut])
async def list_messages(conversation_id: str):
    oid = await chat.get_conversation_or_404(conversation_id)
    cursor = chat.messages().find({"conversation_id": oid}).sort("created_at", 1)
    return [chat.message_to_out(doc) async for doc in cursor]


@router.post("", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
async def create_message(conversation_id: str, body: MessageCreate):
    oid = await chat.get_conversation_or_404(conversation_id)
    await chat.save_user_message(oid, body.content)
    history = await chat.load_context(oid)
    ai_text = await llm.chat(chat.to_llm_messages(history))
    ai_doc = await chat.save_ai_message(oid, ai_text)
    return chat.message_to_out(ai_doc)