import express from 'express';
import { pool } from '../db.js';
import { getUserPermissions } from '../middleware/authorization.js';

const router = express.Router();

router.use(express.json());

const ALLOWED_GL_CODES = [
  '7601', // Food
  '7604', // Transportation
  '7606', // Personal Needs
  '7607', // General
  '7101', // Rent/Space
  '7301', // Client Meals
  '7404', // Contracted Outside Services
  '7380', // Supplies
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function findHeaderIndex(headers, aliases) {
  for (const alias of aliases) {
    const normalized = normalizeHeader(alias);
    const idx = headers.indexOf(normalized);
    if (idx !== -1) return idx;
  }
  return -1;
}

function parseMoney(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const match = raw.match(/-?\d{1,3}(?:,\d{3})*(?:\.\d+)?|-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const normalized = match[0].replace(/,/g, '');
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

function normalizeOptionalEmail(value) {
  const trimmed = String(value ?? '').trim().toLowerCase();
  if (!trimmed) return null;
  return EMAIL_REGEX.test(trimmed) ? trimmed : null;
}

function normalizeOptionalZip(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return null;
  return /^\d{5}$/.test(trimmed) ? trimmed : null;
}

function makeOrganizationCode(name, usedCodes) {
  const raw = String(name || '').trim();
  let base = raw.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  if (!base) base = 'ORG';
  if (base.length > 46) {
    base = base.slice(0, 46);
  }
  let candidate = base;
  let suffix = 1;
  while (usedCodes.has(candidate)) {
    const suffixStr = `_${suffix}`;
    candidate = `${base.slice(0, 50 - suffixStr.length)}${suffixStr}`;
    suffix += 1;
  }
  return candidate;
}

function normalizeDonationRow(row) {
  if (!row) return row;
  const {
    donation_id,
    date_received,
    gl_acct,
    quantity,
    amount,
    description,
    ministry_code,
    organization_code,
    individual_id,
    user_id,
    created_at,
    updated_at,
  } = row;

  const qty = quantity === null || quantity === undefined ? null : Number(quantity);
  const amt = amount === null || amount === undefined ? null : Number(amount);
  const total = qty != null && amt != null ? qty * amt : null;

  return {
    donation_id,
    date_received,
    gl_acct,
    quantity: qty,
    amount: amt,
    total_fair_market_value: total,
    description: description ?? null,
    ministry_code: ministry_code ?? null,
    organization_code: organization_code ?? null,
    individual_id: individual_id ?? null,
    user_id: user_id ?? null,
    created_at: created_at ?? null,
    updated_at: updated_at ?? null,
  };
}

function validateGlAcct(glAcct) {
  if (!glAcct && glAcct !== 0) {
    throw new Error('gl_acct is required.');
  }
  const normalized = String(glAcct).trim();
  if (!/^\d{4}$/.test(normalized)) {
    throw new Error('gl_acct must be exactly 4 digits.');
  }
  if (!ALLOWED_GL_CODES.includes(normalized)) {
    throw new Error('gl_acct must be one of the allowed GL codes.');
  }
  return normalized;
}

function validateDate(value) {
  if (!value) {
    throw new Error('date_received is required.');
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('date_received must be a valid date.');
  }
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

function validateQuantity(value) {
  if (value === undefined || value === null) {
    throw new Error('quantity is required.');
  }
  const num = Number(value);
  if (!Number.isFinite(num)) {
    throw new Error('quantity must be a number.');
  }
  return num;
}

function validateAmount(value) {
  if (value === undefined || value === null) {
    throw new Error('amount is required.');
  }
  const num = Number(value);
  if (!Number.isFinite(num)) {
    throw new Error('amount must be a valid number.');
  }
  return Number(num.toFixed(2));
}

function validateOptionalString(value, label, maxLength = 500) {
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

function validateOptionalCode(value, label, maxLength = 50) {
  if (value === undefined || value === null) {
    return null;
  }
  const normalized = String(value).trim().toUpperCase();
  if (!normalized) {
    return null;
  }
  if (normalized.length > maxLength) {
    throw new Error(`${label} must be ${maxLength} characters or fewer.`);
  }
  return normalized;
}

function validateOptionalId(value, label) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }
  return numeric;
}

async function fetchDonationById(id, client = pool) {
  const sql = `
    SELECT donation_id, date_received, gl_acct, quantity, amount, description, ministry_code, organization_code, individual_id, user_id, created_at, updated_at
    FROM in_kind_tracker.donation
    WHERE donation_id = $1
    LIMIT 1
  `;
  const { rows } = await client.query(sql, [id]);
  return rows.length ? normalizeDonationRow(rows[0]) : null;
}

router.post(
  '/import',
  express.text({ type: ['text/csv', 'text/plain', 'application/vnd.ms-excel'], limit: '5mb' }),
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

      const headerRow = rows[0];
      const headers = headerRow.map((h) => normalizeHeader(h));
      const headerCount = headers.length;

      const idxDate = findHeaderIndex(headers, ['date']);
      const idxCategory = findHeaderIndex(headers, ['category']);
      const idxGlAcct = findHeaderIndex(headers, ['glacct', 'glacct#', 'glacctnum', 'glacctnumber']);
      const idxQty = findHeaderIndex(headers, ['qty', 'quantity']);
      const idxPounds = findHeaderIndex(headers, ['pounds']);
      const idxAnonymous = findHeaderIndex(headers, ['anonymousyfores', 'anonymous']);
      const idxOrgName = findHeaderIndex(headers, ['orgname', 'organization', 'organizationname']);
      const idxFirst = findHeaderIndex(headers, ['firstname', 'first']);
      const idxLast = findHeaderIndex(headers, ['lastname', 'last']);
      const idxAddress = findHeaderIndex(headers, ['address']);
      const idxCity = findHeaderIndex(headers, ['city']);
      const idxState = findHeaderIndex(headers, ['state']);
      const idxZip = findHeaderIndex(headers, ['zip']);
      const idxEmail = findHeaderIndex(headers, ['email']);
      const idxDescription = findHeaderIndex(headers, ['description']);
      const idxTotal = findHeaderIndex(headers, ['totalfairmarket', 'totalfairmarketvalue', 'total']);

      if (idxDate === -1 || (idxGlAcct === -1 && idxCategory === -1)) {
        return res.status(400).json({
          error: 'CSV must include Date and either GL Acct# or Category columns.',
        });
      }

      const { rows: orgRows } = await pool.query(
        'SELECT organization_code, organization_name FROM in_kind_tracker.organization',
      );
      const organizationsByName = new Map(
        orgRows.map((row) => [String(row.organization_name || '').trim().toLowerCase(), row.organization_code]),
      );
      const organizationCodes = new Set(orgRows.map((row) => row.organization_code));

      const { rows: individualRows } = await pool.query(
        `
          SELECT individual_id, individual_first_name, individual_last_name, address, city, state, zip, email
          FROM in_kind_tracker.individual
        `,
      );
      const individualsByEmail = new Map();
      const individualsByKey = new Map();
      for (const row of individualRows) {
        const email = String(row.email || '').trim().toLowerCase();
        if (email) {
          individualsByEmail.set(email, row.individual_id);
        }
        const key = [
          row.individual_first_name,
          row.individual_last_name,
          row.address,
          row.city,
          row.state,
          row.zip,
        ]
          .map((value) => String(value || '').trim().toLowerCase())
          .join('|');
        if (key.replace(/\|/g, '')) {
          individualsByKey.set(key, row.individual_id);
        }
      }

      const summary = {
        created: 0,
        skipped: { blank: 0 },
        errors: [],
        total: Math.max(rows.length - 1, 0),
      };

      for (let i = 1; i < rows.length; i += 1) {
        let rawRow = rows[i] || [];
        const trimmedRow = rawRow.map((value) => String(value ?? '').trim());
        if (trimmedRow.every((value) => value === '')) {
          summary.skipped.blank += 1;
          continue;
        }

        if (idxDescription !== -1 && idxTotal === headerCount - 1 && trimmedRow.length > headerCount) {
          const amountValue = trimmedRow[trimmedRow.length - 1];
          const left = trimmedRow.slice(0, idxDescription);
          const descriptionParts = trimmedRow.slice(idxDescription, trimmedRow.length - 1);
          rawRow = [...left, descriptionParts.join(','), amountValue];
        }

        const rowValues =
          rawRow.length >= headerCount
            ? rawRow
            : [...rawRow, ...new Array(headerCount - rawRow.length).fill('')];

        const getValue = (idx) => (idx >= 0 ? rowValues[idx] : undefined);

        try {
          const dateValue = getValue(idxDate);
          const normalizedDate = validateDate(dateValue);

          const glValue = getValue(idxGlAcct);
          const catValue = getValue(idxCategory);
          const glAcct = glValue || catValue;
          const normalizedGl = validateGlAcct(glAcct);

          const qtyValue = getValue(idxQty);
          const poundsValue = getValue(idxPounds);
          const qtyParsed = parseMoney(qtyValue) ?? parseMoney(poundsValue);
          const normalizedQty = validateQuantity(Number.isFinite(qtyParsed) ? qtyParsed : 1);

          const totalValue = getValue(idxTotal);
          const descriptionValue = getValue(idxDescription);
          const amountParsed = parseMoney(totalValue) ?? parseMoney(descriptionValue) ?? 0;
          const normalizedAmount = validateAmount(amountParsed);

          const description = validateOptionalString(descriptionValue, 'description', 1000);

          const anonymousFlag = String(getValue(idxAnonymous) || '')
            .trim()
            .toLowerCase();
          const isAnonymous = anonymousFlag === 'y' || anonymousFlag === 'yes';

          let organizationCode = null;
          let individualId = null;

          if (!isAnonymous) {
            const orgName = String(getValue(idxOrgName) || '').trim();
            const firstName = String(getValue(idxFirst) || '').trim();
            const lastName = String(getValue(idxLast) || '').trim();
            const address = String(getValue(idxAddress) || '').trim() || null;
            const city = String(getValue(idxCity) || '').trim() || null;
            const state = String(getValue(idxState) || '').trim().toUpperCase() || null;
            const zip = normalizeOptionalZip(getValue(idxZip));
            const email = normalizeOptionalEmail(getValue(idxEmail));

            if (orgName) {
              const nameKey = orgName.toLowerCase();
              organizationCode = organizationsByName.get(nameKey) || null;

              if (!organizationCode) {
                let code = makeOrganizationCode(orgName, organizationCodes);
                let created = false;
                let attempts = 0;
                while (!created && attempts < 5) {
                  try {
                    const insertSql = `
                      INSERT INTO in_kind_tracker.organization
                        (organization_code, organization_name, contact_first_name, contact_last_name, address, city, state, zip, contact_email)
                      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                      RETURNING organization_code
                    `;
                    const params = [
                      code,
                      orgName,
                      firstName || null,
                      lastName || null,
                      address,
                      city,
                      state || null,
                      zip,
                      email,
                    ];
                    const { rows: createdRows } = await pool.query(insertSql, params);
                    if (createdRows.length) {
                      organizationCode = createdRows[0].organization_code;
                      organizationsByName.set(nameKey, organizationCode);
                      organizationCodes.add(organizationCode);
                      created = true;
                    }
                  } catch (err) {
                    if (err?.code === '23505') {
                      organizationCodes.add(code);
                      code = makeOrganizationCode(orgName, organizationCodes);
                      attempts += 1;
                      continue;
                    }
                    throw err;
                  }
                }
              }
            } else if (firstName || lastName || email) {
              if (email && individualsByEmail.has(email)) {
                individualId = individualsByEmail.get(email);
              } else {
                const key = [firstName, lastName, address, city, state, zip]
                  .map((value) => String(value || '').trim().toLowerCase())
                  .join('|');
                if (key.replace(/\|/g, '') && individualsByKey.has(key)) {
                  individualId = individualsByKey.get(key);
                }
              }

              if (!individualId) {
                const insertSql = `
                  INSERT INTO in_kind_tracker.individual
                    (individual_first_name, individual_last_name, address, city, state, zip, email)
                  VALUES ($1, $2, $3, $4, $5, $6, $7)
                  RETURNING individual_id
                `;
                const params = [
                  firstName || 'Unknown',
                  lastName || 'Unknown',
                  address,
                  city,
                  state || null,
                  zip,
                  email,
                ];
                const { rows: createdRows } = await pool.query(insertSql, params);
                if (createdRows.length) {
                  individualId = createdRows[0].individual_id;
                  if (email) {
                    individualsByEmail.set(email, individualId);
                  }
                  const key = [firstName, lastName, address, city, state, zip]
                    .map((value) => String(value || '').trim().toLowerCase())
                    .join('|');
                  if (key.replace(/\|/g, '')) {
                    individualsByKey.set(key, individualId);
                  }
                }
              }
            }
          }

          const userId = req.user?.user_id ?? null;
          const donationSql = `
            INSERT INTO in_kind_tracker.donation
              (date_received, gl_acct, quantity, amount, description, ministry_code, organization_code, individual_id, user_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING donation_id
          `;
          const donationParams = [
            normalizedDate,
            normalizedGl,
            normalizedQty,
            normalizedAmount,
            description,
            null,
            organizationCode,
            individualId,
            userId,
          ];
          await pool.query(donationSql, donationParams);
          summary.created += 1;
        } catch (err) {
          if (summary.errors.length < 50) {
            summary.errors.push({ row: i + 1, error: err?.message || String(err) });
          }
        }
      }

      return res.status(201).json(summary);
    } catch (err) {
      console.error('Error importing donations:', err);
      return res.status(500).json({ error: 'Internal server error, ' + (err?.message || err) });
    }
  },
);

router.get('/', async (req, res) => {
  try {
    const { individual_id, organization_code } = req.query || {};
    const filters = [];
    const values = [];

    if (individual_id !== undefined) {
      const normInd = validateOptionalId(individual_id, 'individual_id');
      if (normInd !== null) {
        values.push(normInd);
        filters.push(`individual_id = $${values.length}`);
      }
    }

    if (organization_code !== undefined) {
      const normOrg = validateOptionalCode(organization_code, 'organization_code');
      if (normOrg !== null) {
        values.push(normOrg);
        filters.push(`organization_code = $${values.length}`);
      }
    }

    const sql = `
      SELECT donation_id, date_received, gl_acct, quantity, amount, description, ministry_code, organization_code, individual_id, user_id, created_at, updated_at
      FROM in_kind_tracker.donation
      ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
      ORDER BY date_received DESC, donation_id DESC
    `;
    const { rows } = await pool.query(sql, values);
    return res.json(rows.map(normalizeDonationRow));
  } catch (err) {
    console.error('Error listing donations:', err);
    return res.status(500).json({ error: 'Internal server error, ' + (err?.message || err) });
  }
});

router.get('/:donation_id', async (req, res) => {
  try {
    const id = Number(req.params.donation_id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'donation_id must be a positive integer.' });
    }
    const donation = await fetchDonationById(id);
    if (!donation) {
      return res.status(404).json({ error: 'Donation not found' });
    }
    return res.json(donation);
  } catch (err) {
    console.error('Error fetching donation:', err);
    return res.status(500).json({ error: 'Internal server error, ' + (err?.message || err) });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      date_received,
      gl_acct,
      quantity,
      amount,
      description,
      ministry_code,
      organization_code,
      individual_id,
    } = req.body || {};

    const normalizedDate = validateDate(date_received);
    const normalizedGl = validateGlAcct(gl_acct);
    const normalizedQty = validateQuantity(quantity);
    const normalizedAmount = validateAmount(amount);
    const normalizedDescription = validateOptionalString(description, 'description', 1000);
    const normMinistry = validateOptionalCode(ministry_code, 'ministry_code');
    const normOrg = validateOptionalCode(organization_code, 'organization_code');
    const normInd = validateOptionalId(individual_id, 'individual_id');

    const userId = req.user?.user_id ?? null;

    const sql = `
      INSERT INTO in_kind_tracker.donation
        (date_received, gl_acct, quantity, amount, description, ministry_code, organization_code, individual_id, user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING donation_id
    `;
    const params = [
      normalizedDate,
      normalizedGl,
      normalizedQty,
      normalizedAmount,
      normalizedDescription,
      normMinistry,
      normOrg,
      normInd,
      userId,
    ];
    const { rows } = await pool.query(sql, params);
    const created = await fetchDonationById(rows[0].donation_id);
    return res.status(201).json(created ?? normalizeDonationRow(rows[0]));
  } catch (err) {
    console.error('Error creating donation:', err);
    if (err?.code === '23503') {
      return res.status(400).json({ error: 'Referenced ministry, organization, individual, or user does not exist.' });
    }
    if (err?.message) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Internal server error, ' + (err?.message || err) });
  }
});

