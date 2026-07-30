import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { useConversations } from './hooks/useConversations';

vi.mock('./hooks/useConversations', () => ({
  useConversations: vi.fn(),
}));

vi.mock('./components/ChatWindow', () => ({
  ChatWindow: ({ conversationId }: { conversationId: string }) => (
    <div>chat-{conversationId}</div>
  ),
}));

describe('App', () => {
  const create = vi.fn();
  const remove = vi.fn();
  const refresh = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    create.mockResolvedValue({ id: 'new', title: null, created_at: '', updated_at: '' });
    remove.mockResolvedValue(undefined);
    vi.mocked(useConversations).mockReturnValue({
      conversations: [{ id: 'c1', title: 'Uma', created_at: '', updated_at: '' }],
      loading: false,
      create,
      remove,
      refresh,
    });
  });

  it('mostra empty state sem conversa ativa', () => {
    render(<App />);
    expect(screen.getByText('Selecione uma conversa')).toBeInTheDocument();
  });

  it('seleciona conversa e abre chat', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByText('Uma'));
    expect(screen.getByText('chat-c1')).toBeInTheDocument();
  });

  it('cria conversa e seleciona', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByTitle('Nova conversa'));
    await waitFor(() => expect(create).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText('chat-new')).toBeInTheDocument());
  });

  it('apaga conversa ativa e volta ao empty', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByText('Uma'));
    expect(screen.getByText('chat-c1')).toBeInTheDocument();
    await user.click(screen.getByTitle('Apagar conversa'));
    await waitFor(() => expect(remove).toHaveBeenCalledWith('c1'));
    await waitFor(() =>
      expect(screen.getByText('Selecione uma conversa')).toBeInTheDocument(),
    );
  });

  it('apaga conversa inativa sem limpar ativa', async () => {
    vi.mocked(useConversations).mockReturnValue({
      conversations: [
        { id: 'c1', title: 'Uma', created_at: '', updated_at: '' },
        { id: 'c2', title: 'Duas', created_at: '', updated_at: '' },
      ],
      loading: false,
      create,
      remove,
      refresh,
    });
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByText('Uma'));
    const deletes = screen.getAllByTitle('Apagar conversa');
    await user.click(deletes[1]);
    await waitFor(() => expect(remove).toHaveBeenCalledWith('c2'));
    expect(screen.getByText('chat-c1')).toBeInTheDocument();
  });
});
