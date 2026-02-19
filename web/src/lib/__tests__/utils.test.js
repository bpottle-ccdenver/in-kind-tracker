import { describe, it, expect } from 'vitest';
import { cn } from '../utils.js';

describe('cn', () => {
  it('merges duplicate utility classes with tailwind precedence', () => {
    expect(cn('px-2', undefined, 'px-4', 'text-sm')).toBe('px-4 text-sm');
  });

  it('flattens conditional inputs and omits falsy values', () => {
    expect(
      cn('font-bold', ['text-sm', { hidden: false }], { 'bg-emerald-500': true }, null),
    ).toBe('font-bold text-sm bg-emerald-500');
  });
});
