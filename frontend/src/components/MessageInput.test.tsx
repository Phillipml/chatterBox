import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MessageInput } from './MessageInput';

describe('MessageInput', () => {
  it('envia texto no botao e limpa o campo', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<MessageInput onSend={onSend} />);
    const textarea = screen.getByPlaceholderText('Mensagem…');
    await user.type(textarea, 'ola mundo');
    await user.click(screen.getByRole('button'));
    expect(onSend).toHaveBeenCalledWith('ola mundo');
    expect(textarea).toHaveValue('');
  });

  it('envia com Enter sem Shift', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<MessageInput onSend={onSend} />);
    const textarea = screen.getByPlaceholderText('Mensagem…');
    await user.type(textarea, 'enter{Enter}');
    expect(onSend).toHaveBeenCalledWith('enter');
  });

  it('nao envia vazio ou quando sending', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    const { rerender } = render(<MessageInput onSend={onSend} sending />);
    await user.click(screen.getByRole('button'));
    expect(onSend).not.toHaveBeenCalled();
    rerender(<MessageInput onSend={onSend} />);
    await user.type(screen.getByPlaceholderText('Mensagem…'), '   ');
    await user.click(screen.getByRole('button'));
    expect(onSend).not.toHaveBeenCalled();
  });

  it('bloqueia enter enquanto sending', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<MessageInput onSend={onSend} sending />);
    await user.type(screen.getByPlaceholderText('Mensagem…'), 'bloqueado{Enter}');
    expect(onSend).not.toHaveBeenCalled();
  });
});
