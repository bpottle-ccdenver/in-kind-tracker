import express from 'express';
import { pool } from '../db.js';

const router = express.Router();

router.use(express.json());

const STATE_REGEX = /^[A-Z]{2}$/;
const ZIP_REGEX = /^\d{5}$/;

function parseCsvText(text) {
  const rows = [];
  const normalized = String(text || '').replace(/^\uFEFF/, '');
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i];

    if (inQuotes) {
      if (char === '"') {
        if (normalized[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ',') {
      row.push(field);
      field = '';
      continue;
    }

    if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      continue;
    }

    if (char === '\r') {
      continue;
    }

    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function normalizeIndividualRow(row) {
  if (!row) return row;
  const {
    individual_id,
    individual_first_name,
    individual_last_name,
    address,
    city,
    state,
    zip,
    email,
    created_at,
    updated_at,
  } = row;
  return {
    individual_id,
    individual_first_name,
    individual_last_name,
    address: address ?? null,
    city: city ?? null,
    state: state ?? null,
    zip: zip ?? null,
    email: email ?? null,
    created_at: created_at ?? null,
    updated_at: updated_at ?? null,
  };
}

function validateId(value) {
  if (value === undefined || value === null || value === '') {
    throw new Error('individual_id is required.');
  }
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric <= 0) {
    throw new Error('individual_id must be a positive integer.');
  }
  return numeric;
}

function validateName(value, label) {
  if (value === undefined || value === null) {
    throw new Error(`${label} is required.`);
  }
  const normalized = String(value).trim();
  if (!normalized) {
    throw new Error(`${label} is required.`);
  }
  if (normalized.length > 100) {
    throw new Error(`${label} must be 100 characters or fewer.`);
  }
  return normalized;
}

function validateOptionalString(value, label, maxLength = 255) {
  if (value === undefined || value === null) {
    return null;
  }
  const normalized = String(value).trim();
  if (!normalized) {
    return null;
  }
  if (normalized.length > maxLength) {
    throw new Error(`${label} must be ${maxLength} characters or fewer.`);
  }
  return normalized;
}

function validateOptionalState(value) {
  if (value === undefined || value === null) {
    return null;
  }
  const normalized = String(value).trim().toUpperCase();
  if (!normalized) {
    return null;
  }
  if (!STATE_REGEX.test(normalized)) {
    throw new Error('state must be a 2-letter code.');
  }
  return normalized;
}

function validateOptionalZip(value) {
  if (value === undefined || value === null) {
    return null;
  }
  const normalized = String(value).trim();
  if (!normalized) {
    return null;
  }
  if (!ZIP_REGEX.test(normalized)) {
    throw new Error('zip must be exactly 5 digits.');
  }
  return normalized;
}

function validateOptionalEmail(value, label = 'email', maxLength = 255) {
  const email = validateOptionalString(value, label, maxLength);
  if (!email) {
    return null;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.toLowerCase())) {
    throw new Error(`${label} must be a valid email address.`);
  }
  return email.toLowerCase();
}

async function fetchIndividualById(individualId, client = pool) {
  const sql = `
    SELECT individual_id, individual_first_name, individual_last_name, address, city, state, zip, email, created_at, updated_at
    FROM in_kind_tracker.individual
    WHERE individual_id = $1
    LIMIT 1
  `;
  const { rows } = await client.query(sql, [individualId]);
  return rows.length ? normalizeIndividualRow(rows[0]) : null;
}

