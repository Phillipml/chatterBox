import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './client';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('api client', () => {
  it('listConversations faz GET', async () => {
    const data = [{ id: '1', title: 'a', created_at: '', updated_at: '' }];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(data),
      }),
    );
    await expect(api.listConversations()).resolves.toEqual(data);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/conversations'),
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });

  it('createConversation envia POST', async () => {
    const conv = { id: '1', title: null, created_at: '', updated_at: '' };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        text: async () => JSON.stringify(conv),
      }),
    );
    await expect(api.createConversation()).resolves.toEqual(conv);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/conversations'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ title: null }),
      }),
    );
  });

  it('deleteConversation trata 204', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
        text: async () => '',
      }),
    );
    await expect(api.deleteConversation('abc')).resolves.toBeUndefined();
  });

  it('listMessages e sendMessage', async () => {
    const msgs = [
      {
        id: 'm1',
        conversation_id: 'c1',
        role: 'user',
        content: 'oi',
        created_at: '',
      },
    ];
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => JSON.stringify(msgs),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          text: async () => JSON.stringify(msgs[0]),
        }),
    );
    await expect(api.listMessages('c1')).resolves.toEqual(msgs);
    await expect(api.sendMessage('c1', 'oi')).resolves.toEqual(msgs[0]);
  });

  it('lança erro quando resposta nao ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => '',
      }),
    );
    await expect(api.listConversations()).rejects.toThrow('API 500');
  });

  it('retorna undefined para body vazio', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => '',
      }),
    );
    await expect(api.listConversations()).resolves.toBeUndefined();
  });
});
