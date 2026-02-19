import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../card.jsx';

describe('Card', () => {
  it('renders children in the card body', () => {
    const { getByText } = render(
      <Card>
        <p>Body</p>
      </Card>,
    );
    expect(getByText('Body')).toBeInTheDocument();
  });

  it('supports composed header and footer', () => {
    const { getByText } = render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
        </CardHeader>
        <CardContent>Content</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>,
    );

    expect(getByText('Title')).toBeInTheDocument();
    expect(getByText('Content')).toBeInTheDocument();
    expect(getByText('Footer')).toBeInTheDocument();
  });
});