router.patch('/:donation_id', async (req, res) => {
  try {
    const id = Number(req.params.donation_id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'donation_id must be a positive integer.' });
    }

    const payload = req.body || {};
    const updates = [];
    const values = [];

    if (payload.date_received !== undefined) {
      const v = validateDate(payload.date_received);
      updates.push(`date_received = $${updates.length + 1}`);
      values.push(v);
    }

    if (payload.gl_acct !== undefined) {
      const v = validateGlAcct(payload.gl_acct);
      updates.push(`gl_acct = $${updates.length + 1}`);
      values.push(v);
    }

    if (payload.quantity !== undefined) {
      const v = validateQuantity(payload.quantity);
      updates.push(`quantity = $${updates.length + 1}`);
      values.push(v);
    }

    if (payload.amount !== undefined) {
      const v = validateAmount(payload.amount);
      updates.push(`amount = $${updates.length + 1}`);
      values.push(v);
    }

    if (payload.description !== undefined) {
      const v = validateOptionalString(payload.description, 'description', 1000);
      updates.push(`description = $${updates.length + 1}`);
      values.push(v);
    }

    if (payload.ministry_code !== undefined) {
      const v = validateOptionalCode(payload.ministry_code, 'ministry_code');
      updates.push(`ministry_code = $${updates.length + 1}`);
      values.push(v);
    }

    if (payload.organization_code !== undefined) {
      const v = validateOptionalCode(payload.organization_code, 'organization_code');
      updates.push(`organization_code = $${updates.length + 1}`);
      values.push(v);
    }

    if (payload.individual_id !== undefined) {
      const v = validateOptionalId(payload.individual_id, 'individual_id');
      updates.push(`individual_id = $${updates.length + 1}`);
      values.push(v);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updatable fields provided.' });
    }

    updates.push(`updated_at = NOW()`);
    const sql = `
      UPDATE in_kind_tracker.donation
      SET ${updates.join(', ')}
      WHERE donation_id = $${values.length + 1}
      RETURNING donation_id
    `;
    values.push(id);

    const { rows } = await pool.query(sql, values);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Donation not found' });
    }

    const updated = await fetchDonationById(id);
    return res.json(updated ?? normalizeDonationRow(rows[0]));
  } catch (err) {
    console.error('Error updating donation:', err);
    if (err?.code === '23503') {
      return res.status(400).json({ error: 'Referenced ministry, organization, or individual does not exist.' });
    }
    if (err?.message) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Internal server error, ' + (err?.message || err) });
  }
});

router.delete('/:donation_id', async (req, res) => {
  try {
    const id = Number(req.params.donation_id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'donation_id must be a positive integer.' });
    }
    const sql = `
      DELETE FROM in_kind_tracker.donation
      WHERE donation_id = $1
      RETURNING donation_id
    `;
    const { rows } = await pool.query(sql, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Donation not found' });
    }
    return res.status(204).send();
  } catch (err) {
    console.error('Error deleting donation:', err);
    if (err?.message) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Internal server error, ' + (err?.message || err) });
  }
});

export { router, ALLOWED_GL_CODES };
