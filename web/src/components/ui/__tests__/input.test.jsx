import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Input } from '../input.jsx';

describe('Input', () => {
  it('renders an input element with default styles', () => {
    render(<Input placeholder="Enter text" />);
    const input = screen.getByPlaceholderText(/enter text/i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass('flex', 'h-9');
  });

  it('passes additional props to the input', () => {
    render(<Input type="email" data-testid="email-input" />);
    const input = screen.getByTestId('email-input');
    expect(input).toHaveAttribute('type', 'email');
  });
});

