import { apiUrl } from './config';

function transformDonation(row) {
  if (!row || typeof row !== 'object') return row;
  const {
    donation_id,
    date_received,
    gl_acct,
    quantity,
    amount,
    total_fair_market_value,
    description,
    ministry_code,
    organization_code,
    individual_id,
    user_id,
    ...rest
  } = row;

  const qty = quantity == null ? null : Number(quantity);
  const amt = amount == null ? null : Number(amount);
  const total = total_fair_market_value != null
    ? Number(total_fair_market_value)
    : qty != null && amt != null
      ? qty * amt
      : null;

  return {
    id: donation_id,
    donation_id,
    date_received: date_received ?? null,
    gl_acct: gl_acct ?? '',
    quantity: qty,
    amount: amt,
    total_fair_market_value: total,
    description: description ?? '',
    ministry_code: ministry_code ?? '',
    organization_code: organization_code ?? '',
    individual_id: individual_id ?? null,
    user_id: user_id ?? null,
    ...rest,
  };
}

function serializeDonationPayload(data = {}) {
  const payload = {};

  if (data.date_received !== undefined) payload.date_received = data.date_received;
  if (data.gl_acct !== undefined) payload.gl_acct = data.gl_acct?.toString().trim();
  if (data.quantity !== undefined) payload.quantity = Number(data.quantity);
  if (data.amount !== undefined) payload.amount = Number(data.amount);
  if (data.description !== undefined) payload.description = data.description?.trim() || null;
  if (data.ministry_code !== undefined) payload.ministry_code = data.ministry_code || null;
  if (data.organization_code !== undefined) payload.organization_code = data.organization_code || null;
  if (data.individual_id !== undefined) payload.individual_id = data.individual_id || null;

  return payload;
}

class DonationAPI {
  async list(filters = {}) {
    const params = new URLSearchParams();
    if (filters?.individual_id != null && filters.individual_id !== '') {
      params.set('individual_id', String(filters.individual_id));
    }
    if (filters?.organization_code != null && filters.organization_code !== '') {
      params.set('organization_code', String(filters.organization_code));
    }
    const query = params.toString();
    const response = await fetch(apiUrl(`/donation${query ? `?${query}` : ''}`), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`Failed to fetch donations: ${response.status}`);
    const data = await response.json();
    return Array.isArray(data) ? data.map(transformDonation) : [];
  }

  async get(id) {
    if (!id) throw new Error('Donation.get requires an id');
    const response = await fetch(apiUrl(`/donation/${encodeURIComponent(id)}`), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`Failed to fetch donation ${id}: ${response.status}`);
    const row = await response.json();
    return transformDonation(row);
  }

  async create(data) {
    const response = await fetch(apiUrl('/donation'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(serializeDonationPayload(data)),
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Failed to create donation: ${response.status} ${message}`);
    }
    const row = await response.json();
    return transformDonation(row);
  }

  async update(id, data) {
    if (!id) throw new Error('Donation.update requires an id');
    const response = await fetch(apiUrl(`/donation/${encodeURIComponent(id)}`), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(serializeDonationPayload(data)),
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Failed to update donation ${id}: ${response.status} ${message}`);
    }
    const row = await response.json();
    return transformDonation(row);
  }

  async delete(id) {
    if (!id) throw new Error('Donation.delete requires an id');
    const response = await fetch(apiUrl(`/donation/${encodeURIComponent(id)}`), {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok && response.status !== 204) {
      const message = await response.text();
      throw new Error(`Failed to delete donation ${id}: ${response.status} ${message}`);
    }
    return {};
  }

  async importCsv(file) {
    if (!file) throw new Error('Donation.importCsv requires a file');
    const csvText = await file.text();
    const response = await fetch(apiUrl('/donation/import'), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/csv',
        Accept: 'application/json',
      },
      body: csvText,
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Failed to import donations: ${response.status} ${message}`);
    }
    return response.json();
  }
}

export default new DonationAPI();
