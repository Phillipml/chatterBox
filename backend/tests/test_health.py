from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app import db as db_mod
from app.config import settings


async def test_health_ok(client):
    r = await client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["mongo"] is True


async def test_health_degraded(client):
    mock_client = MagicMock()
    mock_client.admin.command = AsyncMock(side_effect=RuntimeError("down"))
    with patch.object(db_mod, "client", mock_client):
        r = await client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "degraded", "mongo": False}


async def test_health_no_client(client):
    with patch.object(db_mod, "client", None):
        r = await client.get("/health")
    assert r.json()["mongo"] is False


def test_cors_origins_list():
    assert "http://localhost:5173" in settings.cors_origins_list


def test_get_db_raises_when_disconnected():
    with (
        patch.object(db_mod, "db", None),
        pytest.raises(RuntimeError, match="MongoDB"),
    ):
        db_mod.get_db()


async def test_close_mongo_when_already_closed():
    await db_mod.close_mongo()
    await db_mod.close_mongo()
    await db_mod.connect_mongo()
