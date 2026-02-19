import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '../dialog.jsx';

describe('Dialog', () => {
  it('opens and closes dialog content', async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Modal Title</DialogTitle>
          <DialogDescription>Modal body</DialogDescription>
        </DialogContent>
      </Dialog>,
    );

    await user.click(screen.getByRole('button', { name: /open/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/modal body/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

