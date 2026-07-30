from unittest.mock import AsyncMock, patch

from app.services import chat as chat_svc


async def fake_stream(_messages):
    for token in ["Terra ", "plana"]:
        yield token


def test_ws_stream(ws_client):
    created = ws_client.post("/conversations", json={})
    cid = created.json()["id"]

    with (
        patch("app.routers.ws.llm.stream_chat", fake_stream),
        ws_client.websocket_connect(f"/ws/conversations/{cid}") as ws,
    ):
        ws.send_text('{"type":"user_message","content":"oi"}')
        events = []
        while True:
            data = ws.receive_json()
            events.append(data)
            if data.get("type") == "ai_done":
                break

    types = [e["type"] for e in events]
    assert "user_saved" in types
    assert "ai_start" in types
    assert "ai_token" in types
    assert "ai_done" in types
    tokens = [e["content"] for e in events if e["type"] == "ai_token"]
    assert tokens == ["Terra ", "plana"]


def test_ws_invalid_conversation(ws_client):
    with ws_client.websocket_connect("/ws/conversations/not-valid") as ws:
        data = ws.receive_json()
        assert data["type"] == "error"
        assert data["detail"] == "Conversation not found"


def test_ws_invalid_json(ws_client):
    created = ws_client.post("/conversations", json={})
    cid = created.json()["id"]
    with ws_client.websocket_connect(f"/ws/conversations/{cid}") as ws:
        ws.send_text("not-json")
        data = ws.receive_json()
        assert data == {"type": "error", "detail": "Invalid JSON"}


def test_ws_wrong_type(ws_client):
    created = ws_client.post("/conversations", json={})
    cid = created.json()["id"]
    with ws_client.websocket_connect(f"/ws/conversations/{cid}") as ws:
        ws.send_text('{"type":"ping"}')
        data = ws.receive_json()
        assert data["detail"] == "Expected type=user_message"


def test_ws_empty_content(ws_client):
    created = ws_client.post("/conversations", json={})
    cid = created.json()["id"]
    with ws_client.websocket_connect(f"/ws/conversations/{cid}") as ws:
        ws.send_text('{"type":"user_message","content":"  "}')
        data = ws.receive_json()
        assert data["detail"] == "content is required"


def test_ws_empty_ai_response(ws_client):
    created = ws_client.post("/conversations", json={})
    cid = created.json()["id"]

    async def empty_stream(_messages):
        if False:
            yield ""

    with (
        patch("app.routers.ws.llm.stream_chat", empty_stream),
        ws_client.websocket_connect(f"/ws/conversations/{cid}") as ws,
    ):
        ws.send_text('{"type":"user_message","content":"oi"}')
        events = []
        while True:
            data = ws.receive_json()
            events.append(data)
            if data.get("type") == "error":
                break

    assert events[-1]["type"] == "error"
    assert "vazia" in events[-1]["detail"].lower()


def test_ws_handler_error(ws_client):
    created = ws_client.post("/conversations", json={})
    cid = created.json()["id"]

    with (
        patch(
            "app.routers.ws.chat.save_user_message",
            new=AsyncMock(side_effect=RuntimeError("boom")),
        ),
        ws_client.websocket_connect(f"/ws/conversations/{cid}") as ws,
    ):
        ws.send_text('{"type":"user_message","content":"oi"}')
        data = ws.receive_json()
        assert data["type"] == "error"
        assert "boom" in data["detail"]


async def test_maybe_set_title_missing_conversation(client):
    from bson import ObjectId

    await chat_svc.maybe_set_title(ObjectId(), "texto")
