import os

os.environ["MONGODB_URI"] = os.environ.get("MONGODB_URI", "mongodb://localhost:27017")
os.environ["MONGODB_DB"] = "chatterbox_test"
os.environ["GROQ_API_KEY"] = "test-fake-key"

import pytest
from httpx import ASGITransport, AsyncClient
from pymongo import MongoClient
from starlette.testclient import TestClient

from app.config import settings
from app.db import close_mongo, connect_mongo, get_db
from app.main import app


def _wipe_sync():
    client = MongoClient(settings.mongodb_uri)
    db = client[settings.mongodb_db]
    db[settings.conversations_collection].delete_many({})
    db[settings.messages_collection].delete_many({})
    client.close()


async def _wipe():
    db = get_db()
    await db[settings.conversations_collection].delete_many({})
    await db[settings.messages_collection].delete_many({})


@pytest.fixture
async def client():
    await connect_mongo()
    await _wipe()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    await _wipe()
    await close_mongo()


@pytest.fixture
def ws_client():
    _wipe_sync()
    with TestClient(app) as tc:
        yield tc
    _wipe_sync()
