from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import close_mongo, connect_mongo
from app.routers.conversations import router as conversations_router
from app.routers.messages import router as messages_router
from app.routers.ws import router as ws_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_mongo()
    yield
    await close_mongo()


app = FastAPI(title="ChatterBox API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(conversations_router)
app.include_router(messages_router)
app.include_router(ws_router)


@app.get("/health")
async def health():
    from app.db import client

    mongo_ok = False
    if client is not None:
        try:
            await client.admin.command("ping")
            mongo_ok = True
        except Exception:
            mongo_ok = False

    return {"status": "ok" if mongo_ok else "degraded", "mongo": mongo_ok}
