import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Conversation } from '../types';
import { ConversationItem } from './ConversationItem';

const conv: Conversation = {
  id: 'c1',
  title: 'Plana',
  created_at: '',
  updated_at: '',
};

describe('ConversationItem', () => {
  it('mostra titulo e dispara click/delete', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const onDelete = vi.fn();
    render(
      <ConversationItem
        conversation={conv}
        active
        onClick={onClick}
        onDelete={onDelete}
      />,
    );
    expect(screen.getByText('Plana')).toBeInTheDocument();
    await user.click(screen.getByText('Plana'));
    expect(onClick).toHaveBeenCalled();
    await user.click(screen.getByTitle('Apagar conversa'));
    expect(onDelete).toHaveBeenCalled();
  });

  it('usa fallback quando titulo e nulo', () => {
    render(
      <ConversationItem
        conversation={{ ...conv, title: null }}
        active={false}
        onClick={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText('Nova conversa')).toBeInTheDocument();
  });
});
