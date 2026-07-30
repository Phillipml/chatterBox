import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import type { Message, WsServerMessage } from '../types';

const WS_BASE = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000';
const DELAYS = [1000, 2000, 5000];

type Status = 'connecting' | 'open' | 'reconnecting' | 'closed';

interface Options {
  conversationId: string;
  onUserSaved: (message: Message) => void;
  onAiStart: () => void;
  onAiToken: (token: string) => void;
  onAiDone: (message: Message) => void;
  onError: (detail: string) => void;
}

export function useChatSocket({
  conversationId,
  onUserSaved,
  onAiStart,
  onAiToken,
  onAiDone,
  onError,
}: Options) {
  const [status, setStatus] = useState<Status>('connecting');
  const wsRef = useRef<WebSocket | null>(null);
  const attemptsRef = useRef(0);
  const intentionalClose = useRef(false);
  const handlers = useRef({ onUserSaved, onAiStart, onAiToken, onAiDone, onError });

  useEffect(() => {
    handlers.current = { onUserSaved, onAiStart, onAiToken, onAiDone, onError };
  });

  useEffect(() => {
    intentionalClose.current = false;
    attemptsRef.current = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      setStatus(attemptsRef.current === 0 ? 'connecting' : 'reconnecting');
      const ws = new WebSocket(`${WS_BASE}/ws/conversations/${conversationId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        attemptsRef.current = 0;
        setStatus('open');
      };

      ws.onmessage = (event) => {
        let data: WsServerMessage;
        try {
          data = JSON.parse(event.data as string) as WsServerMessage;
        } catch {
          return;
        }
        const h = handlers.current;
        switch (data.type) {
          case 'user_saved':
            h.onUserSaved(data.message);
            break;
          case 'ai_start':
            h.onAiStart();
            break;
          case 'ai_token':
            h.onAiToken(data.content);
            break;
          case 'ai_done':
            h.onAiDone(data.message);
            break;
          case 'error':
            h.onError(data.detail);
            break;
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (intentionalClose.current) {
          setStatus('closed');
          return;
        }
        if (attemptsRef.current >= DELAYS.length) {
          setStatus('closed');
          handlers.current.onError('Conexão perdida. Usando modo REST.');
          return;
        }
        const delay = DELAYS[attemptsRef.current++];
        setStatus('reconnecting');
        timer = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      intentionalClose.current = true;
      clearTimeout(timer);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [conversationId]);

  const send = useCallback(
    async (content: string) => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'user_message', content }));
        return;
      }
      try {
        const aiMsg = await api.sendMessage(conversationId, content);
        handlers.current.onUserSaved({
          id: `rest-user-${Date.now()}`,
          conversation_id: conversationId,
          role: 'user',
          content,
          created_at: new Date().toISOString(),
        });
        handlers.current.onAiDone(aiMsg);
      } catch (err) {
        const detail = err instanceof Error ? err.message : 'Falha ao enviar. Tente de novo.';
        handlers.current.onUserSaved({
          id: `rest-user-${Date.now()}`,
          conversation_id: conversationId,
          role: 'user',
          content,
          created_at: new Date().toISOString(),
        });
        handlers.current.onError(detail);
      }
    },
    [conversationId],
  );

  return { status, send };
}
