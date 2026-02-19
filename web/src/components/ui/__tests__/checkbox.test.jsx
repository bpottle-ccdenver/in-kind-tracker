import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Checkbox } from '../checkbox.jsx';

describe('Checkbox', () => {
  it('toggles data-state when clicked', async () => {
    const user = userEvent.setup();
    render(<Checkbox data-testid="checkbox" />);
    const checkbox = screen.getByTestId('checkbox');
    expect(checkbox.getAttribute('data-state')).toBe('unchecked');
    await user.click(checkbox);
    expect(checkbox.getAttribute('data-state')).toBe('checked');
  });

  it('respects disabled prop', async () => {
    const user = userEvent.setup();
    render(<Checkbox data-testid="checkbox" disabled />);
    const checkbox = screen.getByTestId('checkbox');
    expect(checkbox).toBeDisabled();
    await user.click(checkbox);
    expect(checkbox.getAttribute('data-state')).toBe('unchecked');
  });
});

