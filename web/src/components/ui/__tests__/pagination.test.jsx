import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from '../pagination.jsx';

describe('Pagination', () => {
  it('renders navigation controls with proper roles', () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="#" />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#" isActive>
              1
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#">2</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext href="#" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );

    const nav = screen.getByRole('navigation', { name: /pagination/i });
    expect(nav).toBeInTheDocument();

    const previous = screen.getByRole('link', { name: /previous/i });
    expect(previous).toHaveAttribute('aria-label', 'Go to previous page');

    const next = screen.getByRole('link', { name: /next/i });
    expect(next).toHaveAttribute('aria-label', 'Go to next page');

    const active = screen.getByRole('link', { current: 'page' });
    expect(active).toHaveTextContent('1');
    expect(active).toHaveClass('border');
  });

  it('renders an accessible ellipsis for skipped pages', () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );

    const more = screen.getByText('More pages');
    expect(more).toBeInTheDocument();
    expect(more.parentElement).toHaveAttribute('aria-hidden');
  });
});
