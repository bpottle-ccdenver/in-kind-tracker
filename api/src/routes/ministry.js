import express from 'express';
import { pool } from '../db.js';

const router = express.Router();

router.use(express.json());

function normalizeMinistryRow(row) {
  if (!row) return row;
  const { ministry_code, ministry_name, has_scale, created_at, updated_at } = row;
  return {
    ministry_code,
    ministry_name,
    has_scale: Boolean(has_scale),
    created_at: created_at ?? null,
    updated_at: updated_at ?? null,
  };
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

function validateMinistryName(name) {
  if (name === undefined || name === null) {
    throw new Error('ministry_name is required.');
  }
  const normalized = String(name).trim();
  if (!normalized) {
    throw new Error('ministry_name is required.');
  }
  if (normalized.length > 255) {
    throw new Error('ministry_name must be 255 characters or fewer.');
  }
  return normalized;
}

function normalizeHasScale(value) {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'n', 'off'].includes(normalized)) {
      return false;
    }
  }
  return Boolean(value);
}

async function fetchMinistryByCode(ministryCode, client = pool) {
  const sql = `
    SELECT ministry_code, ministry_name, has_scale, created_at, updated_at
    FROM in_kind_tracker.ministry
    WHERE ministry_code = $1
    LIMIT 1
  `;
  const { rows } = await client.query(sql, [ministryCode]);
  return rows.length ? normalizeMinistryRow(rows[0]) : null;
}

router.get('/', async (_req, res) => {
  try {
    const sql = `
      SELECT ministry_code, ministry_name, has_scale, created_at, updated_at
      FROM in_kind_tracker.ministry
      ORDER BY ministry_name ASC
    `;
    const { rows } = await pool.query(sql);
    return res.json(rows.map(normalizeMinistryRow));
  } catch (err) {
    console.error('Error listing ministries:', err);
    return res.status(500).json({ error: 'Internal server error, ' + (err?.message || err) });
  }
});

router.get('/:ministry_code', async (req, res) => {
  try {
    const ministryCode = validateMinistryCode(req.params.ministry_code);
    const ministry = await fetchMinistryByCode(ministryCode);
    if (!ministry) {
      return res.status(404).json({ error: 'Ministry not found' });
    }
    return res.json(ministry);
  } catch (err) {
    console.error('Error fetching ministry:', err);
    if (err?.message?.includes('ministry_code')) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Internal server error, ' + (err?.message || err) });
  }
});

router.post('/', async (req, res) => {
  try {
    const { ministry_code, ministry_name, has_scale } = req.body || {};
    const code = validateMinistryCode(ministry_code);
    const name = validateMinistryName(ministry_name);
    const hasScale = normalizeHasScale(has_scale);

    const sql = `
      INSERT INTO in_kind_tracker.ministry (ministry_code, ministry_name, has_scale)
      VALUES ($1, $2, COALESCE($3, FALSE))
      RETURNING ministry_code
    `;
    const { rows } = await pool.query(sql, [code, name, hasScale]);
    const created = await fetchMinistryByCode(rows[0].ministry_code);
    return res.status(201).json(created ?? normalizeMinistryRow(rows[0]));
  } catch (err) {
    console.error('Error creating ministry:', err);
    if (err?.code === '23505') {
      return res.status(409).json({ error: 'A ministry with that code or name already exists.' });
    }
    if (err?.message) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Internal server error, ' + (err?.message || err) });
  }
});

router.patch('/:ministry_code', async (req, res) => {
  try {
    const ministryCode = validateMinistryCode(req.params.ministry_code);
    const { ministry_name, has_scale } = req.body || {};

    const updates = [];
    const values = [];

    if (ministry_name !== undefined) {
      const name = validateMinistryName(ministry_name);
      updates.push(`ministry_name = $${updates.length + 1}`);
      values.push(name);
    }

    if (has_scale !== undefined) {
      const hasScale = normalizeHasScale(has_scale);
      updates.push(`has_scale = $${updates.length + 1}`);
      values.push(hasScale);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updatable fields provided.' });
    }

    updates.push(`updated_at = NOW()`);
    const sql = `
      UPDATE in_kind_tracker.ministry
      SET ${updates.join(', ')}
      WHERE ministry_code = $${values.length + 1}
      RETURNING ministry_code
    `;
    values.push(ministryCode);

    const { rows } = await pool.query(sql, values);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Ministry not found' });
    }

    const updated = await fetchMinistryByCode(ministryCode);
    return res.json(updated ?? normalizeMinistryRow(rows[0]));
  } catch (err) {
    console.error('Error updating ministry:', err);
    if (err?.code === '23505') {
      return res.status(409).json({ error: 'A ministry with that code or name already exists.' });
    }
    if (err?.message) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Internal server error, ' + (err?.message || err) });
  }
});

router.delete('/:ministry_code', async (req, res) => {
  try {
    const ministryCode = validateMinistryCode(req.params.ministry_code);
    const sql = `
      DELETE FROM in_kind_tracker.ministry
      WHERE ministry_code = $1
      RETURNING ministry_code
    `;
    const { rows } = await pool.query(sql, [ministryCode]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Ministry not found' });
    }
    return res.status(204).send();
  } catch (err) {
    console.error('Error deleting ministry:', err);
    if (err?.message) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Internal server error, ' + (err?.message || err) });
  }
});

export { router };













