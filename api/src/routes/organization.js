import express from 'express';
import { pool } from '../db.js';

const router = express.Router();

router.use(express.json());

const ZIP_REGEX = /^\d{5}$/;

function normalizeOrganizationRow(row) {
  if (!row) return row;
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
    created_at,
    updated_at,
  } = row;
  return {
    organization_code,
    organization_name,
    contact_first_name: contact_first_name ?? null,
    contact_last_name: contact_last_name ?? null,
    address: address ?? null,
    city: city ?? null,
    state: state ?? null,
    zip: zip ?? null,
    contact_email: contact_email ?? null,
    created_at: created_at ?? null,
    updated_at: updated_at ?? null,
  };
}

function validateOrganizationCode(code) {
  if (code === undefined || code === null) {
    throw new Error('organization_code is required.');
  }
  const normalized = String(code).trim().toUpperCase();
  if (!/^[A-Z0-9_-]{2,50}$/.test(normalized)) {
    throw new Error('organization_code must be 2-50 characters using letters, numbers, hyphens, or underscores.');
  }
  return normalized;
}

function validateOrganizationName(name) {
  if (name === undefined || name === null) {
    throw new Error('organization_name is required.');
  }
  const normalized = String(name).trim();
  if (!normalized) {
    throw new Error('organization_name is required.');
  }
  if (normalized.length > 255) {
    throw new Error('organization_name must be 255 characters or fewer.');
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

function validateOptionalEmail(value, label = 'contact_email', maxLength = 255) {
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

async function fetchOrganizationByCode(code, client = pool) {
  const sql = `
    SELECT organization_code, organization_name, contact_first_name, contact_last_name, address, city, state, zip, contact_email, created_at, updated_at
    FROM in_kind_tracker.organization
    WHERE organization_code = $1
    LIMIT 1
  `;
  const { rows } = await client.query(sql, [code]);
  return rows.length ? normalizeOrganizationRow(rows[0]) : null;
}

router.get('/', async (_req, res) => {
  try {
    const sql = `
      SELECT organization_code, organization_name, contact_first_name, contact_last_name, address, city, state, zip, contact_email, created_at, updated_at
      FROM in_kind_tracker.organization
      ORDER BY organization_name ASC
    `;
    const { rows } = await pool.query(sql);
    return res.json(rows.map(normalizeOrganizationRow));
  } catch (err) {
    console.error('Error listing organizations:', err);
    return res.status(500).json({ error: 'Internal server error, ' + (err?.message || err) });
  }
});

router.get('/:organization_code', async (req, res) => {
  try {
    const organizationCode = validateOrganizationCode(req.params.organization_code);
    const organization = await fetchOrganizationByCode(organizationCode);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    return res.json(organization);
  } catch (err) {
    console.error('Error fetching organization:', err);
    if (err?.message?.includes('organization_code')) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Internal server error, ' + (err?.message || err) });
  }
});

router.post('/', async (req, res) => {
  try {
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
    } = req.body || {};

    const code = validateOrganizationCode(organization_code);
    const name = validateOrganizationName(organization_name);
    const validatedContactFirst = validateOptionalString(contact_first_name, 'contact_first_name', 100);
    const validatedContactLast = validateOptionalString(contact_last_name, 'contact_last_name', 100);
    const validatedAddress = validateOptionalString(address, 'address', 255);
    const validatedCity = validateOptionalString(city, 'city', 120);
    const validatedState = validateOptionalString(state, 'state', 50);
    const validatedZip = validateOptionalZip(zip);
    const validatedEmail = validateOptionalEmail(contact_email);

    const sql = `
      INSERT INTO in_kind_tracker.organization
        (organization_code, organization_name, contact_first_name, contact_last_name, address, city, state, zip, contact_email)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING organization_code
    `;
    const params = [
      code,
      name,
      validatedContactFirst,
      validatedContactLast,
      validatedAddress,
      validatedCity,
      validatedState,
      validatedZip,
      validatedEmail,
    ];
    const { rows } = await pool.query(sql, params);
    const created = await fetchOrganizationByCode(rows[0].organization_code);
    return res.status(201).json(created ?? normalizeOrganizationRow(rows[0]));
  } catch (err) {
    console.error('Error creating organization:', err);
    if (err?.code === '23505') {
      return res.status(409).json({ error: 'An organization with that code already exists.' });
    }
    if (err?.message) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Internal server error, ' + (err?.message || err) });
  }
});

router.patch('/:organization_code', async (req, res) => {
  try {
    const organizationCode = validateOrganizationCode(req.params.organization_code);
    const payload = req.body || {};

    const updates = [];
    const values = [];

    if (payload.organization_name !== undefined) {
      const name = validateOrganizationName(payload.organization_name);
      updates.push(`organization_name = $${updates.length + 1}`);
      values.push(name);
    }

    if (payload.contact_first_name !== undefined) {
      const v = validateOptionalString(payload.contact_first_name, 'contact_first_name', 100);
      updates.push(`contact_first_name = $${updates.length + 1}`);
      values.push(v);
    }

    if (payload.contact_last_name !== undefined) {
      const v = validateOptionalString(payload.contact_last_name, 'contact_last_name', 100);
      updates.push(`contact_last_name = $${updates.length + 1}`);
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
      const v = validateOptionalString(payload.state, 'state', 50);
      updates.push(`state = $${updates.length + 1}`);
      values.push(v);
    }

    if (payload.zip !== undefined) {
      const v = validateOptionalZip(payload.zip);
      updates.push(`zip = $${updates.length + 1}`);
      values.push(v);
    }

    if (payload.contact_email !== undefined) {
      const v = validateOptionalEmail(payload.contact_email);
      updates.push(`contact_email = $${updates.length + 1}`);
      values.push(v);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updatable fields provided.' });
    }

    updates.push(`updated_at = NOW()`);
    const sql = `
      UPDATE in_kind_tracker.organization
      SET ${updates.join(', ')}
      WHERE organization_code = $${values.length + 1}
      RETURNING organization_code
    `;
    values.push(organizationCode);

    const { rows } = await pool.query(sql, values);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const updated = await fetchOrganizationByCode(organizationCode);
    return res.json(updated ?? normalizeOrganizationRow(rows[0]));
  } catch (err) {
    console.error('Error updating organization:', err);
    if (err?.code === '23505') {
      return res.status(409).json({ error: 'An organization with that code already exists.' });
    }
    if (err?.message) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Internal server error, ' + (err?.message || err) });
  }
});

router.delete('/:organization_code', async (req, res) => {
  try {
    const organizationCode = validateOrganizationCode(req.params.organization_code);
    const sql = `
      DELETE FROM in_kind_tracker.organization
      WHERE organization_code = $1
      RETURNING organization_code
    `;
    const { rows } = await pool.query(sql, [organizationCode]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    return res.status(204).send();
  } catch (err) {
    console.error('Error deleting organization:', err);
    if (err?.message) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Internal server error, ' + (err?.message || err) });
  }
});

export { router };
