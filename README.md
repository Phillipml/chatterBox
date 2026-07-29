# ChatterBox 2.0 (PoC)

Chat multi-conversa com IA (persona flat-earth), FastAPI + Mongo + React, streaming via WebSocket.

## Subir tudo com Docker

1. Copie o env e preencha a chave Groq:

```bash
cp .env.example .env
```

## Lint / format (backend)

```bash
cd backend
pip install -r requirements-dev.txt
ruff check app --fix
ruff format app
```