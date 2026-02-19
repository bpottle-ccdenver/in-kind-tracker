import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from '../breadcrumb.jsx';

describe('Breadcrumb', () => {
  it('renders a navigable breadcrumb structure', () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/library">Library</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Data</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );

    const nav = screen.getByRole('navigation', { name: /breadcrumb/i });
    expect(nav).toBeInTheDocument();

    const list = screen.getByRole('list');
    expect(list).toHaveClass('flex');

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);

    const currentPage = screen.getByRole('link', { current: 'page' });
    expect(currentPage).toHaveTextContent('Data');
  });

  it('supports custom children via asChild', () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <button type="button" data-testid="custom-link">Dashboard</button>
            </BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );

    const customLink = screen.getByTestId('custom-link');
    expect(customLink.tagName).toBe('BUTTON');
    expect(customLink).toHaveClass('transition-colors');
  });

  it('provides accessible affordances for overflow', () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbEllipsis />
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );

    const ellipsis = screen.getByText('More');
    expect(ellipsis).toBeInTheDocument();
    expect(ellipsis.parentElement).toHaveAttribute('aria-hidden', 'true');
  });
});
