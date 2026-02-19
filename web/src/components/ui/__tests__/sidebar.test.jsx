import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: vi.fn(() => false),
}));

vi.mock('@/components/ui/tooltip', () => {
  const ReactModule = require('react');

  return {
    TooltipProvider: ({ children }) => <>{children}</>,
    Tooltip: ({ children }) => <div data-tooltip="root">{children}</div>,
    TooltipTrigger: ({ children }) => <div data-tooltip="trigger">{children}</div>,
    TooltipContent: ReactModule.forwardRef(({ children, ...props }, ref) => (
      <div data-tooltip="content" ref={ref} {...props}>
        {children}
      </div>
    )),
  };
});

const { useIsMobile } = await import('@/hooks/use-mobile');
const {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} = await import('../sidebar.jsx');

describe('Sidebar components', () => {
  beforeEach(() => {
    document.cookie = '';
    vi.clearAllMocks();
    useIsMobile.mockReturnValue(false);
  });

  it('throws when sidebar context is accessed outside the provider', () => {
    expect(() => render(<SidebarTrigger />)).toThrow(
      /useSidebar must be used within a SidebarProvider/,
    );
  });

  it('toggles the sidebar state and stores the preference in a cookie', async () => {
    const user = userEvent.setup();

    const { container } = render(
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader>
            <SidebarTrigger />
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Dashboard">Dashboard</SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    const sidebarWrapper = container.querySelector('[data-state]');
    expect(sidebarWrapper).toHaveAttribute('data-state', 'expanded');

    await user.click(screen.getByRole('button', { name: /toggle sidebar/i }));

    expect(sidebarWrapper).toHaveAttribute('data-state', 'collapsed');
    expect(document.cookie).toContain('sidebar_state=false');
  });

  it('only shows tooltips for collapsed desktop sidebars', () => {
    const { container: collapsedDesktop } = render(
      <SidebarProvider defaultOpen={false}>
        <SidebarMenuButton tooltip="Reports">Reports</SidebarMenuButton>
      </SidebarProvider>,
    );

    const desktopTooltip = collapsedDesktop.querySelector('[data-tooltip="content"]');
    expect(desktopTooltip).toBeInTheDocument();
    expect(desktopTooltip?.hasAttribute('hidden')).toBe(false);

    useIsMobile.mockReturnValue(true);
    const { container: mobile } = render(
      <SidebarProvider defaultOpen={false}>
        <SidebarMenuButton tooltip="Settings">Settings</SidebarMenuButton>
      </SidebarProvider>,
    );

    const mobileTooltip = mobile.querySelector('[data-tooltip="content"]');
    expect(mobileTooltip).toHaveAttribute('hidden');
  });
});
