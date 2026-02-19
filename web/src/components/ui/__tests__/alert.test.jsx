import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Alert, AlertTitle, AlertDescription } from '../alert.jsx';

describe('Alert', () => {
  it('renders with title and description', () => {
    render(
      <Alert>
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Something went wrong.</AlertDescription>
      </Alert>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/error/i)).toBeInTheDocument();
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });
});

