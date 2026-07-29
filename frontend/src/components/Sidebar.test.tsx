import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Conversation } from '../types';
import { Sidebar } from './Sidebar';

const conversations: Conversation[] = [
  { id: '1', title: 'A', created_at: '', updated_at: '' },
  { id: '2', title: null, created_at: '', updated_at: '' },
];

describe('Sidebar', () => {
  it('mostra loading', () => {
    render(
      <Sidebar
        conversations={[]}
        loading
        activeId={null}
        onSelect={vi.fn()}
        onCreate={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText('Carregando…')).toBeInTheDocument();
  });

  it('mostra vazio e cria conversa', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(
      <Sidebar
        conversations={[]}
        loading={false}
        activeId={null}
        onSelect={vi.fn()}
        onCreate={onCreate}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText('Nenhuma conversa ainda.')).toBeInTheDocument();
    await user.click(screen.getByTitle('Nova conversa'));
    expect(onCreate).toHaveBeenCalled();
  });

  it('lista conversas e seleciona/apaga', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onDelete = vi.fn();
    render(
      <Sidebar
        conversations={conversations}
        loading={false}
        activeId="1"
        onSelect={onSelect}
        onCreate={vi.fn()}
        onDelete={onDelete}
      />,
    );
    await user.click(screen.getByText('A'));
    expect(onSelect).toHaveBeenCalledWith('1');
    const deletes = screen.getAllByTitle('Apagar conversa');
    await user.click(deletes[0]);
    expect(onDelete).toHaveBeenCalledWith('1');
  });
});
