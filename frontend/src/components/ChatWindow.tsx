import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { useChatSocket } from '../hooks/useChatSocket';
import type { Message } from '../types';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';

interface Props {
  conversationId: string;
  onConversationUpdated?: () => void;
}

const STREAMING_ID = '__streaming_ai__';

export function ChatWindow({ conversationId, onConversationUpdated }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorLabel, setErrorLabel] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const sendingRef = useRef(false);

  const setSendingBoth = (value: boolean) => {
    sendingRef.current = value;
    setSending(value);
  };

  useEffect(() => {
    let cancelled = false;
    api.listMessages(conversationId).then((msgs) => {
      if (!cancelled) {
        setMessages(msgs);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const onUserSaved = useCallback(
    (message: Message) => {
      setMessages((prev) => {
        const withoutOpt = prev.filter((m) => !m.id.startsWith('opt-'));
        return [...withoutOpt, message];
      });
      onConversationUpdated?.();
    },
    [onConversationUpdated],
  );

  const onAiStart = useCallback(() => {
    setMessages((prev) => [
      ...prev,
      {
        id: STREAMING_ID,
        conversation_id: conversationId,
        role: 'ai',
        content: '',
        created_at: new Date().toISOString(),
      },
    ]);
  }, [conversationId]);

  const onAiToken = useCallback((token: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === STREAMING_ID ? { ...m, content: m.content + token } : m)),
    );
  }, []);

  const onAiDone = useCallback((message: Message) => {
    setMessages((prev) => [...prev.filter((m) => m.id !== STREAMING_ID), message]);
    setSendingBoth(false);
  }, []);

  const onError = useCallback(
    (detail: string) => {
      if (sendingRef.current) {
        setMessages((prev) => {
          const errMsg: Message = {
            id: `err-${Date.now()}`,
            conversation_id: conversationId,
            role: 'ai',
            content: detail,
            created_at: new Date().toISOString(),
          };
          const withoutStreaming = prev.filter((m) => m.id !== STREAMING_ID);
          return [...withoutStreaming, errMsg];
        });
        setSendingBoth(false);
        return;
      }
      setErrorLabel(detail);
      setSendingBoth(false);
    },
    [conversationId],
  );

  const { status, send } = useChatSocket({
    conversationId,
    onUserSaved,
    onAiStart,
    onAiToken,
    onAiDone,
    onError,
  });

  const [prevStatus, setPrevStatus] = useState(status);
  if (status !== prevStatus) {
    setPrevStatus(status);
    if (status === 'open') setErrorLabel(null);
  }

  const statusLabel = status === 'reconnecting' ? 'Reconectando…' : errorLabel;

  const handleSend = async (content: string) => {
    if (sending) return;
    setSendingBoth(true);
    setErrorLabel(null);
    setMessages((prev) => [
      ...prev,
      {
        id: `opt-${Date.now()}`,
        conversation_id: conversationId,
        role: 'user',
        content,
        created_at: new Date().toISOString(),
      },
    ]);
    try {
      await send(content);
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Falha ao enviar. Tente de novo.';
      setMessages((prev) => {
        const withoutOpt = prev.filter((m) => !m.id.startsWith('opt-'));
        return [
          ...withoutOpt,
          {
            id: `opt-${Date.now()}`,
            conversation_id: conversationId,
            role: 'user',
            content,
            created_at: new Date().toISOString(),
          },
          {
            id: `err-${Date.now()}`,
            conversation_id: conversationId,
            role: 'ai',
            content: detail,
            created_at: new Date().toISOString(),
          },
        ];
      });
      setSendingBoth(false);
    }
  };

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      {statusLabel && (
        <p className="border-b border-border bg-secondary px-4 py-2 text-center text-xs text-secondary">
          {statusLabel}
        </p>
      )}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-6">
        {loading && (
          <p className="text-center text-sm text-secondary">Carregando mensagens…</p>
        )}
        {!loading && messages.length === 0 && (
          <p className="text-center text-sm text-secondary">
            Diga olá para começar a conversa.
          </p>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        <div ref={bottomRef} />
      </div>
      <MessageInput onSend={handleSend} sending={sending} />
    </div>
  );
}
