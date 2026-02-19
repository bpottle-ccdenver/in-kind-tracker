import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../accordion.jsx';

describe('Accordion', () => {
  it('expands and collapses content', async () => {
    const user = userEvent.setup();
    render(
      <Accordion type="single" collapsible>
        <AccordionItem value="item-1">
          <AccordionTrigger>Trigger</AccordionTrigger>
          <AccordionContent>Hidden content</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    expect(screen.queryByText(/hidden content/i)).toBeNull();
    await user.click(screen.getByRole('button', { name: /trigger/i }));
    expect(screen.getByText(/hidden content/i)).toBeVisible();
    await user.click(screen.getByRole('button', { name: /trigger/i }));
    expect(screen.queryByText(/hidden content/i)).toBeNull();
  });
});
