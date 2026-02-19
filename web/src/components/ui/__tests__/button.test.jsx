import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from '../button.jsx';

describe('Button', () => {
  it('renders with default styling', () => {
    render(<Button>Click me</Button>);
    const btn = screen.getByRole('button', { name: /click me/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveClass('inline-flex');
  });

  it('applies variant and size classes', () => {
    render(
      <Button variant="secondary" size="lg">
        Secondary
      </Button>,
    );
    const btn = screen.getByRole('button', { name: /secondary/i });
    expect(btn).toHaveClass('bg-secondary');
    expect(btn).toHaveClass('h-10');
  });
});

