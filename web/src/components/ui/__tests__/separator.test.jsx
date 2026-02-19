import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Separator } from '../separator.jsx';

describe('Separator', () => {
  it('renders horizontal separator by default', () => {
    render(<Separator data-testid="separator" />);
    expect(screen.getByTestId('separator')).toHaveClass('h-[1px]', 'w-full');
  });

  it('renders vertical separator when orientation is vertical', () => {
    render(<Separator data-testid="separator-vertical" orientation="vertical" />);
    const separator = screen.getByTestId('separator-vertical');
    expect(separator).toHaveClass('w-[1px]', 'h-full');
  });
});
