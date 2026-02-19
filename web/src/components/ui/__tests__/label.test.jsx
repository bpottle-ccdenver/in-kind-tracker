import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Label } from '../label.jsx';

describe('Label', () => {
  it('renders text and associates with control', () => {
    render(
      <Label htmlFor="input-id">Email</Label>,
    );
    const label = screen.getByText(/email/i);
    expect(label).toBeInTheDocument();
    expect(label).toHaveAttribute('for', 'input-id');
  });
});

