import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import { useConversations } from './useConversations';

vi.mock('../api/client', () => ({
  api: {
    listConversations: vi.fn(),
    createConversation: vi.fn(),
    deleteConversation: vi.fn(),
  },
}));

describe('useConversations', () => {
  beforeEach(() => {
    vi.mocked(api.listConversations).mockResolvedValue([]);
    vi.mocked(api.createConversation).mockReset();
    vi.mocked(api.deleteConversation).mockReset();
  });

  it('carrega lista no mount', async () => {
    vi.mocked(api.listConversations).mockResolvedValue([
      { id: '1', title: 't', created_at: '', updated_at: '' },
    ]);
    const { result } = renderHook(() => useConversations());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.conversations).toHaveLength(1);
  });

  it('create adiciona no topo', async () => {
    const conv = { id: '2', title: null, created_at: '', updated_at: '' };
    vi.mocked(api.createConversation).mockResolvedValue(conv);
    const { result } = renderHook(() => useConversations());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.create();
    });
    expect(result.current.conversations[0]).toEqual(conv);
  });

  it('remove filtra conversa', async () => {
    vi.mocked(api.listConversations).mockResolvedValue([
      { id: '1', title: 't', created_at: '', updated_at: '' },
    ]);
    vi.mocked(api.deleteConversation).mockResolvedValue(undefined);
    const { result } = renderHook(() => useConversations());
    await waitFor(() => expect(result.current.conversations).toHaveLength(1));
    await act(async () => {
      await result.current.remove('1');
    });
    expect(result.current.conversations).toHaveLength(0);
  });
});
