import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import { ChatWindow } from './ChatWindow';

vi.mock('../api/client', () => ({
  api: {
    listMessages: vi.fn(),
    sendMessage: vi.fn(),
  },
}));

vi.mock('../hooks/useChatSocket', () => ({
  useChatSocket: vi.fn(),
}));

import { useChatSocket } from '../hooks/useChatSocket';

describe('ChatWindow', () => {
  const send = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.listMessages).mockResolvedValue([]);
    vi.mocked(useChatSocket).mockReturnValue({ status: 'open', send });
  });

  it('mostra estado vazio apos carregar', async () => {
    render(<ChatWindow conversationId="c1" />);
    expect(screen.getByText('Carregando mensagens…')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText('Diga olá para começar a conversa.')).toBeInTheDocument(),
    );
  });

  it('lista mensagens existentes', async () => {
    vi.mocked(api.listMessages).mockResolvedValue([
      {
        id: 'm1',
        conversation_id: 'c1',
        role: 'user',
        content: 'Oi',
        created_at: '',
      },
    ]);
    render(<ChatWindow conversationId="c1" />);
    await waitFor(() => expect(screen.getByText('Oi')).toBeInTheDocument());
  });

  it('envia mensagem e chama send', async () => {
    const user = userEvent.setup();
    const onUpdated = vi.fn();
    send.mockImplementation(async () => undefined);
    render(<ChatWindow conversationId="c1" onConversationUpdated={onUpdated} />);
    await waitFor(() =>
      expect(screen.getByText('Diga olá para começar a conversa.')).toBeInTheDocument(),
    );
    await user.type(screen.getByPlaceholderText('Mensagem…'), 'hello');
    await user.click(screen.getByRole('button'));
    await waitFor(() => expect(send).toHaveBeenCalledWith('hello'));
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('mostra erro quando send falha', async () => {
    const user = userEvent.setup();
    send.mockRejectedValue(new Error('fail'));
    render(<ChatWindow conversationId="c1" />);
    await waitFor(() =>
      expect(screen.getByText('Diga olá para começar a conversa.')).toBeInTheDocument(),
    );
    await user.type(screen.getByPlaceholderText('Mensagem…'), 'x');
    await user.click(screen.getByRole('button'));
    await waitFor(() =>
      expect(screen.getByText('Falha ao enviar. Tente de novo.')).toBeInTheDocument(),
    );
  });

  it('reage aos callbacks do socket', async () => {
    let opts: {
      onUserSaved: (m: unknown) => void;
      onAiStart: () => void;
      onAiToken: (t: string) => void;
      onAiDone: (m: unknown) => void;
      onError: (d: string) => void;
    };
    vi.mocked(useChatSocket).mockImplementation((o) => {
      opts = o as typeof opts;
      return { status: 'open', send };
    });
    const onUpdated = vi.fn();
    render(<ChatWindow conversationId="c1" onConversationUpdated={onUpdated} />);
    await waitFor(() => expect(api.listMessages).toHaveBeenCalled());

    opts!.onUserSaved({
      id: 'u1',
      conversation_id: 'c1',
      role: 'user',
      content: 'salvo',
      created_at: '',
    });
    await waitFor(() => expect(screen.getByText('salvo')).toBeInTheDocument());
    expect(onUpdated).toHaveBeenCalled();

    opts!.onAiStart();
    opts!.onAiToken('tok');
    await waitFor(() => expect(screen.getByText('tok')).toBeInTheDocument());

    opts!.onAiDone({
      id: 'a1',
      conversation_id: 'c1',
      role: 'ai',
      content: 'final',
      created_at: '',
    });
    await waitFor(() => expect(screen.getByText('final')).toBeInTheDocument());

    opts!.onError('erro ws');
    await waitFor(() => expect(screen.getByText('erro ws')).toBeInTheDocument());
  });

  it('mostra reconectando', async () => {
    vi.mocked(useChatSocket).mockReturnValue({ status: 'reconnecting', send });
    render(<ChatWindow conversationId="c1" />);
    await waitFor(() => expect(screen.getByText('Reconectando…')).toBeInTheDocument());
  });

  it('limpa erro ao voltar para open', async () => {
    const sock = { status: 'reconnecting' as 'reconnecting' | 'open', send };
    vi.mocked(useChatSocket).mockImplementation(() => ({
      status: sock.status,
      send,
    }));
    const { rerender } = render(<ChatWindow conversationId="c1" />);
    await waitFor(() => expect(screen.getByText('Reconectando…')).toBeInTheDocument());
    sock.status = 'open';
    rerender(<ChatWindow conversationId="c1" />);
    await waitFor(() =>
      expect(screen.queryByText('Reconectando…')).not.toBeInTheDocument(),
    );
  });

  it('ignora segundo envio enquanto sending', async () => {
    const user = userEvent.setup();
    let resolveSend: () => void = () => undefined;
    send.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSend = resolve;
        }),
    );
    render(<ChatWindow conversationId="c1" />);
    await waitFor(() =>
      expect(screen.getByText('Diga olá para começar a conversa.')).toBeInTheDocument(),
    );
    await user.type(screen.getByPlaceholderText('Mensagem…'), 'one');
    await user.click(screen.getByRole('button'));
    await user.type(screen.getByPlaceholderText('Mensagem…'), 'two{Enter}');
    expect(send).toHaveBeenCalledTimes(1);
    resolveSend();
  });
});
