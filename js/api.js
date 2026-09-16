/**
 * Cliente HTTP Central / Camada de Integração de APIs
 * Conecta o Portal Pastoral MESC com o Backend (padrão: http://localhost:8000)
 */

class ApiClient {
  constructor() {
    this.tokenKey = 'mesc_portal_auth_token';
  }

  getBaseUrl() {
    const rawUrl = (typeof window !== 'undefined' && window.__API_URL__) 
      ? window.__API_URL__ 
      : 'http://localhost:8000';
    return rawUrl.replace(/\/+$/, '');
  }

  getToken() {
    try {
      return localStorage.getItem(this.tokenKey) || null;
    } catch (e) {
      return null;
    }
  }

  setToken(token) {
    try {
      if (token) {
        localStorage.setItem(this.tokenKey, token);
      } else {
        localStorage.removeItem(this.tokenKey);
      }
    } catch (e) {
      console.warn('Erro ao salvar token de autenticação:', e);
    }
  }

  async request(endpoint, options = {}) {
    const baseUrl = this.getBaseUrl();
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${baseUrl}${cleanEndpoint}`;

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers || {})
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers
    };

    if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);

      // Tratamento para 204 No Content
      if (response.status === 204) {
        return null;
      }

      const contentType = response.headers.get('content-type') || '';
      let data = null;
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
      }

      if (!response.ok) {
        const errorMessage = (data && (data.message || data.error)) || `Erro na requisição HTTP: ${response.status} ${response.statusText}`;
        const error = new Error(errorMessage);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (error) {
      console.error(`[API Error] ${options.method || 'GET'} ${cleanEndpoint}:`, error);
      throw error;
    }
  }

  // ==========================================
  // AUTENTICAÇÃO & SESSÕES
  // ==========================================
  auth = {
    login: async (credentials) => {
      try {
        const res = await this.request('/api/sessions', {
          method: 'POST',
          body: credentials
        }).catch(async (err) => {
          if (err.status === 404) {
            return await this.request('/api/auth/login', {
              method: 'POST',
              body: credentials
            });
          }
          throw err;
        });

        if (res && res.token) {
          this.setToken(res.token);
        }
        return res;
      } catch (err) {
        throw err;
      }
    },

    getProfile: async () => {
      return await this.request('/api/users/profile', { method: 'GET' });
    },

    logout: () => {
      this.setToken(null);
    }
  };

  // ==========================================
  // IGREJAS / COMUNIDADES
  // ==========================================
  churches = {
    list: async () => {
      return await this.request('/api/churches', { method: 'GET' });
    },

    getById: async (id) => {
      return await this.request(`/api/churches/${id}`, { method: 'GET' });
    },

    create: async (data) => {
      return await this.request('/api/churches', {
        method: 'POST',
        body: data
      });
    },

    update: async (id, data) => {
      return await this.request(`/api/churches/${id}`, {
        method: 'PUT',
        body: data
      });
    }
  };

  // ==========================================
  // MEMBROS / MINISTROS
  // ==========================================
  members = {
    list: async (filters = {}) => {
      const query = new URLSearchParams();
      if (filters.church_id) query.append('church_id', filters.church_id);
      if (filters.status && filters.status !== 'todos') query.append('status', filters.status);
      if (filters.search) query.append('search', filters.search);
      if (filters.profile) query.append('profile', filters.profile);

      const qs = query.toString();
      const endpoint = qs ? `/api/members?${qs}` : '/api/members';
      return await this.request(endpoint, { method: 'GET' });
    },

    getById: async (id) => {
      return await this.request(`/api/members/${id}`, { method: 'GET' });
    },

    create: async (data) => {
      return await this.request('/api/members', {
        method: 'POST',
        body: data
      });
    },

    update: async (id, data) => {
      return await this.request(`/api/members/${id}`, {
        method: 'PUT',
        body: data
      });
    },

    delete: async (id) => {
      return await this.request(`/api/members/${id}`, {
        method: 'DELETE'
      });
    }
  };

  // ==========================================
  // CELEBRAÇÕES LITÚRGICAS & CATEGORIAS
  // ==========================================
  celebrations = {
    list: async () => {
      return await this.request('/api/celebrations', { method: 'GET' });
    },

    getById: async (id) => {
      return await this.request(`/api/celebrations/${id}`, { method: 'GET' });
    },

    create: async (data) => {
      return await this.request('/api/celebrations', {
        method: 'POST',
        body: data
      });
    },

    update: async (id, data) => {
      return await this.request(`/api/celebrations/${id}`, {
        method: 'PUT',
        body: data
      });
    },

    delete: async (id) => {
      return await this.request(`/api/celebrations/${id}`, {
        method: 'DELETE'
      });
    },

    categories: async () => {
      try {
        return await this.request('/api/categories', { method: 'GET' });
      } catch (err) {
        if (err.status === 404) {
          return await this.request('/api/celebrations/categories', { method: 'GET' });
        }
        throw err;
      }
    }
  };

  // ==========================================
  // EVENTOS LITÚRGICOS / ESCALAS
  // ==========================================
  events = {
    list: async (filters = {}) => {
      const query = new URLSearchParams();
      if (filters.church_id) query.append('church_id', filters.church_id);
      if (filters.month) query.append('month', filters.month);
      if (filters.year) query.append('year', filters.year);
      if (filters.date) query.append('date', filters.date);

      const qs = query.toString();
      const endpoint = qs ? `/api/events?${qs}` : '/api/events';
      return await this.request(endpoint, { method: 'GET' });
    },

    getById: async (id) => {
      return await this.request(`/api/events/${id}`, { method: 'GET' });
    },

    create: async (data) => {
      return await this.request('/api/events', {
        method: 'POST',
        body: data
      });
    },

    update: async (id, data) => {
      return await this.request(`/api/events/${id}`, {
        method: 'PUT',
        body: data
      });
    },

    delete: async (id) => {
      return await this.request(`/api/events/${id}`, {
        method: 'DELETE'
      });
    }
  };

  // ==========================================
  // GESTÃO DE USUÁRIOS DO SISTEMA
  // ==========================================
  users = {
    list: async (filters = {}) => {
      const query = new URLSearchParams();
      if (filters.role && filters.role !== 'todos') query.append('role', filters.role);
      if (filters.status && filters.status !== 'todos') query.append('status', filters.status);
      if (filters.search) query.append('search', filters.search);

      const qs = query.toString();
      const endpoint = qs ? `/api/users?${qs}` : '/api/users';
      return await this.request(endpoint, { method: 'GET' });
    },

    getById: async (id) => {
      return await this.request(`/api/users/${id}`, { method: 'GET' });
    },

    create: async (data) => {
      return await this.request('/api/users', {
        method: 'POST',
        body: data
      });
    },

    update: async (id, data) => {
      return await this.request(`/api/users/${id}`, {
        method: 'PUT',
        body: data
      });
    },

    toggleStatus: async (id, currentStatus) => {
      const nextStatus = currentStatus === 'ativo' ? 'inativo' : 'ativo';
      try {
        return await this.request(`/api/users/${id}/status`, {
          method: 'PATCH',
          body: { status: nextStatus }
        });
      } catch (err) {
        return await this.request(`/api/users/${id}`, {
          method: 'PUT',
          body: { status: nextStatus }
        });
      }
    },

    delete: async (id) => {
      return await this.request(`/api/users/${id}`, {
        method: 'DELETE'
      });
    }
  };
}

// Instância global do cliente de API
window.api = new ApiClient();
window.apiClient = window.api;
