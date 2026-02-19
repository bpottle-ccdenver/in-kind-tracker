import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Skeleton } from '../skeleton.jsx';

describe('Skeleton', () => {
  it('applies base and custom classes', () => {
    render(<Skeleton data-testid="skeleton" className="h-4 w-32" />);

    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveClass('animate-pulse');
    expect(skeleton).toHaveClass('h-4');
    expect(skeleton).toHaveClass('w-32');
  });
});
