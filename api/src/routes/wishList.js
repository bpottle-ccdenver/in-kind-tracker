import express from 'express';
import { pool } from '../db.js';

const router = express.Router();

router.use(express.json());

const WISH_LIST_TYPES = new Set([
  'Capital Item Over 10K',
  'In-kind Item',
  'Volunteer Needs',
  'Monetary Donation',
  'Monitary Donation',
]);

const WISH_LIST_STATUSES = new Set(['Open Request', 'In Progress', 'Fulfilled']);

function normalizeWishListRow(row) {
  if (!row) return row;
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
  } = row;
  return {
    wishlist_id: wishlist_id == null ? null : Number(wishlist_id),
    item_name,
    ministry_code,
    ministry_name: ministry_name ?? null,
    type,
    description: description ?? null,
    status,
    created_at: created_at ?? null,
    updated_at: updated_at ?? null,
  };
}

function validateWishlistId(value) {
  if (value === undefined || value === null) {
    throw new Error('wishlist_id is required.');
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error('wishlist_id must be a positive integer.');
  }
  return parsed;
}

function validateMinistryCode(code) {
  if (code === undefined || code === null) {
    throw new Error('ministry_code is required.');
  }
  const normalized = String(code).trim().toUpperCase();
  if (!/^[A-Z0-9_-]{2,50}$/.test(normalized)) {
    throw new Error('ministry_code must be 2-50 characters using letters, numbers, hyphens, or underscores.');
  }
  return normalized;
}

function validateItemName(value) {
  if (value === undefined || value === null) {
    throw new Error('item_name is required.');
  }
  const normalized = String(value).trim();
  if (!normalized) {
    throw new Error('item_name is required.');
  }
  if (normalized.length > 255) {
    throw new Error('item_name must be 255 characters or fewer.');
  }
  return normalized;
}

function validateType(value) {
  if (value === undefined || value === null) {
    throw new Error('type is required.');
  }
  const normalized = String(value).trim();
  if (!WISH_LIST_TYPES.has(normalized)) {
    throw new Error(`type must be one of: ${Array.from(WISH_LIST_TYPES).join(', ')}`);
  }
  return normalized;
}

function validateOptionalDescription(value) {
  if (value === undefined || value === null) {
    return null;
  }
  const normalized = String(value).trim();
  if (!normalized) {
    return null;
  }
  return normalized;
}

function validateStatus(value) {
  if (value === undefined || value === null) {
    throw new Error('status is required.');
  }
  const normalized = String(value).trim();
  if (!WISH_LIST_STATUSES.has(normalized)) {
    throw new Error(`status must be one of: ${Array.from(WISH_LIST_STATUSES).join(', ')}`);
  }
  return normalized;
}

async function fetchWishListById(id, client = pool) {
  const sql = `
    SELECT w.wishlist_id, w.item_name, w.ministry_code, m.ministry_name, w.type, w.description, w.status, w.created_at, w.updated_at
    FROM in_kind_tracker.wish_list w
    JOIN in_kind_tracker.ministry m ON m.ministry_code = w.ministry_code
    WHERE w.wishlist_id = $1
    LIMIT 1
  `;
  const { rows } = await client.query(sql, [id]);
  return rows.length ? normalizeWishListRow(rows[0]) : null;
}

router.get('/', async (req, res) => {
  try {
    const ministryCode = req.query?.ministry_code ? validateMinistryCode(req.query.ministry_code) : null;

    const where = [];
    const params = [];

    if (ministryCode) {
      params.push(ministryCode);
      where.push(`w.ministry_code = $${params.length}`);
    }

    const sql = `
      SELECT w.wishlist_id, w.item_name, w.ministry_code, m.ministry_name, w.type, w.description, w.status, w.created_at, w.updated_at
      FROM in_kind_tracker.wish_list w
      JOIN in_kind_tracker.ministry m ON m.ministry_code = w.ministry_code
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY w.status ASC, w.updated_at DESC, w.wishlist_id DESC
    `;

    const { rows } = await pool.query(sql, params);
    return res.json(rows.map(normalizeWishListRow));
  } catch (err) {
    console.error('Error listing wish list items:', err);
    if (err?.message?.includes('ministry_code')) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Internal server error, ' + (err?.message || err) });
  }
});

