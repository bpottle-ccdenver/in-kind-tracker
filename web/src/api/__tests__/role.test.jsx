import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Role from '../role.js';

const createFetchResponse = (data, ok = true, extras = {}) =>
  Promise.resolve({
    ok,
    status: ok ? 200 : 400,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(typeof data === 'string' ? data : JSON.stringify(data)),
    ...extras,
  });

describe('Role API', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('transforms list responses into friendly shape', async () => {
    fetchMock.mockImplementation(() =>
      createFetchResponse([
        {
          role_id: 7,
          role_name: 'Manager',
          default_route: 'UserManagement',
          permissions: [
            { permission_id: 1, permission: 'view users' },
            { permission_id: 2, permission: 'manage users' },
          ],
        },
      ]),
    );

    const result = await Role.list();

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/role'), expect.any(Object));
    expect(result).toEqual([
      {
        id: 7,
        role_name: 'Manager',
        default_route: 'UserManagement',
        permissions: [
          { id: 1, permission_id: 1, permission: 'view users' },
          { id: 2, permission_id: 2, permission: 'manage users' },
        ],
      },
    ]);
  });

  it('serializes create payload removing identifiers and normalizing values', async () => {
    fetchMock.mockImplementation(() =>
      createFetchResponse({
        role_id: 9,
        role_name: 'Analyst',
        default_route: 'RoleManagement',
        permissions: [],
      }),
    );

    const payload = {
      id: 123,
      role_id: 321,
      role_name: '  Analyst ',
      default_route: '  RoleManagement ',
      permission_ids: [1, '2', 2, 0, 'abc', null],
    };

    const role = await Role.create(payload);

    const [, requestInit] = fetchMock.mock.calls[0];
    const body = JSON.parse(requestInit.body);
    expect(body).toEqual({
      role_name: 'Analyst',
      default_route: 'RoleManagement',
      permission_ids: [1, 2],
    });
    expect(role).toEqual({
      id: 9,
      role_name: 'Analyst',
      default_route: 'RoleManagement',
      permissions: [],
    });
  });

  it('rejects update without an identifier', async () => {
    await expect(Role.update(undefined, {})).rejects.toThrow('Role.update requires an id');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
