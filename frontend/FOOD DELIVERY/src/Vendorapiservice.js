// vendorApiService.js - Vendor/Business Owner API Service

import authService from './Authservice';

class VendorApiService {
  constructor() {
    // NOTE: must match your Django URL conf — check your main urls.py
    // If cart uses /api/v1/carts and restaurant uses /api/v1/restaurants,
    // vendor should also be /api/v1/vendor  (change if your urls.py differs)
    this.API_BASE_URL = 'http://127.0.0.1:8000/api/vendor';
  }

  // ─── Get a valid token, refreshing if needed ──────────────────────────────
  async _getValidToken() {
    let token = authService.getAccessToken();
    if (!token) {
      try { token = await authService.refreshAccessToken(); }
      catch { throw new Error('Not authenticated. Please log in again.'); }
    }
    return token;
  }

  // ─── Authenticated JSON fetch with auto-refresh and FULL error body ───────
  async _jsonFetch(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${this.API_BASE_URL}${endpoint}`;
    let token = await this._getValidToken();

    const attempt = (t) => fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${t}`,
        'Content-Type': 'application/json',
      },
    });

    let res = await attempt(token);

    if (res.status === 401) {
      try { token = await authService.refreshAccessToken(); res = await attempt(token); }
      catch { throw new Error('Session expired. Please log in again.'); }
    }

    // Return null for 204 No Content (DELETE success)
    if (res.status === 204) return null;

    const text = await res.text();

    if (!res.ok) {
      // Try to extract a meaningful message from the backend response body
      let detail = `HTTP ${res.status}`;
      try {
        const json = JSON.parse(text);
        detail = json.detail || json.message || json.error
          || Object.entries(json).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ')
          || detail;
      } catch { detail = text.slice(0, 200) || detail; }
      throw new Error(detail);
    }

    if (!text) return null;
    try { return JSON.parse(text); } catch { return null; }
  }

  // ─── Authenticated FormData fetch (for image uploads) ────────────────────
  async _formDataFetch(url, method, formData) {
    let token = await this._getValidToken();

    const attempt = (t) => fetch(url, {
      method,
      headers: { 'Authorization': `Bearer ${t}` },
      body: formData,
    });

    let res = await attempt(token);

    if (res.status === 401) {
      try { token = await authService.refreshAccessToken(); res = await attempt(token); }
      catch { throw new Error('Session expired. Please log in again.'); }
    }

    if (res.status === 204) return null;

    const text = await res.text();

    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        const json = JSON.parse(text);
        detail = json.detail || json.message || json.error
          || Object.entries(json).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ')
          || detail;
      } catch { detail = text.slice(0, 200) || detail; }
      throw new Error(detail);
    }

    if (!text) return null;
    try { return JSON.parse(text); } catch { return null; }
  }

  // ─── DISCOUNTS ────────────────────────────────────────────────────────────
  async getDiscounts() {
    return this._jsonFetch('/discounts/');
  }

  async addDiscount(data) {
    return this._jsonFetch('/discounts/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateDiscount(id, data) {
    return this._jsonFetch(`/discounts/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteDiscount(id) {
    return this._jsonFetch(`/discounts/${id}/`, { method: 'DELETE' });
  }

  // ─── CATEGORIES ───────────────────────────────────────────────────────────
  async getCategories() {
    return this._jsonFetch('/categories/');
  }

  async addCategory(data) {
    return this._jsonFetch('/categories/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCategory(id, data) {
    return this._jsonFetch(`/categories/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCategory(id) {
    return this._jsonFetch(`/categories/${id}/`, { method: 'DELETE' });
  }

  // ─── MENU ITEMS ───────────────────────────────────────────────────────────
  async getItems() {
    return this._jsonFetch('/items/');
  }

  async addItem(itemData) {
    const formData = new FormData();
    Object.entries(itemData).forEach(([k, v]) => {
      if (v !== null && v !== undefined) formData.append(k, v);
    });
    return this._formDataFetch(`${this.API_BASE_URL}/items/`, 'POST', formData);
  }

  async updateItem(itemId, itemData) {
    const formData = new FormData();
    Object.entries(itemData).forEach(([k, v]) => {
      if (v !== null && v !== undefined) formData.append(k, v);
    });
    return this._formDataFetch(`${this.API_BASE_URL}/items/${itemId}/`, 'PUT', formData);
  }

  async deleteItem(id) {
    return this._jsonFetch(`/items/${id}/`, { method: 'DELETE' });
  }

  async toggleItemAvailability(id, isAvailable) {
    return this._jsonFetch(`/items/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify({ is_available: isAvailable ? 1 : 0 }),
    });
  }
}

const vendorApiService = new VendorApiService();
export default vendorApiService;