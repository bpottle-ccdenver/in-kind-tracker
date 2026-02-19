import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AccessDenied from '../AccessDenied.jsx';

describe('AccessDenied', () => {
  it('renders default title and message', () => {
    render(<AccessDenied />);
    expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
    expect(screen.getByText(/do not have permission/i)).toBeInTheDocument();
  });

  it('supports custom title and message', () => {
    render(<AccessDenied title="Custom" message="Custom message" />);
    expect(screen.getByText('Custom')).toBeInTheDocument();
    expect(screen.getByText('Custom message')).toBeInTheDocument();
  });
});

