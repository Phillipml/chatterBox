import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import { useChatSocket } from './useChatSocket';

vi.mock('../api/client', () => ({
  api: {
    sendMessage: vi.fn(),
  },
}));

class MockWebSocket {
  static OPEN = 1;
  static instances: MockWebSocket[] = [];
  readyState = 0;
  onopen: ((ev?: Event) => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  url: string;
  sent: string[] = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
    queueMicrotask(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.(new Event('open'));
    });
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.readyState = 3;
    this.onclose?.();
  }

  emit(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  emitRaw(data: string) {
    this.onmessage?.({ data });
  }
}

describe('useChatSocket', () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    vi.stubGlobal('WebSocket', MockWebSocket);
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const handlers = () => ({
    onUserSaved: vi.fn(),
    onAiStart: vi.fn(),
    onAiToken: vi.fn(),
    onAiDone: vi.fn(),
    onError: vi.fn(),
  });

  it('conecta e despacha eventos ws', async () => {
    const h = handlers();
    const { result } = renderHook(() => useChatSocket({ conversationId: 'c1', ...h }));
    await waitFor(() => expect(result.current.status).toBe('open'));
    const ws = MockWebSocket.instances[0];
    act(() => {
      ws.emit({
        type: 'user_saved',
        message: {
          id: '1',
          conversation_id: 'c1',
          role: 'user',
          content: 'oi',
          created_at: '',
        },
      });
      ws.emit({ type: 'ai_start' });
      ws.emit({ type: 'ai_token', content: 'x' });
      ws.emit({
        type: 'ai_done',
        message: {
          id: '2',
          conversation_id: 'c1',
          role: 'assistant',
          content: 'x',
          created_at: '',
        },
      });
      ws.emit({ type: 'error', detail: 'falhou' });
      ws.emitRaw('not-json');
    });
    expect(h.onUserSaved).toHaveBeenCalled();
    expect(h.onAiStart).toHaveBeenCalled();
    expect(h.onAiToken).toHaveBeenCalledWith('x');
    expect(h.onAiDone).toHaveBeenCalled();
    expect(h.onError).toHaveBeenCalledWith('falhou');
  });

  it('send usa websocket quando aberto', async () => {
    const h = handlers();
    const { result } = renderHook(() => useChatSocket({ conversationId: 'c1', ...h }));
    await waitFor(() => expect(result.current.status).toBe('open'));
    await act(async () => {
      await result.current.send('hello');
    });
    expect(MockWebSocket.instances[0].sent[0]).toContain('hello');
  });

  it('send faz fallback REST quando ws fechado', async () => {
    const h = handlers();
    vi.mocked(api.sendMessage).mockResolvedValue({
      id: 'ai',
      conversation_id: 'c1',
      role: 'assistant',
      content: 'resp',
      created_at: '',
    });
    const { result } = renderHook(() => useChatSocket({ conversationId: 'c1', ...h }));
    await waitFor(() => expect(result.current.status).toBe('open'));
    act(() => {
      MockWebSocket.instances[0].readyState = 3;
    });
    await act(async () => {
      await result.current.send('via rest');
    });
    expect(api.sendMessage).toHaveBeenCalledWith('c1', 'via rest');
    expect(h.onUserSaved).toHaveBeenCalled();
    expect(h.onAiDone).toHaveBeenCalled();
  });

  it('reconecta e depois marca closed', async () => {
    class FlakyWebSocket {
      static OPEN = 1;
      static instances: FlakyWebSocket[] = [];
      readyState = 0;
      onopen: ((ev?: Event) => void) | null = null;
      onmessage: ((ev: { data: string }) => void) | null = null;
      onclose: (() => void) | null = null;
      onerror: (() => void) | null = null;
      url: string;

      constructor(url: string) {
        this.url = url;
        FlakyWebSocket.instances.push(this);
        queueMicrotask(() => {
          this.readyState = 3;
          this.onclose?.();
        });
      }

      send() {}
      close() {
        this.readyState = 3;
        this.onclose?.();
      }
    }

    vi.stubGlobal('WebSocket', FlakyWebSocket);
    const h = handlers();
    const { result } = renderHook(() => useChatSocket({ conversationId: 'c1', ...h }));

    for (let i = 0; i < 5; i++) {
      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });
    }

    await waitFor(() => expect(result.current.status).toBe('closed'));
    expect(h.onError).toHaveBeenCalledWith('Conexão perdida. Usando modo REST.');
  });

  it('onerror fecha o socket', async () => {
    const h = handlers();
    renderHook(() => useChatSocket({ conversationId: 'c1', ...h }));
    await waitFor(() => expect(MockWebSocket.instances.length).toBeGreaterThan(0));
    const ws = MockWebSocket.instances[0];
    const closeSpy = vi.spyOn(ws, 'close');
    act(() => {
      ws.onerror?.();
    });
    expect(closeSpy).toHaveBeenCalled();
  });
});
