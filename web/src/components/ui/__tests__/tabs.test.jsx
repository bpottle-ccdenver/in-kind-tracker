import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../tabs.jsx';

describe('Tabs', () => {
  it('switches between tab panels', async () => {
    const user = userEvent.setup();
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab One</TabsTrigger>
          <TabsTrigger value="tab2">Tab Two</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content One</TabsContent>
        <TabsContent value="tab2">Content Two</TabsContent>
      </Tabs>,
    );

    expect(screen.getByText(/content one/i)).toBeVisible();
    expect(screen.queryByText(/content two/i)).toBeNull();

    await user.click(screen.getByRole('tab', { name: /tab two/i }));
    expect(screen.getByText(/content two/i)).toBeVisible();
  });
});
