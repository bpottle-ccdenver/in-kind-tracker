import { apiUrl } from './config';

function transformPermission(row) {
  if (!row || typeof row !== 'object') return row;
  const { permission_id, ...rest } = row;
  return { id: permission_id, permission_id, ...rest };
}

class PermissionAPI {
  async list() {
    const response = await fetch(apiUrl('/permission'), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`Failed to fetch permissions: ${response.status}`);
    const data = await response.json();
    return Array.isArray(data) ? data.map(transformPermission) : [];
  }
}

export default new PermissionAPI();
