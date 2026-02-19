import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Permission from '../permission.js';

const createFetchResponse = (data, ok = true) =>
  Promise.resolve({
    ok,
    status: ok ? 200 : 400,
    json: () => Promise.resolve(data),
  });

describe('Permission API', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('transforms permission list results', async () => {
    fetchMock.mockImplementation(() =>
      createFetchResponse([
        { permission_id: 1, permission: 'view users' },
        { permission_id: 2, permission: 'manage users' },
      ]),
    );

    const permissions = await Permission.list();

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/permission'), expect.any(Object));
    expect(permissions).toEqual([
      { id: 1, permission_id: 1, permission: 'view users' },
      { id: 2, permission_id: 2, permission: 'manage users' },
    ]);
  });
});
