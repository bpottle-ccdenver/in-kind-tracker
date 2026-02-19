import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '../select.jsx';

describe('Select', () => {
  it('opens content and selects an option', async () => {
    const user = userEvent.setup();
    render(
      <Select>
        <SelectTrigger data-testid="select-trigger">
          <SelectValue placeholder="Pick one" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">Option A</SelectItem>
          <SelectItem value="b">Option B</SelectItem>
        </SelectContent>
      </Select>,
    );

    const trigger = screen.getByTestId('select-trigger');
    await user.click(trigger);
    const optionA = await screen.findByRole('option', { name: /option a/i });
    expect(optionA).toBeInTheDocument();

    await user.click(screen.getByRole('option', { name: /option b/i }));
    expect(trigger).toHaveTextContent(/option b/i);
  });
});
