import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { Toaster } from '../toaster.jsx';

vi.mock('@/components/ui/use-toast', () => ({
  useToast: vi.fn(),
}));

const { useToast } = await import('@/components/ui/use-toast');

describe('Toaster', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders toast items with their title and description', () => {
    useToast.mockReturnValue({
      toasts: [
        { id: '1', title: 'Success', description: 'All good', open: true, onOpenChange: vi.fn() },
        { id: '2', title: 'Heads up', description: 'Check details', open: true, onOpenChange: vi.fn() },
      ],
    });

    render(<Toaster />);

    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('All good')).toBeInTheDocument();
    expect(screen.getByText('Heads up')).toBeInTheDocument();
    expect(screen.getByText('Check details')).toBeInTheDocument();
  });

  it('renders toast action components and close controls when provided', () => {
    useToast.mockReturnValue({
      toasts: [
        {
          id: '1',
          title: 'Undo',
          action: <button type="button">Retry</button>,
          open: true,
          onOpenChange: vi.fn(),
        },
      ],
    });

    const { container } = render(<Toaster />);

    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(container.querySelector('button[toast-close]')).toBeInTheDocument();
  });
});
