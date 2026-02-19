import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('next-themes', () => ({
  useTheme: vi.fn(() => ({ theme: 'system' })),
}));

const sonnerMock = vi.fn(({ children, ...props }) => (
  <div data-testid="sonner" {...props}>
    {children}
  </div>
));

vi.mock('sonner', () => ({
  Toaster: sonnerMock,
}));

const { useTheme } = await import('next-themes');
const { Toaster } = await import('../sonner.jsx');

describe('Sonner Toaster', () => {
  beforeEach(() => {
    sonnerMock.mockClear();
  });

  it('passes the active theme from next-themes to Sonner', () => {
    render(<Toaster />);

    expect(sonnerMock).toHaveBeenCalled();
    expect(sonnerMock.mock.calls[0][0].theme).toBe('system');
    expect(sonnerMock.mock.calls[0][0].className).toContain('toaster');
  });

  it('includes custom toast class names', () => {
    useTheme.mockReturnValue({ theme: 'dark' });

    render(<Toaster />);

    const props = sonnerMock.mock.calls[0][0];
    expect(props.theme).toBe('dark');
    expect(props.toastOptions.classNames.toast).toContain('group-[.toaster]:bg-background');
    expect(props.toastOptions.classNames.actionButton).toContain('bg-primary');
  });
});