router.get('/:wishlist_id', async (req, res) => {
  try {
    const wishlistId = validateWishlistId(req.params.wishlist_id);
    const item = await fetchWishListById(wishlistId);
    if (!item) {
      return res.status(404).json({ error: 'Wish list item not found' });
    }
    return res.json(item);
  } catch (err) {
    console.error('Error fetching wish list item:', err);
    if (err?.message) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Internal server error, ' + (err?.message || err) });
  }
});

router.post('/', async (req, res) => {
  try {
    const { item_name, ministry_code, type, description, status } = req.body || {};

    const name = validateItemName(item_name);
    const ministryCode = validateMinistryCode(ministry_code);
    const validatedType = validateType(type);
    const validatedDescription = validateOptionalDescription(description);
    const validatedStatus = status === undefined || status === null ? 'Open Request' : validateStatus(status);

    const sql = `
      INSERT INTO in_kind_tracker.wish_list (item_name, ministry_code, type, description, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING wishlist_id
    `;
    const params = [name, ministryCode, validatedType, validatedDescription, validatedStatus];
    const { rows } = await pool.query(sql, params);
    const created = await fetchWishListById(rows[0].wishlist_id);
    return res.status(201).json(created ?? normalizeWishListRow(rows[0]));
  } catch (err) {
    console.error('Error creating wish list item:', err);
    if (err?.code === '23503') {
      return res.status(400).json({ error: 'Invalid ministry_code.' });
    }
    if (err?.message) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Internal server error, ' + (err?.message || err) });
  }
});

router.patch('/:wishlist_id', async (req, res) => {
  try {
    const wishlistId = validateWishlistId(req.params.wishlist_id);
    const payload = req.body || {};

    const updates = [];
    const values = [];

    if (payload.item_name !== undefined) {
      const v = validateItemName(payload.item_name);
      updates.push(`item_name = $${updates.length + 1}`);
      values.push(v);
    }

    if (payload.ministry_code !== undefined) {
      const v = validateMinistryCode(payload.ministry_code);
      updates.push(`ministry_code = $${updates.length + 1}`);
      values.push(v);
    }

    if (payload.type !== undefined) {
      const v = validateType(payload.type);
      updates.push(`type = $${updates.length + 1}`);
      values.push(v);
    }

    if (payload.description !== undefined) {
      const v = validateOptionalDescription(payload.description);
      updates.push(`description = $${updates.length + 1}`);
      values.push(v);
    }

    if (payload.status !== undefined) {
      const v = validateStatus(payload.status);
      updates.push(`status = $${updates.length + 1}`);
      values.push(v);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updatable fields provided.' });
    }

    updates.push(`updated_at = NOW()`);

    const sql = `
      UPDATE in_kind_tracker.wish_list
      SET ${updates.join(', ')}
      WHERE wishlist_id = $${values.length + 1}
      RETURNING wishlist_id
    `;
    values.push(wishlistId);

    const { rows } = await pool.query(sql, values);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Wish list item not found' });
    }

    const updated = await fetchWishListById(wishlistId);
    return res.json(updated ?? normalizeWishListRow(rows[0]));
  } catch (err) {
    console.error('Error updating wish list item:', err);
    if (err?.code === '23503') {
      return res.status(400).json({ error: 'Invalid ministry_code.' });
    }
    if (err?.message) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Internal server error, ' + (err?.message || err) });
  }
});

router.delete('/:wishlist_id', async (req, res) => {
  try {
    const wishlistId = validateWishlistId(req.params.wishlist_id);
    const sql = `
      DELETE FROM in_kind_tracker.wish_list
      WHERE wishlist_id = $1
      RETURNING wishlist_id
    `;
    const { rows } = await pool.query(sql, [wishlistId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Wish list item not found' });
    }
    return res.status(204).send();
  } catch (err) {
    console.error('Error deleting wish list item:', err);
    if (err?.message) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Internal server error, ' + (err?.message || err) });
  }
});

export { router };

