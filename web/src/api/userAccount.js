import { apiUrl } from './config';

function transformUser(row) {
  if (!row || typeof row !== 'object') return row;
  const { user_id, ...rest } = row;
  return { id: user_id, ...rest };
}

function serializeUserPayload(data = {}) {
  const payload = { ...data };

  if (payload.id !== undefined) {
    delete payload.id;
  }
  if (payload.user_id !== undefined) {
    delete payload.user_id;
  }

  if (payload.username != null) {
    payload.username = String(payload.username).trim().toLowerCase();
  }

  if (payload.name != null) {
    payload.name = String(payload.name).trim();
  }

  if (payload.status != null) {
    payload.status = String(payload.status).trim().toLowerCase();
  }

  if (payload.profile_image_url != null) {
    const trimmed = String(payload.profile_image_url).trim();
    payload.profile_image_url = trimmed.length ? trimmed : null;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'role_id')) {
    const value = payload.role_id;
    if (value === undefined) {
      delete payload.role_id;
    } else if (value === null || value === '' || value === 'none') {
      payload.role_id = null;
    } else {
      const parsed = Number(value);
      if (Number.isNaN(parsed)) {
        throw new Error('role_id must be numeric');
      }
      payload.role_id = parsed;
    }
  }

  return payload;
}

class UserAccountAPI {
  async list(sort, limit, skip, fields) {
    const url = new URL(apiUrl('/user'), window.location.origin);
    if (sort) url.searchParams.set('sort', JSON.stringify(sort));
    if (typeof limit === 'number') url.searchParams.set('limit', String(limit));
    if (typeof skip === 'number') url.searchParams.set('skip', String(skip));
    if (fields) url.searchParams.set('fields', JSON.stringify(fields));

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`Failed to fetch users: ${response.status}`);
    const data = await response.json();
    return Array.isArray(data) ? data.map(transformUser) : [];
  }

  async get(id) {
    if (!id) throw new Error('UserAccount.get requires an id');
    const response = await fetch(apiUrl(`/user/${encodeURIComponent(id)}`), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`Failed to fetch user ${id}: ${response.status}`);
    const row = await response.json();
    return transformUser(row);
  }

  async create(data) {
    const response = await fetch(apiUrl('/user'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(serializeUserPayload(data)),
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Failed to create user: ${response.status} ${message}`);
    }
    const row = await response.json();
    return transformUser(row);
  }

  async update(id, data) {
    if (!id) throw new Error('UserAccount.update requires an id');
    const response = await fetch(apiUrl(`/user/${encodeURIComponent(id)}`), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(serializeUserPayload(data)),
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Failed to update user ${id}: ${response.status} ${message}`);
    }
    const row = await response.json();
    return transformUser(row);
  }

}

export default new UserAccountAPI();