router.post(
  '/import',
  express.text({ type: ['text/csv', 'text/plain', 'application/vnd.ms-excel'], limit: '2mb' }),
  async (req, res) => {
    try {
      const csvText = typeof req.body === 'string' ? req.body : '';
      if (!csvText.trim()) {
        return res.status(400).json({ error: 'CSV body is required.' });
      }

      const rows = parseCsvText(csvText);
      if (rows.length === 0) {
        return res.status(400).json({ error: 'CSV file appears to be empty.' });
      }

      const headers = rows[0].map((header) => String(header || '').trim().toLowerCase());
      const findHeaderIndex = (aliases) => {
        for (const alias of aliases) {
          const idx = headers.indexOf(alias);
          if (idx !== -1) return idx;
        }
        return -1;
      };

      const firstIdx = findHeaderIndex(['individual_first_name', 'first_name']);
      const lastIdx = findHeaderIndex(['individual_last_name', 'last_name']);
      const addressIdx = findHeaderIndex(['address']);
      const cityIdx = findHeaderIndex(['city']);
      const stateIdx = findHeaderIndex(['state']);
      const zipIdx = findHeaderIndex(['zip']);
      const emailIdx = findHeaderIndex(['email']);

      if (firstIdx === -1 || lastIdx === -1) {
        return res.status(400).json({
          error: 'CSV must include headers for individual_first_name and individual_last_name.',
        });
      }

      const { rows: emailRows } = await pool.query(
        'SELECT LOWER(email) AS email FROM in_kind_tracker.individual WHERE email IS NOT NULL',
      );
      const existingEmails = new Set(emailRows.map((row) => row.email));
      const seenEmails = new Set();

      const summary = {
        created: 0,
        skipped: { email: 0, blank: 0 },
        errors: [],
        total: Math.max(rows.length - 1, 0),
      };

      const insertSql = `
        INSERT INTO in_kind_tracker.individual
          (individual_first_name, individual_last_name, address, city, state, zip, email)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING individual_id
      `;

      for (let i = 1; i < rows.length; i += 1) {
        const rawRow = rows[i] || [];
        const trimmedRow = rawRow.map((value) => String(value ?? '').trim());
        if (trimmedRow.every((value) => value === '')) {
          summary.skipped.blank += 1;
          continue;
        }

        const getValue = (idx) => (idx >= 0 ? trimmedRow[idx] : undefined);

        try {
          const firstName = validateName(getValue(firstIdx), 'individual_first_name');
          const lastName = validateName(getValue(lastIdx), 'individual_last_name');
          const validatedAddress = validateOptionalString(getValue(addressIdx), 'address', 255);
          const validatedCity = validateOptionalString(getValue(cityIdx), 'city', 120);
          const validatedState = validateOptionalState(getValue(stateIdx));
          const validatedZip = validateOptionalZip(getValue(zipIdx));
          const validatedEmail = validateOptionalEmail(getValue(emailIdx));

          if (validatedEmail) {
            if (existingEmails.has(validatedEmail) || seenEmails.has(validatedEmail)) {
              summary.skipped.email += 1;
              continue;
            }
          }

          const params = [
            firstName,
            lastName,
            validatedAddress,
            validatedCity,
            validatedState,
            validatedZip,
            validatedEmail,
          ];

          const { rows: inserted } = await pool.query(insertSql, params);
          if (inserted.length === 0) {
            continue;
          }

          summary.created += 1;
          if (validatedEmail) {
            seenEmails.add(validatedEmail);
          }
        } catch (err) {
          if (summary.errors.length < 20) {
            summary.errors.push({ row: i + 1, error: err?.message || String(err) });
          }
        }
      }

      return res.status(201).json(summary);
    } catch (err) {
      console.error('Error importing individuals:', err);
      return res.status(500).json({ error: 'Internal server error, ' + (err?.message || err) });
    }
  },
);

router.get('/', async (_req, res) => {
  try {
    const sql = `
      SELECT individual_id, individual_first_name, individual_last_name, address, city, state, zip, email, created_at, updated_at
      FROM in_kind_tracker.individual
      ORDER BY individual_last_name ASC, individual_first_name ASC
    `;
    const { rows } = await pool.query(sql);
    return res.json(rows.map(normalizeIndividualRow));
  } catch (err) {
    console.error('Error listing individuals:', err);
    return res.status(500).json({ error: 'Internal server error, ' + (err?.message || err) });
  }
});

