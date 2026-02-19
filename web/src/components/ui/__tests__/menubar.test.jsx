import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@radix-ui/react-menubar', () => {
  const ReactModule = require('react');
  const createComponent = (dataName) =>
    ReactModule.forwardRef(({ children, ...props }, ref) => (
      <div data-menubar={dataName} ref={ref} {...props}>
        {children}
      </div>
    ));

  return {
    Root: createComponent('root'),
    Trigger: createComponent('trigger'),
    SubTrigger: createComponent('sub-trigger'),
    SubContent: createComponent('sub-content'),
    Content: createComponent('content'),
    Item: createComponent('item'),
    CheckboxItem: createComponent('checkbox-item'),
    RadioItem: createComponent('radio-item'),
    Group: createComponent('group'),
    Portal: ({ children }) => <div data-menubar="portal">{children}</div>,
    RadioGroup: createComponent('radio-group'),
    Menu: createComponent('menu'),
    Label: createComponent('label'),
    Separator: createComponent('separator'),
    ItemIndicator: createComponent('item-indicator'),
  };
});

const {
  Menubar,
  MenubarTrigger,
  MenubarSubTrigger,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarShortcut,
} = await import('../menubar.jsx');

describe('Menubar components', () => {
  it('renders a menubar root with base styling', () => {
    const { container } = render(
      <Menubar className="custom">
        <MenubarTrigger>File</MenubarTrigger>
      </Menubar>,
    );

    const root = container.querySelector('[data-menubar="root"]');
    expect(root).toHaveClass('flex', 'h-9', 'custom');
    expect(screen.getByText('File')).toBeInTheDocument();
  });

  it('renders sub triggers with chevron icons and inset spacing', () => {
    render(<MenubarSubTrigger inset>Open Recent</MenubarSubTrigger>);

    const trigger = screen.getByText('Open Recent');
    expect(trigger).toHaveClass('pl-8');
    expect(trigger.querySelector('svg')).toBeInTheDocument();
  });

  it('shows checkbox indicators when menu items are checked', () => {
    const { container } = render(
      <MenubarCheckboxItem checked>Auto Save</MenubarCheckboxItem>,
    );

    expect(screen.getByText('Auto Save')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('applies menu content positioning classes', () => {
    const { container } = render(<MenubarContent className="custom" />);

    const content = container.querySelector('[data-menubar="content"]');
    expect(content).toHaveClass('min-w-[12rem]', 'custom');
  });

  it('renders shortcuts with tracking styles', () => {
    const { container } = render(<MenubarShortcut className="extra">⌘P</MenubarShortcut>);

    const shortcut = container.querySelector('span');
    expect(shortcut).toHaveTextContent('⌘P');
    expect(shortcut).toHaveClass('tracking-widest', 'extra');
  });
});
