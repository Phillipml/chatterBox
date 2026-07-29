import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Message } from '../types';
import { MessageBubble } from './MessageBubble';

const base: Omit<Message, 'role' | 'content'> = {
  id: '1',
  conversation_id: 'c1',
  created_at: new Date().toISOString(),
};

describe('MessageBubble', () => {
  it('renderiza mensagem do usuario', () => {
    render(<MessageBubble message={{ ...base, role: 'user', content: 'Oi' }} />);
    expect(screen.getByText('Oi')).toBeInTheDocument();
  });

  it('renderiza mensagem da ia com icone', () => {
    const { container } = render(
      <MessageBubble message={{ ...base, role: 'ai', content: 'Terra plana' }} />,
    );
    expect(screen.getByText('Terra plana')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeTruthy();
  });
});
