import { apiUrl } from './config';

function transformMinistry(row) {
  if (!row || typeof row !== 'object') return row;
  const {
    ministry_code,
    ministry_name,
    has_scale,
    code,
    name,
    id,
    created_at,
    updated_at,
    ...rest
  } = row;

  const normalizedCode = ministry_code ?? code ?? id ?? null;
  const normalizedName = ministry_name ?? name ?? null;

  const normalized = {
    id: normalizedCode,
    code: normalizedCode,
    ministry_code: normalizedCode,
    name: normalizedName,
    ministry_name: normalizedName,
    has_scale: has_scale ?? Boolean(row.has_scale),
    created_at: created_at ?? null,
    updated_at: updated_at ?? null,
    ...rest,
  };

  normalized.has_scale = Boolean(normalized.has_scale);
  return normalized;
}

function serializeMinistryPayload(data = {}) {
  const payload = {};

  if (data.code !== undefined || data.ministry_code !== undefined) {
    const code = data.ministry_code ?? data.code;
    payload.ministry_code = typeof code === 'string' ? code.trim().toUpperCase() : code;
  }

  if (data.name !== undefined || data.ministry_name !== undefined) {
    const name = data.ministry_name ?? data.name;
    payload.ministry_name = typeof name === 'string' ? name.trim() : name;
  }

  if (data.has_scale !== undefined) {
    payload.has_scale = Boolean(data.has_scale);
  }

  return payload;
}

class MinistryAPI {
  async list() {
    const response = await fetch(apiUrl('/ministry'), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`Failed to fetch ministries: ${response.status}`);
    const data = await response.json();
    return Array.isArray(data) ? data.map(transformMinistry) : [];
  }

  async get(code) {
    if (!code) throw new Error('Ministry.get requires a code');
    const response = await fetch(apiUrl(`/ministry/${encodeURIComponent(code)}`), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`Failed to fetch ministry ${code}: ${response.status}`);
    const row = await response.json();
    return transformMinistry(row);
  }

  async create(data) {
    const response = await fetch(apiUrl('/ministry'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(serializeMinistryPayload(data)),
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Failed to create ministry: ${response.status} ${message}`);
    }
    const row = await response.json();
    return transformMinistry(row);
  }

  async update(code, data) {
    if (!code) throw new Error('Ministry.update requires a code');
    const response = await fetch(apiUrl(`/ministry/${encodeURIComponent(code)}`), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(serializeMinistryPayload(data)),
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Failed to update ministry ${code}: ${response.status} ${message}`);
    }
    const row = await response.json();
    return transformMinistry(row);
  }

  async delete(code) {
    if (!code) throw new Error('Ministry.delete requires a code');
    const response = await fetch(apiUrl(`/ministry/${encodeURIComponent(code)}`), {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok && response.status !== 204) {
      const message = await response.text();
      throw new Error(`Failed to delete ministry ${code}: ${response.status} ${message}`);
    }
    return {};
  }
}

export default new MinistryAPI();













