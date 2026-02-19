import { apiUrl } from './config';

function transformWishList(row) {
  if (!row || typeof row !== 'object') return row;
  const {
    wishlist_id,
    item_name,
    ministry_code,
    ministry_name,
    type,
    description,
    status,
    created_at,
    updated_at,
    ...rest
  } = row;

  return {
    wishlist_id: wishlist_id == null ? null : Number(wishlist_id),
    id: wishlist_id == null ? null : Number(wishlist_id),
    item_name: item_name ?? '',
    itemName: item_name ?? '',
    ministry_code: ministry_code ?? '',
    ministryCode: ministry_code ?? '',
    ministry_name: ministry_name ?? null,
    ministryName: ministry_name ?? null,
    type: type ?? '',
    description: description ?? '',
    status: status ?? '',
    created_at: created_at ?? null,
    updated_at: updated_at ?? null,
    ...rest,
  };
}

function serializeWishListPayload(data = {}) {
  const payload = {};
  if (data.item_name !== undefined || data.itemName !== undefined) {
    const v = data.item_name ?? data.itemName;
    payload.item_name = typeof v === 'string' ? v.trim() : v;
  }
  if (data.ministry_code !== undefined || data.ministryCode !== undefined) {
    const v = data.ministry_code ?? data.ministryCode;
    payload.ministry_code = typeof v === 'string' ? v.trim().toUpperCase() : v;
  }
  if (data.type !== undefined) payload.type = data.type;
  if (data.description !== undefined) payload.description = data.description?.trim() || null;
  if (data.status !== undefined) payload.status = data.status;
  return payload;
}

class WishListAPI {
  async list({ ministry_code } = {}) {
    const qs = new URLSearchParams();
    if (ministry_code) qs.set('ministry_code', String(ministry_code).trim().toUpperCase());
    const url = qs.toString() ? apiUrl(`/wish-list?${qs.toString()}`) : apiUrl('/wish-list');
    const response = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Failed to fetch wish list: ${response.status}`);
    const data = await response.json();
    return Array.isArray(data) ? data.map(transformWishList) : [];
  }

  async get(wishlistId) {
    if (!wishlistId) throw new Error('WishList.get requires an id');
    const response = await fetch(apiUrl(`/wish-list/${encodeURIComponent(wishlistId)}`), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`Failed to fetch wish list item ${wishlistId}: ${response.status}`);
    const row = await response.json();
    return transformWishList(row);
  }

  async create(data) {
    const response = await fetch(apiUrl('/wish-list'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(serializeWishListPayload(data)),
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Failed to create wish list item: ${response.status} ${message}`);
    }
    const row = await response.json();
    return transformWishList(row);
  }

  async update(wishlistId, data) {
    if (!wishlistId) throw new Error('WishList.update requires an id');
    const response = await fetch(apiUrl(`/wish-list/${encodeURIComponent(wishlistId)}`), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(serializeWishListPayload(data)),
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Failed to update wish list item ${wishlistId}: ${response.status} ${message}`);
    }
    const row = await response.json();
    return transformWishList(row);
  }

  async delete(wishlistId) {
    if (!wishlistId) throw new Error('WishList.delete requires an id');
    const response = await fetch(apiUrl(`/wish-list/${encodeURIComponent(wishlistId)}`), {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok && response.status !== 204) {
      const message = await response.text();
      throw new Error(`Failed to delete wish list item ${wishlistId}: ${response.status} ${message}`);
    }
    return {};
  }
}

export default new WishListAPI();

