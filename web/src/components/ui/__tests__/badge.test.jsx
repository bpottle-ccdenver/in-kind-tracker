import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from '../badge.jsx';

describe('Badge', () => {
  it('renders content with default variant', () => {
    render(<Badge>Default</Badge>);
    expect(screen.getByText(/default/i)).toBeInTheDocument();
  });

  it('supports custom class names', () => {
    render(
      <Badge className="bg-blue-500" data-testid="custom-badge">
        Custom
      </Badge>,
    );
    expect(screen.getByTestId('custom-badge')).toHaveClass('bg-blue-500');
  });
});

