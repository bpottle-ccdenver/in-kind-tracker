import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@radix-ui/react-dialog', () => {
  const ReactModule = require('react');
  const createComponent = (dataName) =>
    ReactModule.forwardRef(({ children, ...props }, ref) => (
      <div data-sheet={dataName} ref={ref} {...props}>
        {children}
      </div>
    ));

  return {
    Root: createComponent('root'),
    Trigger: createComponent('trigger'),
    Close: ReactModule.forwardRef(({ children, ...props }, ref) => (
      <button data-sheet="close" ref={ref} {...props}>
        {children}
      </button>
    )),
    Portal: ({ children }) => <div data-sheet="portal">{children}</div>,
    Overlay: createComponent('overlay'),
    Content: createComponent('content'),
    Title: createComponent('title'),
    Description: createComponent('description'),
  };
});

const {
  Sheet,
  SheetContent,
  SheetOverlay,
  SheetTitle,
  SheetDescription,
} = await import('../sheet.jsx');

describe('Sheet components', () => {
  it('renders a sheet with overlay and dismiss control', () => {
    render(
      <Sheet>
        <SheetContent>
          <SheetTitle>Menu</SheetTitle>
          <SheetDescription>Choose an option</SheetDescription>
        </SheetContent>
      </Sheet>,
    );

    expect(screen.getByText('Menu')).toBeInTheDocument();
    expect(screen.getByText('Choose an option')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    expect(document.querySelector('[data-sheet="overlay"]')).toBeInTheDocument();
  });

  it('applies positioning based on the chosen side', () => {
    const { container } = render(<SheetContent side="left">Left sheet</SheetContent>);

    const content = container.querySelector('[data-sheet="content"]');
    expect(content).toHaveClass('inset-y-0', 'left-0');
  });

  it('allows overlay class overrides', () => {
    const { container } = render(<SheetOverlay className="custom-overlay" />);

    const overlay = container.querySelector('[data-sheet="overlay"]');
    expect(overlay).toHaveClass('bg-black/80', 'custom-overlay');
  });
});
