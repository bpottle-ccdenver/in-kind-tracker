import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('recharts', () => {
  const ReactModule = require('react');

  return {
    ResponsiveContainer: ({ children, ...props }) => (
      <div data-testid="responsive-container" {...props}>
        {typeof children === 'function' ? children() : children}
      </div>
    ),
    Tooltip: (props) => <div data-testid="chart-tooltip" {...props} />,
    Legend: (props) => <div data-testid="chart-legend" {...props} />,
  };
});

const {
  ChartContainer,
  ChartTooltipContent,
  ChartLegendContent,
} = await import('../chart.jsx');

describe('Chart components', () => {
  it('renders a responsive container with theme variables', () => {
    const config = {
      visitors: { theme: { light: '#000', dark: '#fff' } },
      revenue: { color: '#ff0000' },
    };

    const { container } = render(
      <ChartContainer id="demo" config={config}>
        <div>Chart body</div>
      </ChartContainer>,
    );

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    const styleElement = container.querySelector('style');
    expect(styleElement?.textContent).toContain('--color-visitors: #000;');
    expect(styleElement?.textContent).toContain('--color-revenue: #ff0000;');
    expect(container.firstChild).toHaveAttribute('data-chart', expect.stringContaining('chart-demo'));
  });

  it('formats tooltip items using the provided chart config', () => {
    const payload = [
      {
        dataKey: 'visitors',
        name: 'visitors',
        value: 1200,
        color: '#111',
        payload: { visitors: 'visitors' },
      },
    ];

    render(
      <ChartContainer config={{ visitors: { label: 'Visitors' } }}>
        <ChartTooltipContent active payload={payload} />
      </ChartContainer>,
    );

    const labels = screen.getAllByText('Visitors');
    expect(labels[0]).toHaveClass('font-medium');
    expect(screen.getByText('1,200')).toBeInTheDocument();
  });

  it('renders legend entries with custom icons and labels', () => {
    const LegendIcon = () => <svg data-testid="legend-icon" />;
    const payload = [
      {
        dataKey: 'status',
        value: 'status',
        color: '#0f0',
      },
    ];

    render(
      <ChartContainer config={{ status: { label: 'Active', icon: LegendIcon } }}>
        <ChartLegendContent payload={payload} />
      </ChartContainer>,
    );

    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByTestId('legend-icon')).toBeInTheDocument();
  });
});
