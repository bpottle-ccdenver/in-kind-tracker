import { apiUrl } from './config';

function transformIndividual(row) {
  if (!row || typeof row !== 'object') return row;
  const {
    individual_first_name,
    individual_last_name,
    address,
    city,
    state,
    zip,
    email,
    individual_id,
    id,
    first_name,
    last_name,
    ...rest
  } = row;

  const normalizedId = individual_id ?? id ?? null;
  const normalizedFirst = individual_first_name ?? first_name ?? null;
  const normalizedLast = individual_last_name ?? last_name ?? null;

  return {
    id: normalizedId,
    individual_id: normalizedId,
    first_name: normalizedFirst,
    last_name: normalizedLast,
    individual_first_name: normalizedFirst,
    individual_last_name: normalizedLast,
    address: address ?? null,
    city: city ?? null,
    state: state ?? null,
    zip: zip ?? null,
    email: email ?? null,
    ...rest,
  };
}

function serializeIndividualPayload(data = {}) {
  const payload = {};

  if (data.individual_first_name !== undefined || data.first_name !== undefined) {
    const v = data.individual_first_name ?? data.first_name;
    payload.individual_first_name = typeof v === 'string' ? v.trim() : v;
  }

  if (data.individual_last_name !== undefined || data.last_name !== undefined) {
    const v = data.individual_last_name ?? data.last_name;
    payload.individual_last_name = typeof v === 'string' ? v.trim() : v;
  }

  if (data.address !== undefined) payload.address = data.address?.trim() || null;
  if (data.city !== undefined) payload.city = data.city?.trim() || null;
  if (data.state !== undefined) payload.state = data.state?.trim().toUpperCase() || null;
  if (data.zip !== undefined) payload.zip = data.zip?.trim() || null;
  if (data.email !== undefined) payload.email = data.email?.trim().toLowerCase() || null;

  return payload;
}

class IndividualAPI {
  async list() {
    const response = await fetch(apiUrl('/individual'), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`Failed to fetch individuals: ${response.status}`);
    const data = await response.json();
    return Array.isArray(data) ? data.map(transformIndividual) : [];
  }

  async get(code) {
    if (!code) throw new Error('Individual.get requires an id');
    const response = await fetch(apiUrl(`/individual/${encodeURIComponent(code)}`), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`Failed to fetch individual ${code}: ${response.status}`);
    const row = await response.json();
    return transformIndividual(row);
  }

  async create(data) {
    const response = await fetch(apiUrl('/individual'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(serializeIndividualPayload(data)),
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Failed to create individual: ${response.status} ${message}`);
    }
    const row = await response.json();
    return transformIndividual(row);
  }

  async update(code, data) {
    if (!code) throw new Error('Individual.update requires an id');
    const response = await fetch(apiUrl(`/individual/${encodeURIComponent(code)}`), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(serializeIndividualPayload(data)),
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Failed to update individual ${code}: ${response.status} ${message}`);
    }
    const row = await response.json();
    return transformIndividual(row);
  }

  async delete(code) {
    if (!code) throw new Error('Individual.delete requires an id');
    const response = await fetch(apiUrl(`/individual/${encodeURIComponent(code)}`), {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok && response.status !== 204) {
      const message = await response.text();
      throw new Error(`Failed to delete individual ${code}: ${response.status} ${message}`);
    }
    return {};
  }

  async importCsv(file) {
    if (!file) throw new Error('Individual.importCsv requires a file');
    const csvText = await file.text();
    const response = await fetch(apiUrl('/individual/import'), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/csv',
        Accept: 'application/json',
      },
      body: csvText,
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Failed to import individuals: ${response.status} ${message}`);
    }
    return response.json();
  }
}

export default new IndividualAPI();
