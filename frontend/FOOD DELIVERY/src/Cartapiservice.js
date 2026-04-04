

import authService from './Authservice.js';

class CartApiService {
  constructor() {
    this.API_BASE_URL = 'http://127.0.0.1:8000/api/v1/carts';
    this.CART_KEY = 'foodpanda_cart';
  }


  saveLocalCart(cartItems) {
    try { localStorage.setItem(this.CART_KEY, JSON.stringify(cartItems)); return true; }
    catch (e) { console.error('Error saving local cart:', e); return false; }
  }

  loadLocalCart() {
    try {
      const s = localStorage.getItem(this.CART_KEY);
      return s ? JSON.parse(s) : [];
    } catch (e) { return []; }
  }

  clearLocalCart() {
    try { localStorage.removeItem(this.CART_KEY); return true; }
    catch (e) { return false; }
  }


  async _fetch(endpoint, options = {}) {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${this.API_BASE_URL}${endpoint}`;
    return await authService.authenticatedFetch(url, options);
  }

  async _fetchOrNull(endpoint, options = {}) {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${this.API_BASE_URL}${endpoint}`;

    let accessToken = authService.getAccessToken();
    if (!accessToken) return null;

    const makeRequest = async (token) => {
      return await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    };

    let response = await makeRequest(accessToken);

    if (response.status === 401) {
      try {
        accessToken = await authService.refreshAccessToken();
        response = await makeRequest(accessToken);
      } catch (e) {
        return null;
      }
    }

    // 404 = empty cart — not an error, just return null
    if (response.status === 404) return null;

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP error! status: ${response.status} — ${text.slice(0, 120)}`);
    }

    const text = await response.text();
    if (!text) return null;
    try { return JSON.parse(text); } catch { return null; }
  }



  _normaliseAllCarts(backendCarts) {
    console.log('_normaliseAllCarts raw input:', JSON.stringify(backendCarts));
    const items = [];
    for (const cart of backendCarts) {
      const restaurantId = cart.restaurant?.id;
      const restaurantName = cart.restaurant?.name ?? '';
      console.log(`  cart_id=${cart.cart_id} restaurant=${restaurantName}(${restaurantId}) items=${cart.items?.length}`);
      for (const item of (cart.items ?? [])) {
        const foodId = item.item_id ?? item.food_id;
        console.log(`    item: food_id=${foodId} name=${item.name} qty=${item.quantity}`);
        items.push({
          id: `${foodId}-${restaurantId}`,
          foodId,
          food_id: foodId,
          name: item.name,
          price: parseFloat(item.price),
          quantity: item.quantity,
          image: item.image_url ?? '',
          restaurantId,
          restaurant: restaurantName,
          restaurantImage: cart.restaurant?.image_url ?? cart.restaurant?.logo ?? cart.restaurant?.image ?? '',
        });
      }
    }
    console.log('_normaliseAllCarts result:', items.length, 'items');
    return items;
  }

  async getAllCarts() {
    if (!authService.isAuthenticated()) {
      console.log('getAllCarts: not authenticated, using localStorage');
      return this.loadLocalCart();
    }
    try {
      console.log('getAllCarts: fetching from', this.API_BASE_URL + '/');
      const data = await this._fetchOrNull('/');
      console.log('getAllCarts: raw response:', JSON.stringify(data));
      if (!data) {
        console.log('getAllCarts: got null/404 → empty cart');
        return [];
      }
      const result = this._normaliseAllCarts(Array.isArray(data) ? data : []);
      console.log('getAllCarts: normalised to', result.length, 'items');
      return result;
    } catch (e) {
      console.error('getAllCarts error:', e);
      return [];
    }
  }
  async addToCart(restaurantId, item) {
    if (!authService.isAuthenticated()) {
      return this._localAdd(restaurantId, item);
    }

    const url = `${this.API_BASE_URL}/${restaurantId}/`;
    let accessToken = authService.getAccessToken();

    const attempt = async (token) => fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_id: item.food_id ?? item.foodId,
        quantity: item.quantity ?? 1,
      }),
    });

    let res = await attempt(accessToken);
    if (res.status === 401) {
      accessToken = await authService.refreshAccessToken();
      res = await attempt(accessToken);
    }

    if (res.status === 409) {
      return this.updateCartItem(
        restaurantId,
        item.food_id ?? item.foodId,
        item.quantity ?? 1
      );
    }

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`addToCart failed ${res.status}: ${body.slice(0, 200)}`);
    }
  }
  async updateCartItem(restaurantId, foodId, quantity) {
    if (!authService.isAuthenticated()) {
      return this._localUpdate(restaurantId, foodId, quantity);
    }
    if (quantity <= 0) return this.removeFromCart(restaurantId, foodId);
    const res = await this._rawFetch(`/${restaurantId}/`, {
      method: 'PUT',
      body: JSON.stringify({ item_id: foodId, quantity }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`updateCartItem failed ${res.status}: ${body.slice(0, 200)}`);
    }
  }

  async removeFromCart(restaurantId, foodId) {
    if (!authService.isAuthenticated()) {
      return this._localRemove(restaurantId, foodId);
    }
    const res = await this._rawFetch(`/${restaurantId}/`, {
      method: 'DELETE',
      body: JSON.stringify({ item_id: foodId }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`removeFromCart failed ${res.status}: ${body.slice(0, 200)}`);
    }
  }

  async _rawFetch(endpoint, options = {}) {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${this.API_BASE_URL}${endpoint}`;
    let accessToken = authService.getAccessToken();
    const attempt = (token) => fetch(url, {
      ...options,
      headers: { ...options.headers, 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    let res = await attempt(accessToken);
    if (res.status === 401) {
      accessToken = await authService.refreshAccessToken();
      res = await attempt(accessToken);
    }
    return res;
  }

  async syncCartAfterLogin() {
    const local = this.loadLocalCart();
    if (!local.length) return;

    const grouped = local.reduce((acc, item) => {
      const rid = item.restaurantId;
      if (!acc[rid]) acc[rid] = [];
      acc[rid].push(item);
      return acc;
    }, {});

    for (const [restaurantId, items] of Object.entries(grouped)) {
      for (const item of items) {
        const foodId = item.food_id ?? item.foodId;
        if (!foodId) continue;
        try {
          await this.addToCart(parseInt(restaurantId), {
            food_id: foodId,
            quantity: item.quantity ?? 1,
          });
        } catch (e) {
          console.error('Sync item failed:', item, e);
        }
      }
    }
    this.clearLocalCart();
  }


  _localAdd(restaurantId, item) {
    const cart = this.loadLocalCart();
    const foodId = item.food_id ?? item.foodId;
    const idx = cart.findIndex(
      i => (i.food_id ?? i.foodId) === foodId && i.restaurantId === restaurantId
    );
    if (idx !== -1) {
      cart[idx].quantity += item.quantity ?? 1;
    } else {
      cart.push({ ...item, food_id: foodId, foodId, restaurantId, quantity: item.quantity ?? 1 });
    }
    this.saveLocalCart(cart);
  }

  _localUpdate(restaurantId, foodId, quantity) {
    let cart = this.loadLocalCart();
    if (quantity <= 0) {
      cart = cart.filter(
        i => !((i.food_id ?? i.foodId) === foodId && i.restaurantId === restaurantId)
      );
    } else {
      cart = cart.map(i =>
        (i.food_id ?? i.foodId) === foodId && i.restaurantId === restaurantId
          ? { ...i, quantity }
          : i
      );
    }
    this.saveLocalCart(cart);
  }

  _localRemove(restaurantId, foodId) {
    const cart = this.loadLocalCart().filter(
      i => !((i.food_id ?? i.foodId) === foodId && i.restaurantId === restaurantId)
    );
    this.saveLocalCart(cart);
  }
}

const cartApiService = new CartApiService();
export default cartApiService;