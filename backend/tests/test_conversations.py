async def test_create_conversation(client):
    r = await client.post("/conversations", json={"title": "Terra plana"})
    assert r.status_code == 201
    data = r.json()
    assert data["title"] == "Terra plana"
    assert "id" in data
    assert "created_at" in data
    assert "updated_at" in data


async def test_create_conversation_without_title(client):
    r = await client.post("/conversations", json={})
    assert r.status_code == 201
    assert r.json()["title"] is None


async def test_list_conversations(client):
    await client.post("/conversations", json={"title": "A"})
    await client.post("/conversations", json={"title": "B"})
    r = await client.get("/conversations")
    assert r.status_code == 200
    assert len(r.json()) == 2


async def test_get_conversation(client):
    created = await client.post("/conversations", json={"title": "x"})
    cid = created.json()["id"]
    r = await client.get(f"/conversations/{cid}")
    assert r.status_code == 200
    assert r.json()["id"] == cid


async def test_get_conversation_invalid_id(client):
    r = await client.get("/conversations/not-an-objectid")
    assert r.status_code == 404


async def test_get_conversation_missing(client):
    r = await client.get("/conversations/000000000000000000000000")
    assert r.status_code == 404


async def test_delete_conversation(client):
    created = await client.post("/conversations", json={"title": "del"})
    cid = created.json()["id"]
    r = await client.delete(f"/conversations/{cid}")
    assert r.status_code == 204
    assert (await client.get(f"/conversations/{cid}")).status_code == 404


async def test_delete_conversation_not_found(client):
    r = await client.delete("/conversations/000000000000000000000000")
    assert r.status_code == 404
