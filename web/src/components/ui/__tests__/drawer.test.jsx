import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

let latestRootProps;

vi.mock('vaul', () => {
  const ReactModule = require('react');

  const Root = ({ children, ...props }) => {
    latestRootProps = props;
    return (
      <div data-vaul="root" {...props}>
        {children}
      </div>
    );
  };
  const Trigger = ReactModule.forwardRef((props, ref) => <button ref={ref} {...props} />);
  const Portal = ({ children }) => <div data-vaul="portal">{children}</div>;
  const Close = ReactModule.forwardRef((props, ref) => <button ref={ref} {...props} />);
  const Overlay = ReactModule.forwardRef(({ children, ...props }, ref) => (
    <div data-vaul="overlay" ref={ref} {...props}>
      {children}
    </div>
  ));
  Overlay.displayName = 'Overlay';
  const Content = ReactModule.forwardRef(({ children, ...props }, ref) => (
    <div data-vaul="content" ref={ref} {...props}>
      {children}
    </div>
  ));
  Content.displayName = 'Content';
  const Title = ReactModule.forwardRef(({ children, ...props }, ref) => (
    <div data-vaul="title" ref={ref} {...props}>
      {children}
    </div>
  ));
  Title.displayName = 'Title';
  const Description = ReactModule.forwardRef(({ children, ...props }, ref) => (
    <div data-vaul="description" ref={ref} {...props}>
      {children}
    </div>
  ));
  Description.displayName = 'Description';

  return {
    Drawer: {
      Root,
      Trigger,
      Portal,
      Close,
      Overlay,
      Content,
      Title,
      Description,
    },
  };
});

const {
  Drawer,
  DrawerContent,
  DrawerOverlay,
} = await import('../drawer.jsx');

describe('Drawer components', () => {
  it('enables background scaling by default', () => {
    render(<Drawer />);

    expect(latestRootProps.shouldScaleBackground).toBe(true);
  });

  it('renders overlay and content with a handle', () => {
    const { container } = render(
      <DrawerContent>
        <p>Panel body</p>
      </DrawerContent>,
    );

    const overlay = container.querySelector('[data-vaul="overlay"]');
    const content = container.querySelector('[data-vaul="content"]');

    expect(overlay).toBeInTheDocument();
    expect(content).toHaveClass('rounded-t-[10px]');
    expect(screen.getByText('Panel body')).toBeInTheDocument();
    expect(container.querySelector('.mx-auto.mt-4.h-2')).toBeInTheDocument();
  });

  it('allows rendering a custom overlay', () => {
    const { container } = render(<DrawerOverlay className="custom" />);

    const overlay = container.querySelector('[data-vaul="overlay"]');
    expect(overlay).toHaveClass('bg-black/80', 'custom');
  });
});
