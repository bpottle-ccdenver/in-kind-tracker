import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Textarea } from '../textarea.jsx';

describe('Textarea', () => {
  it('renders a textarea with placeholder', () => {
    render(<Textarea placeholder="Write here" />);
    expect(screen.getByPlaceholderText(/write here/i)).toBeInTheDocument();
  });

  it('allows text input', async () => {
    const user = userEvent.setup();
    render(<Textarea placeholder="Type" />);
    const textarea = screen.getByPlaceholderText(/type/i);
    await user.type(textarea, 'Hello');
    expect(textarea).toHaveValue('Hello');
  });
});

