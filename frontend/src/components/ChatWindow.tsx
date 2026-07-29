import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import type { Message } from '../types';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';

interface Props {
  conversationId: string;
}

export function ChatWindow({ conversationId }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [prevId, setPrevId] = useState(conversationId);
  const bottomRef = useRef<HTMLDivElement>(null);

  if (conversationId !== prevId) {
    setPrevId(conversationId);
    setMessages([]);
    setLoading(true);
    setSending(false);
  }

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

  const handleSend = async (content: string) => {
    const optimistic: Message = {
      id: `opt-${Date.now()}`,
      conversation_id: conversationId,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setSending(true);

    try {
      const aiMsg = await api.sendMessage(conversationId, content);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimistic.id),
        { ...optimistic, id: `confirmed-${Date.now()}` },
        aiMsg,
      ]);
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
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
        {sending && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm border border-border bg-secondary px-4 py-3 text-sm text-secondary">
              <span className="animate-pulse">digitando…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <MessageInput onSend={handleSend} disabled={sending} />
    </div>
  );
}