router.get('/:individual_id', async (req, res) => {
  try {
    const individualId = validateId(req.params.individual_id);
    const individual = await fetchIndividualById(individualId);
    if (!individual) {
      return res.status(404).json({ error: 'Individual not found' });
    }
    return res.json(individual);
  } catch (err) {
    console.error('Error fetching individual:', err);
    if (err?.message?.includes('individual_id')) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Internal server error, ' + (err?.message || err) });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      individual_first_name,
      individual_last_name,
      address,
      city,
      state,
      zip,
      email,
    } = req.body || {};

    const firstName = validateName(individual_first_name, 'individual_first_name');
    const lastName = validateName(individual_last_name, 'individual_last_name');
    const validatedAddress = validateOptionalString(address, 'address', 255);
    const validatedCity = validateOptionalString(city, 'city', 120);
    const validatedState = validateOptionalState(state);
    const validatedZip = validateOptionalZip(zip);
    const validatedEmail = validateOptionalEmail(email);

    const sql = `
      INSERT INTO in_kind_tracker.individual
        (individual_first_name, individual_last_name, address, city, state, zip, email)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING individual_id
    `;
    const params = [firstName, lastName, validatedAddress, validatedCity, validatedState, validatedZip, validatedEmail];
    const { rows } = await pool.query(sql, params);
    const created = await fetchIndividualById(rows[0].individual_id);
    return res.status(201).json(created ?? normalizeIndividualRow(rows[0]));
  } catch (err) {
    console.error('Error creating individual:', err);
    if (err?.message) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Internal server error, ' + (err?.message || err) });
  }
});

router.patch('/:individual_id', async (req, res) => {
  try {
    const individualId = validateId(req.params.individual_id);
    const payload = req.body || {};

    const updates = [];
    const values = [];

    if (payload.individual_first_name !== undefined) {
      const v = validateName(payload.individual_first_name, 'individual_first_name');
      updates.push(`individual_first_name = $${updates.length + 1}`);
      values.push(v);
    }

    if (payload.individual_last_name !== undefined) {
      const v = validateName(payload.individual_last_name, 'individual_last_name');
      updates.push(`individual_last_name = $${updates.length + 1}`);
      values.push(v);
    }

    if (payload.address !== undefined) {
      const v = validateOptionalString(payload.address, 'address', 255);
      updates.push(`address = $${updates.length + 1}`);
      values.push(v);
    }

    if (payload.city !== undefined) {
      const v = validateOptionalString(payload.city, 'city', 120);
      updates.push(`city = $${updates.length + 1}`);
      values.push(v);
    }

    if (payload.state !== undefined) {
      const v = validateOptionalState(payload.state);
      updates.push(`state = $${updates.length + 1}`);
      values.push(v);
    }

    if (payload.zip !== undefined) {
      const v = validateOptionalZip(payload.zip);
      updates.push(`zip = $${updates.length + 1}`);
      values.push(v);
    }

    if (payload.email !== undefined) {
      const v = validateOptionalEmail(payload.email);
      updates.push(`email = $${updates.length + 1}`);
      values.push(v);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updatable fields provided.' });
    }

    updates.push(`updated_at = NOW()`);
    const sql = `
      UPDATE in_kind_tracker.individual
      SET ${updates.join(', ')}
      WHERE individual_id = $${values.length + 1}
      RETURNING individual_id
    `;
    values.push(individualId);

    const { rows } = await pool.query(sql, values);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Individual not found' });
    }

    const updated = await fetchIndividualById(individualId);
    return res.json(updated ?? normalizeIndividualRow(rows[0]));
  } catch (err) {
    console.error('Error updating individual:', err);
    if (err?.message) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Internal server error, ' + (err?.message || err) });
  }
});

router.delete('/:individual_id', async (req, res) => {
  try {
    const individualId = validateId(req.params.individual_id);
    const sql = `
      DELETE FROM in_kind_tracker.individual
      WHERE individual_id = $1
      RETURNING individual_id
    `;
    const { rows } = await pool.query(sql, [individualId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Individual not found' });
    }
    return res.status(204).send();
  } catch (err) {
    console.error('Error deleting individual:', err);
    if (err?.message) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Internal server error, ' + (err?.message || err) });
  }
});

export { router };
