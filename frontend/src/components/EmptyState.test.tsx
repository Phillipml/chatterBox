import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('mostra titulo e descricao', () => {
    render(<EmptyState />);
    expect(screen.getByText('Selecione uma conversa')).toBeInTheDocument();
    expect(screen.getByText(/Escolha uma conversa na barra lateral/)).toBeInTheDocument();
  });
});
