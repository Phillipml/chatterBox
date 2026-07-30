from unittest.mock import AsyncMock, patch

from app.services import llm


async def test_list_messages_empty(client):
    created = await client.post("/conversations", json={})
    cid = created.json()["id"]
    r = await client.get(f"/conversations/{cid}/messages")
    assert r.status_code == 200
    assert r.json() == []


async def test_list_messages_not_found(client):
    r = await client.get("/conversations/000000000000000000000000/messages")
    assert r.status_code == 404


async def test_create_message_saves_user_and_ai(client):
    created = await client.post("/conversations", json={})
    cid = created.json()["id"]

    with patch("app.routers.messages.llm.chat", new=AsyncMock(return_value="Terra plana.")):
        r = await client.post(
            f"/conversations/{cid}/messages",
            json={"content": "Por que a Terra é plana?"},
        )

    assert r.status_code == 201
    body = r.json()
    assert body["role"] == "ai"
    assert body["content"] == "Terra plana."

    msgs = (await client.get(f"/conversations/{cid}/messages")).json()
    assert len(msgs) == 2
    assert msgs[0]["role"] == "user"
    assert msgs[1]["role"] == "ai"

    conv = (await client.get(f"/conversations/{cid}")).json()
    assert conv["title"] == "Por que a Terra é plana?"


async def test_create_message_truncates_title(client):
    created = await client.post("/conversations", json={})
    cid = created.json()["id"]
    long_text = "x" * 80

    with patch("app.routers.messages.llm.chat", new=AsyncMock(return_value="ok")):
        await client.post(f"/conversations/{cid}/messages", json={"content": long_text})

    conv = (await client.get(f"/conversations/{cid}")).json()
    assert conv["title"].endswith("…")
    assert len(conv["title"]) <= 41


async def test_create_message_keeps_existing_title(client):
    created = await client.post("/conversations", json={"title": "Fixo"})
    cid = created.json()["id"]

    with patch("app.routers.messages.llm.chat", new=AsyncMock(return_value="ok")):
        await client.post(f"/conversations/{cid}/messages", json={"content": "outra"})

    conv = (await client.get(f"/conversations/{cid}")).json()
    assert conv["title"] == "Fixo"


async def test_create_message_llm_error(client):
    created = await client.post("/conversations", json={})
    cid = created.json()["id"]

    with patch(
        "app.routers.messages.llm.chat",
        new=AsyncMock(side_effect=llm.LlmError("Erro no Groq: boom")),
    ):
        r = await client.post(
            f"/conversations/{cid}/messages",
            json={"content": "oi"},
        )

    assert r.status_code == 502
    assert "boom" in r.json()["detail"]


async def test_create_message_invalid_conversation(client):
    with patch("app.routers.messages.llm.chat", new=AsyncMock(return_value="ok")):
        r = await client.post(
            "/conversations/bad-id/messages",
            json={"content": "oi"},
        )
    assert r.status_code == 404
