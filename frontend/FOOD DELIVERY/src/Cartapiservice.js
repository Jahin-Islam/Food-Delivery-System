// cartApiService.js - Backend Cart Integration
// Matches Django backend exactly:
//   POST   /api/carts/<restaurant_id>/  body: { item_id, quantity }
//   PUT    /api/carts/<restaurant_id>/  body: { item_id, quantity }
//   DELETE /api/carts/<restaurant_id>/  body: { item_id }
//   GET    /api/carts/<restaurant_id>/  → { items: [...], total_price }
//   GET    /api/carts/                  → [ ...carts ]

import authService from './Authservice';

class CartApiService {
  constructor() {
    this.API_BASE_URL = 'http://127.0.0.1:8000/api/carts';
    this.CART_KEY = 'foodpanda_cart';
  }

  // ============================================
  // HELPER: Authenticated Fetch
  // ============================================

  async authenticatedFetch(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${this.API_BASE_URL}${endpoint}`;
    return await authService.authenticatedFetch(url, options);
  }

  // ============================================
  // LOCAL CART (for offline / unauthenticated)
  // ============================================

  saveLocalCart(cartItems) {
    try {
      localStorage.setItem(this.CART_KEY, JSON.stringify(cartItems));
      return true;
    } catch (error) {
      console.error('Error saving local cart:', error);
      return false;
    }
  }

  loadLocalCart() {
    try {
      const cartStr = localStorage.getItem(this.CART_KEY);
      return cartStr ? JSON.parse(cartStr) : [];
    } catch (error) {
      console.error('Error loading local cart:', error);
      return [];
    }
  }

  clearLocalCart() {
    try {
      localStorage.removeItem(this.CART_KEY);
      return true;
    } catch (error) {
      console.error('Error clearing local cart:', error);
      return false;
    }
  }

  // ============================================
  // BACKEND CART API
  // ============================================

  /**
   * Get cart for a specific restaurant
   * GET /api/carts/<restaurant_id>/
   */
  async getCart(restaurantId) {
    try {
      if (!authService.isAuthenticated()) {
        const localCart = this.loadLocalCart();
        return localCart.filter(item => item.restaurantId === restaurantId);
      }
      return await this.authenticatedFetch(`/${restaurantId}/`);
    } catch (error) {
      console.error('Error fetching cart:', error);
      const localCart = this.loadLocalCart();
      return localCart.filter(item => item.restaurantId === restaurantId);
    }
  }

  /**
   * Get all carts grouped by restaurant
   * GET /api/carts/
   */
  async getAllCarts() {
    try {
      if (!authService.isAuthenticated()) {
        return this.loadLocalCart();
      }
      return await this.authenticatedFetch('/');
    } catch (error) {
      console.error('Error fetching all carts:', error);
      return this.loadLocalCart();
    }
  }

  /**
   * Add item to cart
   * POST /api/carts/<restaurant_id>/
   * Body: { item_id: <food_id>, quantity: <int> }
   *
   * Backend returns 409 if item already in cart → use PUT to update instead.
   */
  async addToCart(restaurantId, item) {
    try {
      if (!authService.isAuthenticated()) {
        // Offline: save to localStorage
        const localCart = this.loadLocalCart();
        const existingIndex = localCart.findIndex(
          cartItem =>
            cartItem.food_id === item.food_id &&
            cartItem.restaurantId === restaurantId
        );
        if (existingIndex !== -1) {
          localCart[existingIndex].quantity += item.quantity || 1;
        } else {
          localCart.push({ ...item, restaurantId, quantity: item.quantity || 1 });
        }
        this.saveLocalCart(localCart);
        return localCart.filter(i => i.restaurantId === restaurantId);
      }

      // Try POST first
      try {
        return await this.authenticatedFetch(`/${restaurantId}/`, {
          method: 'POST',
          body: JSON.stringify({
            item_id: item.food_id,       // ← matches backend: item_id = request.data.get('item_id')
            quantity: item.quantity || 1,
          }),
        });
      } catch (postError) {
        // Backend returns 409 when item already exists → update quantity instead
        if (postError.message && postError.message.includes('409')) {
          console.log('Item already in cart, updating quantity via PUT');
          return await this.updateCartItem(restaurantId, item.food_id, item.quantity || 1);
        }
        throw postError;
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error;
    }
  }

  /**
   * Update cart item quantity
   * PUT /api/carts/<restaurant_id>/
   * Body: { item_id: <food_id>, quantity: <int> }
   */
  async updateCartItem(restaurantId, foodId, quantity) {
    try {
      if (!authService.isAuthenticated()) {
        const localCart = this.loadLocalCart();
        if (quantity <= 0) {
          const updatedCart = localCart.filter(
            item => !(item.food_id === foodId && item.restaurantId === restaurantId)
          );
          this.saveLocalCart(updatedCart);
          return updatedCart.filter(i => i.restaurantId === restaurantId);
        }
        const updatedCart = localCart.map(item =>
          item.food_id === foodId && item.restaurantId === restaurantId
            ? { ...item, quantity }
            : item
        );
        this.saveLocalCart(updatedCart);
        return updatedCart.filter(i => i.restaurantId === restaurantId);
      }

      if (quantity <= 0) {
        return await this.removeFromCart(restaurantId, foodId);
      }

      return await this.authenticatedFetch(`/${restaurantId}/`, {
        method: 'PUT',                    // ← backend uses PUT not PATCH
        body: JSON.stringify({
          item_id: foodId,                // ← matches backend: item_id = request.data.get('item_id')
          quantity: quantity,
        }),
      });
    } catch (error) {
      console.error('Error updating cart item:', error);
      throw error;
    }
  }

  /**
   * Remove item from cart
   * DELETE /api/carts/<restaurant_id>/
   * Body: { item_id: <food_id> }
   */
  async removeFromCart(restaurantId, foodId) {
    try {
      if (!authService.isAuthenticated()) {
        const localCart = this.loadLocalCart();
        const updatedCart = localCart.filter(
          item => !(item.food_id === foodId && item.restaurantId === restaurantId)
        );
        this.saveLocalCart(updatedCart);
        return updatedCart.filter(i => i.restaurantId === restaurantId);
      }

      return await this.authenticatedFetch(`/${restaurantId}/`, {
        method: 'DELETE',
        body: JSON.stringify({
          item_id: foodId,                // ← matches backend: item_id = request.data.get('item_id')
        }),
      });
    } catch (error) {
      console.error('Error removing from cart:', error);
      throw error;
    }
  }

  /**
   * Sync local cart to backend after login/signup
   * Groups items by restaurant, then POSTs each item.
   * If item already exists (409), falls back to PUT.
   */
  async syncCartAfterLogin() {
    try {
      const localCart = this.loadLocalCart();

      if (localCart.length === 0) {
        console.log('No local cart to sync');
        return;
      }

      // Group by restaurantId
      const grouped = localCart.reduce((acc, item) => {
        const rid = item.restaurantId;
        if (!acc[rid]) acc[rid] = [];
        acc[rid].push(item);
        return acc;
      }, {});

      for (const [restaurantId, items] of Object.entries(grouped)) {
        for (const item of items) {
          try {
            // food_id is the correct field — set by backend responses and RestaurantDetail
            const foodId = item.food_id || item.foodId;
            if (!foodId) {
              console.warn('Skipping item without food_id:', item);
              continue;
            }
            await this.addToCart(parseInt(restaurantId), {
              food_id: foodId,
              quantity: item.quantity || 1,
            });
          } catch (err) {
            console.error(`Failed to sync item to backend:`, item, err);
          }
        }
      }

      // Clear local cart after successful sync
      this.clearLocalCart();
      console.log('Cart synced to backend successfully');
    } catch (error) {
      console.error('Error syncing cart after login:', error);
    }
  }

  // ============================================
  // LOCAL HELPERS
  // ============================================

  getTotalItemsCount() {
    const cart = this.loadLocalCart();
    return cart.reduce((total, item) => total + item.quantity, 0);
  }

  getSubtotal() {
    const cart = this.loadLocalCart();
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  }

  getGroupedByRestaurant() {
    const cart = this.loadLocalCart();
    return cart.reduce((acc, item) => {
      const restaurantId = item.restaurantId || 'unknown';
      if (!acc[restaurantId]) {
        acc[restaurantId] = {
          restaurantName: item.restaurant,
          restaurantId,
          restaurantImage: item.restaurantImage,
          items: [],
          subtotal: 0,
          savings: 0,
        };
      }
      acc[restaurantId].items.push(item);
      acc[restaurantId].subtotal += item.price * item.quantity;
      if (item.originalPrice) {
        acc[restaurantId].savings += (item.originalPrice - item.price) * item.quantity;
      }
      return acc;
    }, {});
  }
}

const cartApiService = new CartApiService();
export default cartApiService;