from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from app.services import llm


async def test_chat_returns_content():
    response = SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(content="resposta"))]
    )
    mock_create = AsyncMock(return_value=response)
    with patch.object(llm._client.chat.completions, "create", mock_create):
        result = await llm.chat([{"role": "user", "content": "oi"}])
    assert result == "resposta"
    kwargs = mock_create.await_args.kwargs
    assert kwargs["messages"][0]["role"] == "system"
    assert kwargs["messages"][1]["content"] == "oi"


async def test_chat_returns_empty_when_none():
    response = SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=None))])
    with patch.object(
        llm._client.chat.completions,
        "create",
        AsyncMock(return_value=response),
    ):
        assert await llm.chat([]) == ""


async def test_stream_chat_yields_tokens():
    chunks = [
        SimpleNamespace(choices=[SimpleNamespace(delta=SimpleNamespace(content="a"))]),
        SimpleNamespace(choices=[SimpleNamespace(delta=SimpleNamespace(content=None))]),
        SimpleNamespace(choices=[SimpleNamespace(delta=SimpleNamespace(content="b"))]),
    ]

    async def fake_create(**_kwargs):
        async def gen():
            for chunk in chunks:
                yield chunk

        return gen()

    with patch.object(llm._client.chat.completions, "create", fake_create):
        tokens = [t async for t in llm.stream_chat([{"role": "user", "content": "x"}])]
    assert tokens == ["a", "b"]


def test_with_system_prepends_prompt():
    msgs = llm._with_system([{"role": "user", "content": "hi"}])
    assert msgs[0]["role"] == "system"
    assert "plana" in msgs[0]["content"].lower()
    assert msgs[1]["content"] == "hi"
