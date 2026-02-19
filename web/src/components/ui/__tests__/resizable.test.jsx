import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-resizable-panels', () => {
  const ReactModule = require('react');

  return {
    PanelGroup: ({ children, ...props }) => (
      <div data-resizable="group" {...props}>
        {children}
      </div>
    ),
    Panel: ({ children, ...props }) => (
      <div data-resizable="panel" {...props}>
        {children}
      </div>
    ),
    PanelResizeHandle: ReactModule.forwardRef(({ children, ...props }, ref) => (
      <div data-resizable="handle" ref={ref} {...props}>
        {children}
      </div>
    )),
  };
});

const {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} = await import('../resizable.jsx');

describe('Resizable components', () => {
  it('renders a panel group with its children', () => {
    const { container } = render(
      <ResizablePanelGroup className="custom">
        <ResizablePanel>Panel A</ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel>Panel B</ResizablePanel>
      </ResizablePanelGroup>,
    );

    const group = container.querySelector('[data-resizable="group"]');
    const handle = container.querySelector('[data-resizable="handle"]');

    expect(group).toHaveClass('flex', 'custom');
    expect(handle).toHaveClass('relative', 'w-px');
    expect(handle?.querySelector('svg')).toBeInTheDocument();
  });

  it('can render a handle without the grip control', () => {
    const { container } = render(<ResizableHandle />);

    const handle = container.querySelector('[data-resizable="handle"]');
    expect(handle).toBeInTheDocument();
    expect(handle?.querySelector('svg')).not.toBeInTheDocument();
  });
});
