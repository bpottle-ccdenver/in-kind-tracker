import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@radix-ui/react-context-menu', () => {
  const ReactModule = require('react');
  const createComponent = (dataName) =>
    ReactModule.forwardRef(({ children, ...props }, ref) => (
      <div data-radix={dataName} ref={ref} {...props}>
        {children}
      </div>
    ));

  return {
    Root: ({ children, ...props }) => (
      <div data-radix="root" {...props}>
        {children}
      </div>
    ),
    Trigger: createComponent('trigger'),
    Group: createComponent('group'),
    Portal: ({ children }) => <div data-radix="portal">{children}</div>,
    Sub: createComponent('sub'),
    RadioGroup: createComponent('radio-group'),
    SubTrigger: createComponent('sub-trigger'),
    SubContent: createComponent('sub-content'),
    Content: createComponent('content'),
    Item: createComponent('item'),
    CheckboxItem: createComponent('checkbox-item'),
    RadioItem: createComponent('radio-item'),
    Label: createComponent('label'),
    Separator: createComponent('separator'),
    ItemIndicator: createComponent('item-indicator'),
  };
});

const {
  ContextMenuSubTrigger,
  ContextMenuCheckboxItem,
  ContextMenuShortcut,
} = await import('../context-menu.jsx');

describe('ContextMenu components', () => {
  it('renders sub trigger with navigation icon and inset spacing', () => {
    render(<ContextMenuSubTrigger inset>More options</ContextMenuSubTrigger>);

    const trigger = screen.getByText('More options');
    expect(trigger).toHaveClass('pl-8');
    expect(trigger.querySelector('svg')).toBeInTheDocument();
  });

  it('shows a check indicator when checkbox items are checked', () => {
    const { container } = render(
      <ContextMenuCheckboxItem checked>Enable setting</ContextMenuCheckboxItem>,
    );

    expect(screen.getByText('Enable setting')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders keyboard shortcuts with the expected styling', () => {
    const { container } = render(<ContextMenuShortcut className="custom">⌘S</ContextMenuShortcut>);

    const shortcut = container.querySelector('span');
    expect(shortcut).toHaveTextContent('⌘S');
    expect(shortcut).toHaveClass('ml-auto', 'custom');
  });
});
