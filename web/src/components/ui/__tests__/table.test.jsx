import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from '../table.jsx';

describe('Table', () => {
  it('renders table structure with caption', () => {
    render(
      <Table>
        <TableCaption>Sample caption</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>A</TableCell>
            <TableCell>1</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
    expect(screen.getByText(/sample caption/i)).toBeInTheDocument();
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(2);
  });
});

