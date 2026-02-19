import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { RadioGroup, RadioGroupItem } from '../radio-group.jsx';

describe('RadioGroup', () => {
  it('selects the chosen radio item', async () => {
    const user = userEvent.setup();
    render(
      <RadioGroup defaultValue="a">
        <label htmlFor="opt-a">
          <RadioGroupItem value="a" id="opt-a" /> Option A
        </label>
        <label htmlFor="opt-b">
          <RadioGroupItem value="b" id="opt-b" /> Option B
        </label>
      </RadioGroup>,
    );

    const optionB = screen.getByLabelText(/option b/i);
    await user.click(optionB);
    expect(optionB.getAttribute('data-state')).toBe('checked');
  });
});

