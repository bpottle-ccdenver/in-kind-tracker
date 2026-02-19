import { describe, it, expect } from 'vitest';
import { createPageUrl } from '../index';

describe('createPageUrl', () => {
  it('lowercases names and prefixes with a slash', () => {
    expect(createPageUrl('Dashboard')).toBe('/dashboard');
    expect(createPageUrl('Locations')).toBe('/locations');
  });

  it('replaces spaces with hyphens in the url', () => {
    expect(createPageUrl('Revenue By Program')).toBe('/revenue-by-program');
    expect(createPageUrl('Patient Volume Report')).toBe('/patient-volume-report');
  });
});
