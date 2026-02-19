const COLUMN_NAME_PATTERN = /^[a-z0-9_]+$/i;

/**
 * Normalize and validate sort directives before sending them to the API.
 * Accepts a string or array of strings (e.g. '-total_revenue', 'week_start_date').
 * Returns an array of sanitized sort directives or null when none are valid.
 * Throws when an entry is not a non-empty string or references a disallowed column.
 *
 * @param {string|string[]} sort
 * @param {Iterable<string>} allowedColumns
 * @returns {string[]|null}
 */
export function sanitizeSort(sort, allowedColumns) {
  if (!sort) {
    return null;
  }

  const allowed = new Map();
  for (const column of allowedColumns || []) {
    if (typeof column === 'string') {
      allowed.set(column.toLowerCase(), column);
    }
  }

  const entries = Array.isArray(sort) ? sort : [sort];
  const sanitized = [];

  for (const entry of entries) {
    if (typeof entry !== 'string') {
      throw new Error('Sort values must be strings.');
    }

    let raw = entry.trim();
    if (raw.length === 0) {
      continue;
    }

    let direction = '';
    if (raw.startsWith('-') || raw.startsWith('+')) {
      direction = raw[0];
      raw = raw.slice(1).trim();
    }

    if (!COLUMN_NAME_PATTERN.test(raw)) {
      throw new Error(`Invalid sort column: ${raw}`);
    }

    const normalized = raw.toLowerCase();
    if (!allowed.has(normalized)) {
      throw new Error(`Invalid sort column: ${raw}`);
    }

    const canonical = allowed.get(normalized);
    sanitized.push(direction === '-' ? `-${canonical}` : direction === '+' ? `+${canonical}` : canonical);
  }

  return sanitized.length > 0 ? sanitized : null;
}
