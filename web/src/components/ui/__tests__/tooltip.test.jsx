import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '../tooltip.jsx';

describe('Tooltip', () => {
  it('shows tooltip content on hover', async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button>Hover me</button>
          </TooltipTrigger>
          <TooltipContent>Tooltip text</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );

    await user.hover(screen.getByRole('button', { name: /hover me/i }));
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent(/tooltip text/i);
  });
});
