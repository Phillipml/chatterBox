from datetime import UTC, datetime

from app.services.chat import _title_from_content, message_to_out, to_llm_messages


def test_message_to_out():
    now = datetime.now(UTC)
    out = message_to_out(
        {
            "_id": "aaaaaaaaaaaaaaaaaaaaaaaa",
            "conversation_id": "bbbbbbbbbbbbbbbbbbbbbbbb",
            "role": "user",
            "content": "oi",
            "created_at": now,
        }
    )
    assert out.id == "aaaaaaaaaaaaaaaaaaaaaaaa"
    assert out.role == "user"
    assert out.content == "oi"


def test_to_llm_messages_maps_roles():
    docs = [
        {"role": "user", "content": "u"},
        {"role": "ai", "content": "a"},
    ]
    mapped = to_llm_messages(docs)
    assert mapped == [
        {"role": "user", "content": "u"},
        {"role": "assistant", "content": "a"},
    ]


def test_title_from_content_strips_and_truncates():
    assert _title_from_content("  hello\nworld  ") == "hello world"
    long_title = _title_from_content("a" * 100)
    assert long_title.endswith("…")
