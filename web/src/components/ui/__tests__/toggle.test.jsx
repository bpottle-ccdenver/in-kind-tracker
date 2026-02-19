import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { Toggle } from '../toggle.jsx';

describe('Toggle', () => {
  it('toggles pressed state when clicked', async () => {
    const user = userEvent.setup();
    render(<Toggle aria-label="Bold" data-testid="toggle">B</Toggle>);

    const toggle = screen.getByTestId('toggle');
    expect(toggle).toHaveAttribute('data-state', 'off');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    await user.click(toggle);

    expect(toggle).toHaveAttribute('data-state', 'on');
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });

  it('applies variant and size classes', () => {
    render(
      <Toggle
        variant="outline"
        size="sm"
        className="custom-toggle"
        aria-label="Italic"
        data-testid="styled-toggle"
      >
        I
      </Toggle>,
    );

    const toggle = screen.getByTestId('styled-toggle');
    expect(toggle).toHaveClass('custom-toggle');
    expect(toggle).toHaveClass('border');
    expect(toggle).toHaveClass('h-8');
  });

  it('respects the disabled attribute', async () => {
    const user = userEvent.setup();
    render(
      <Toggle disabled aria-label="Underline" data-testid="disabled-toggle">
        U
      </Toggle>,
    );

    const toggle = screen.getByTestId('disabled-toggle');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(toggle).toHaveAttribute('data-state', 'off');
  });
});
