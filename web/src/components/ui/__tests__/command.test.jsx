import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('cmdk', () => {
  const ReactModule = require('react');

  const Command = ReactModule.forwardRef(({ children, ...props }, ref) => (
    <div data-cmdk-root ref={ref} {...props}>
      {children}
    </div>
  ));
  Command.Input = ReactModule.forwardRef((props, ref) => <input ref={ref} {...props} />);
  Command.List = ReactModule.forwardRef(({ children, ...props }, ref) => (
    <div ref={ref} {...props}>
      {children}
    </div>
  ));
  Command.Empty = ReactModule.forwardRef(({ children, ...props }, ref) => (
    <div ref={ref} {...props}>
      {children}
    </div>
  ));
  Command.Group = ReactModule.forwardRef(({ children, ...props }, ref) => (
    <div ref={ref} {...props}>
      {children}
    </div>
  ));
  Command.Item = ReactModule.forwardRef(({ children, ...props }, ref) => (
    <div ref={ref} role="option" {...props}>
      {children}
    </div>
  ));
  Command.Separator = ReactModule.forwardRef((props, ref) => <div ref={ref} {...props} />);

  Command.displayName = 'Command';
  Command.Input.displayName = 'CommandInput';
  Command.List.displayName = 'CommandList';
  Command.Empty.displayName = 'CommandEmpty';
  Command.Group.displayName = 'CommandGroup';
  Command.Item.displayName = 'CommandItem';
  Command.Separator.displayName = 'CommandSeparator';

  return { Command };
});

const {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
  CommandShortcut,
} = await import('../command.jsx');

describe('Command components', () => {
  it('renders command dialog content when open', () => {
    render(
      <CommandDialog open>
        <CommandInput placeholder="Search..." />
        <CommandList>
          <CommandEmpty>No results</CommandEmpty>
          <CommandItem value="first">First</CommandItem>
        </CommandList>
      </CommandDialog>,
    );

    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    expect(screen.getByText('No results')).toBeInTheDocument();
    expect(screen.getByText('First')).toBeInTheDocument();
  });

  it('renders the search icon inside the input wrapper', () => {
    const { container } = render(<CommandInput placeholder="Filter" />);

    const wrapper = container.querySelector('[cmdk-input-wrapper]');
    expect(wrapper).toBeInTheDocument();
    expect(wrapper?.querySelector('svg')).toBeInTheDocument();
  });

  it('renders shortcuts with the provided text and classes', () => {
    const { container } = render(<CommandShortcut className="extra">⌘K</CommandShortcut>);

    const shortcut = container.querySelector('span');
    expect(shortcut).toHaveTextContent('⌘K');
    expect(shortcut).toHaveClass('ml-auto', 'extra');
  });
});
