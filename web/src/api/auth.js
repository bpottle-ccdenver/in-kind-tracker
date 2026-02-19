import { apiUrl } from './config';

class AuthAPI {
  async me() {
    const response = await fetch(apiUrl('/auth/me'), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'include',
    });

    if (response.status === 401) {
      return null;
    }

    if (!response.ok) {
      const message = await response.text().catch(() => '');
      throw new Error(`Failed to fetch current user: ${response.status} ${message}`);
    }

    return response.json();
  }

  async login(userId) {
    if (!userId) {
      throw new Error('login requires a user id');
    }

    const response = await fetch(apiUrl('/auth/login'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ user_id: Number(userId) }),
      credentials: 'include',
    });

    if (!response.ok) {
      const message = await response.text().catch(() => '');
      throw new Error(`Failed to login: ${response.status} ${message}`);
    }

    return response.json();
  }

  async logout() {
    const response = await fetch(apiUrl('/auth/logout'), {
      method: 'POST',
      headers: { Accept: 'application/json' },
      credentials: 'include',
    });

    if (!response.ok && response.status !== 204) {
      const message = await response.text().catch(() => '');
      throw new Error(`Failed to logout: ${response.status} ${message}`);
    }
  }

  async listUsersForLogin(statuses = ['active']) {
    let query = '';
    if (Array.isArray(statuses)) {
      const params = new URLSearchParams();
      statuses
        .map((status) => String(status).trim())
        .filter((status) => status.length > 0)
        .forEach((status) => params.append('status', status));
      const serialized = params.toString();
      if (serialized) {
        query = `?${serialized}`;
      }
    }

    const response = await fetch(apiUrl(`/auth/users${query}`), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'include',
    });

    if (!response.ok) {
      const message = await response.text().catch(() => '');
      throw new Error(`Failed to fetch users: ${response.status} ${message}`);
    }

    return response.json();
  }
}

export default new AuthAPI();
