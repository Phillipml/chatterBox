const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export const api = {
  listConversations: () => request<import('../types').Conversation[]>('/conversations'),

  createConversation: (title?: string) =>
    request<import('../types').Conversation>('/conversations', {
      method: 'POST',
      body: JSON.stringify({ title: title ?? null }),
    }),

  deleteConversation: (conversationId: string) =>
    request<void>(`/conversations/${conversationId}`, { method: 'DELETE' }),

  listMessages: (conversationId: string) =>
    request<import('../types').Message[]>(`/conversations/${conversationId}/messages`),

  sendMessage: (conversationId: string, content: string) =>
    request<import('../types').Message>(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
};