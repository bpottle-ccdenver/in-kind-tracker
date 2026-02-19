import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

let latestProps;

vi.mock('react-day-picker', () => ({
  DayPicker: (props) => {
    latestProps = props;
    return <div data-testid="day-picker" className={props.className} />;
  },
}));

const { Calendar } = await import('../calendar.jsx');

describe('Calendar', () => {
  beforeEach(() => {
    latestProps = undefined;
  });

  it('applies default configuration to DayPicker', () => {
    const { getByTestId } = render(<Calendar className="custom" />);

    const dayPicker = getByTestId('day-picker');
    expect(dayPicker).toHaveClass('p-3');
    expect(dayPicker).toHaveClass('custom');
    expect(latestProps.showOutsideDays).toBe(true);
    expect(latestProps.classNames).toBeDefined();
    expect(latestProps.components).toBeDefined();
  });

  it('provides navigation icons with merged class names', () => {
    render(<Calendar />);

    const { IconLeft, IconRight } = latestProps.components;
    const { container: leftContainer } = render(IconLeft({ className: 'extra' }));
    const leftIcon = leftContainer.querySelector('svg');
    expect(leftIcon).toHaveClass('h-4', 'w-4', 'extra');

    const { container: rightContainer } = render(IconRight({ className: 'additional' }));
    const rightIcon = rightContainer.querySelector('svg');
    expect(rightIcon).toHaveClass('h-4', 'w-4', 'additional');
  });
});
