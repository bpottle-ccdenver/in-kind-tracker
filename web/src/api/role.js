import { apiUrl } from './config';

function transformRole(row) {
  if (!row || typeof row !== 'object') return row;
  const { role_id, role_name, default_route, permissions } = row;
  return {
    id: role_id,
    role_name,
    default_route: default_route ?? null,
    permissions: Array.isArray(permissions)
      ? permissions.map((perm) => ({
          id: perm.permission_id,
          permission_id: perm.permission_id,
          permission: perm.permission,
        }))
      : [],
  };
}

function serializeRolePayload(data = {}) {
  const payload = { ...data };

  if (payload.id !== undefined) {
    delete payload.id;
  }
  if (payload.role_id !== undefined) {
    delete payload.role_id;
  }

  if (payload.role_name != null) {
    payload.role_name = String(payload.role_name).trim();
  }

  if (payload.default_route !== undefined) {
    const value = payload.default_route;
    if (value === null || value === '') {
      payload.default_route = null;
    } else {
      payload.default_route = String(value).trim();
      if (!payload.default_route.length) {
        payload.default_route = null;
      }
    }
  }

  if (Array.isArray(payload.permission_ids)) {
    payload.permission_ids = Array.from(
      new Set(
        payload.permission_ids
          .map((value) => Number(value))
          .filter((value) => Number.isInteger(value) && value > 0),
      ),
    );
  } else if (payload.permission_ids !== undefined) {
    delete payload.permission_ids;
  }

  return payload;
}

class RoleAPI {
  async list() {
    const response = await fetch(apiUrl('/role'), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`Failed to fetch roles: ${response.status}`);
    const data = await response.json();
    return Array.isArray(data) ? data.map(transformRole) : [];
  }

  async get(id) {
    if (!id) throw new Error('Role.get requires an id');
    const response = await fetch(apiUrl(`/role/${encodeURIComponent(id)}`), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`Failed to fetch role ${id}: ${response.status}`);
    const row = await response.json();
    return transformRole(row);
  }

  async create(data) {
    const response = await fetch(apiUrl('/role'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(serializeRolePayload(data)),
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Failed to create role: ${response.status} ${message}`);
    }
    const row = await response.json();
    return transformRole(row);
  }

  async update(id, data) {
    if (!id) throw new Error('Role.update requires an id');
    const response = await fetch(apiUrl(`/role/${encodeURIComponent(id)}`), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(serializeRolePayload(data)),
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Failed to update role ${id}: ${response.status} ${message}`);
    }
    const row = await response.json();
    return transformRole(row);
  }

  async delete(id) {
    if (!id) throw new Error('Role.delete requires an id');
    const response = await fetch(apiUrl(`/role/${encodeURIComponent(id)}`), {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok && response.status !== 204) {
      const message = await response.text();
      throw new Error(`Failed to delete role ${id}: ${response.status} ${message}`);
    }
    return {};
  }
}

export default new RoleAPI();
