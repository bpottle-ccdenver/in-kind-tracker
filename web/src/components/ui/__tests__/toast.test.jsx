import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastAction,
  ToastClose,
} from '../toast.jsx';

describe('Toast UI primitives', () => {
  it('forwards refs for provider and viewport while rendering children', () => {
    const providerRef = React.createRef();
    const viewportRef = React.createRef();

    render(
      <ToastProvider ref={providerRef}>
        <ToastViewport ref={viewportRef}>
          <div>Toast content</div>
        </ToastViewport>
      </ToastProvider>
    );

    expect(providerRef.current).not.toBeNull();
    expect(viewportRef.current).not.toBeNull();
    expect(providerRef.current).toHaveClass('fixed');
    expect(viewportRef.current).toHaveClass('fixed');
    expect(screen.getByText('Toast content')).toBeInTheDocument();
  });

  it('renders toast title and description with default variant styles', () => {
    const { container } = render(
      <Toast>
        <div>
          <ToastTitle>Operation Successful</ToastTitle>
          <ToastDescription>Everything went according to plan.</ToastDescription>
        </div>
      </Toast>
    );

    expect(screen.getByText('Operation Successful')).toBeInTheDocument();
    expect(screen.getByText('Everything went according to plan.')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('border');
    expect(container.firstChild).toHaveClass('rounded-md');
  });

  it('applies destructive variant styling and renders action + close controls', () => {
    const { container } = render(
      <Toast variant="destructive">
        <ToastAction>Undo</ToastAction>
        <ToastClose />
      </Toast>
    );

    expect(container.firstChild).toHaveClass('destructive');
    expect(screen.getByText('Undo')).toBeInTheDocument();
    expect(container.querySelector('button[toast-close]')).toBeInTheDocument();
  });
});
