import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Conversation } from '../types';

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await api.listConversations();
      setConversations(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = useCallback(async (title?: string) => {
    const conv = await api.createConversation(title);
    setConversations((prev) => [conv, ...prev]);
    return conv;
  }, []);

  return { conversations, loading, refresh: load, create };
}
