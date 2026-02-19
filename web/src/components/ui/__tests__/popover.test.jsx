import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Popover, PopoverTrigger, PopoverContent } from '../popover.jsx';

describe('Popover', () => {
  it('shows popover content when triggered', async () => {
    const user = userEvent.setup();
    render(
      <Popover>
        <PopoverTrigger asChild>
          <button>Toggle Popover</button>
        </PopoverTrigger>
        <PopoverContent>Popover body</PopoverContent>
      </Popover>,
    );

    await user.click(screen.getByRole('button', { name: /toggle popover/i }));
    expect(await screen.findByText(/popover body/i)).toBeInTheDocument();
  });
});

