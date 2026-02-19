import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@radix-ui/react-navigation-menu', () => {
  const ReactModule = require('react');
  const createComponent = (dataName) =>
    ReactModule.forwardRef(({ children, ...props }, ref) => (
      <div data-nav={dataName} ref={ref} {...props}>
        {children}
      </div>
    ));

  return {
    Root: createComponent('root'),
    List: createComponent('list'),
    Item: createComponent('item'),
    Trigger: createComponent('trigger'),
    Content: createComponent('content'),
    Link: createComponent('link'),
    Viewport: createComponent('viewport'),
    Indicator: createComponent('indicator'),
  };
});

const {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuViewport,
  NavigationMenuIndicator,
  navigationMenuTriggerStyle,
} = await import('../navigation-menu.jsx');

describe('NavigationMenu components', () => {
  it('renders the navigation menu with trigger, content, and viewport', () => {
    const { container } = render(
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Products</NavigationMenuTrigger>
            <NavigationMenuContent>Items</NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );

    const trigger = screen.getByText('Products');
    expect(trigger).toHaveClass('inline-flex', 'group');
    expect(trigger.querySelector('svg')).toBeInTheDocument();
    expect(container.querySelector('[data-nav="viewport"]')).toBeInTheDocument();
  });

  it('applies transition classes to the content and indicator', () => {
    const { container } = render(
      <>
        <NavigationMenuContent className="custom-content">Body</NavigationMenuContent>
        <NavigationMenuIndicator className="custom-indicator" />
      </>,
    );

    const content = container.querySelector('[data-nav="content"]');
    expect(content).toHaveClass('md:absolute', 'custom-content');

    const indicator = container.querySelector('[data-nav="indicator"]');
    expect(indicator).toHaveClass('top-full', 'custom-indicator');
  });

  it('provides a reusable trigger style helper', () => {
    const classes = navigationMenuTriggerStyle();
    expect(classes).toContain('inline-flex');
    expect(classes).toContain('items-center');
  });
});
