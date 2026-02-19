import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Progress } from '../progress.jsx';

describe('Progress', () => {
  it('sets indicator transform based on value', () => {
    const { container } = render(<Progress value={40} />);
    const indicator = container.querySelector('[style*="translateX"]');
    expect(indicator?.style.transform).toBe('translateX(-60%)');
  });
});
