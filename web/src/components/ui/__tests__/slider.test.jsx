import { render } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';

let Slider;

beforeAll(async () => {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  if (!globalThis.ResizeObserver) {
    globalThis.ResizeObserver = ResizeObserverMock;
  }

  ({ Slider } = await import('../slider.jsx'));
});

describe('Slider', () => {
  it('renders the slider thumb with provided value', () => {
    const { container } = render(<Slider defaultValue={[40]} max={100} aria-label="Volume" />);

    const thumb = container.querySelector('[role="slider"]');
    expect(thumb).toHaveAttribute('aria-valuenow', '40');
    expect(thumb?.closest('[aria-label="Volume"]')).toHaveClass('flex');
  });

  it('merges custom class names and renders track elements', () => {
    const { container } = render(
      <Slider defaultValue={[10]} max={50} className="custom-slider" aria-label="Brightness" />,
    );

    const root = container.querySelector('[aria-label="Brightness"]');
    expect(root).toHaveClass('custom-slider');

    const track = root?.querySelector(':scope > span');
    expect(track).toBeInTheDocument();

    const range = track?.querySelector('span');
    expect(range).toBeInTheDocument();
  });
});
