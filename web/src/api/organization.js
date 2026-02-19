import { apiUrl } from './config';

function transformOrganization(row) {
  if (!row || typeof row !== 'object') return row;
  const {
    organization_code,
    organization_name,
    contact_first_name,
    contact_last_name,
    address,
    city,
    state,
    zip,
    contact_email,
    code,
    name,
    ...rest
  } = row;

  const normalizedCode = organization_code ?? code ?? null;
  const normalizedName = organization_name ?? name ?? null;

  return {
    code: normalizedCode,
    organization_code: normalizedCode,
    name: normalizedName,
    organization_name: normalizedName,
    contact_first_name: contact_first_name ?? null,
    contact_last_name: contact_last_name ?? null,
    address: address ?? null,
    city: city ?? null,
    state: state ?? null,
    zip: zip ?? null,
    contact_email: contact_email ?? null,
    ...rest,
  };
}

function serializeOrganizationPayload(data = {}) {
  const payload = {};

  if (data.organization_code !== undefined || data.code !== undefined) {
    const code = data.organization_code ?? data.code;
    payload.organization_code = typeof code === 'string' ? code.trim().toUpperCase() : code;
  }

  if (data.organization_name !== undefined || data.name !== undefined) {
    const name = data.organization_name ?? data.name;
    payload.organization_name = typeof name === 'string' ? name.trim() : name;
  }

  if (data.contact_first_name !== undefined) {
    payload.contact_first_name = data.contact_first_name?.trim() || null;
  }
  if (data.contact_last_name !== undefined) {
    payload.contact_last_name = data.contact_last_name?.trim() || null;
  }
  if (data.address !== undefined) {
    payload.address = data.address?.trim() || null;
  }
  if (data.city !== undefined) {
    payload.city = data.city?.trim() || null;
  }
  if (data.state !== undefined) {
    payload.state = data.state?.trim() || null;
  }
  if (data.zip !== undefined) {
    payload.zip = data.zip?.trim() || null;
  }
  if (data.contact_email !== undefined) {
    payload.contact_email = data.contact_email?.trim().toLowerCase() || null;
  }

  return payload;
}

class OrganizationAPI {
  async list() {
    const response = await fetch(apiUrl('/organization'), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`Failed to fetch organizations: ${response.status}`);
    const data = await response.json();
    return Array.isArray(data) ? data.map(transformOrganization) : [];
  }

  async get(code) {
    if (!code) throw new Error('Organization.get requires a code');
    const response = await fetch(apiUrl(`/organization/${encodeURIComponent(code)}`), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`Failed to fetch organization ${code}: ${response.status}`);
    const row = await response.json();
    return transformOrganization(row);
  }

  async create(data) {
    const response = await fetch(apiUrl('/organization'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(serializeOrganizationPayload(data)),
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Failed to create organization: ${response.status} ${message}`);
    }
    const row = await response.json();
    return transformOrganization(row);
  }

  async update(code, data) {
    if (!code) throw new Error('Organization.update requires a code');
    const response = await fetch(apiUrl(`/organization/${encodeURIComponent(code)}`), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(serializeOrganizationPayload(data)),
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Failed to update organization ${code}: ${response.status} ${message}`);
    }
    const row = await response.json();
    return transformOrganization(row);
  }

  async delete(code) {
    if (!code) throw new Error('Organization.delete requires a code');
    const response = await fetch(apiUrl(`/organization/${encodeURIComponent(code)}`), {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok && response.status !== 204) {
      const message = await response.text();
      throw new Error(`Failed to delete organization ${code}: ${response.status} ${message}`);
    }
    return {};
  }
}

export default new OrganizationAPI();
