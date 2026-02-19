import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '../hover-card.jsx';

describe('HoverCard', () => {
  it('renders content when open and applies custom class', () => {
    render(
      <HoverCard open>
        <HoverCardTrigger>Trigger</HoverCardTrigger>
        <HoverCardContent data-testid="hover-content" className="bg-emerald-50">
          Hover details
        </HoverCardContent>
      </HoverCard>,
    );

    const content = screen.getByTestId('hover-content');
    expect(content).toBeInTheDocument();
    expect(content).toHaveClass('bg-emerald-50');
  });
});
