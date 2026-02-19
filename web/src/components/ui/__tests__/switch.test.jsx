import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Switch } from '../switch.jsx';

describe('Switch', () => {
  it('renders unchecked by default and toggles state', () => {
    const { getByRole } = render(<Switch />);
    const toggle = getByRole('switch');
    expect(toggle.getAttribute('data-state')).toBe('unchecked');

    fireEvent.click(toggle);
    expect(toggle.getAttribute('data-state')).toBe('checked');
  });

  it('respects disabled prop', () => {
    const { getByRole } = render(<Switch disabled />);
    const toggle = getByRole('switch');
    expect(toggle).toBeDisabled();
  });
});

