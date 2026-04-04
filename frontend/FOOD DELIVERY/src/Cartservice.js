// cartService.js - Handle cart persistence in localStorage

class CartService {
  constructor() {
    this.CART_KEY = 'foodpanda_cart';
  }


  /**
   * Save cart to localStorage
   * @param {Array} cartItems - Array of cart items
   */
  saveCart(cartItems) {
    try {
      localStorage.setItem(this.CART_KEY, JSON.stringify(cartItems));
      return true;
    } catch (error) {
      console.error('Error saving cart:', error);
      return false;
    }
  }

  /**
   * Load cart from localStorage
   * @returns {Array} Cart items
   */
  loadCart() {
    try {
      const cartStr = localStorage.getItem(this.CART_KEY);
      return cartStr ? JSON.parse(cartStr) : [];
    } catch (error) {
      console.error('Error loading cart:', error);
      return [];
    }
  }

  clearCart() {
    try {
      localStorage.removeItem(this.CART_KEY);
      return true;
    } catch (error) {
      console.error('Error clearing cart:', error);
      return false;
    }
  }

  /**
   * Add item to cart (with smart quantity handling)
   * @param {Object} newItem - Item to add
   * @returns {Array} Updated cart
   */
  addItem(newItem) {
    const cart = this.loadCart();
    
    // Check if item already exists
    const existingItemIndex = cart.findIndex(
      item => item.foodId === newItem.foodId && 
              item.restaurantId === newItem.restaurantId
    );

    if (existingItemIndex !== -1) {
      // Item exists - increase quantity
      cart[existingItemIndex].quantity += 1;
    } else {
      // New item - add to cart
      cart.push({ ...newItem, quantity: 1 });
    }

    this.saveCart(cart);
    return cart;
  }

  /**
   * Update item quantity
   * @param {string} itemId - Item ID
   * @param {number} newQuantity - New quantity
   * @returns {Array} Updated cart
   */
  updateQuantity(itemId, newQuantity) {
    let cart = this.loadCart();
    
    if (newQuantity <= 0) {
      // Remove item if quantity is 0 or negative
      cart = cart.filter(item => item.id !== itemId);
    } else {
      // Update quantity
      cart = cart.map(item => 
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      );
    }

    this.saveCart(cart);
    return cart;
  }

  /**
   * Remove item from cart
   * @param {string} itemId - Item ID
   * @returns {Array} Updated cart
   */
  removeItem(itemId) {
    let cart = this.loadCart();
    cart = cart.filter(item => item.id !== itemId);
    this.saveCart(cart);
    return cart;
  }

  /**
   * Get items for a specific restaurant
   * @param {number} restaurantId - Restaurant ID
   * @returns {Array} Items from that restaurant
   */
  getRestaurantItems(restaurantId) {
    const cart = this.loadCart();
    return cart.filter(item => item.restaurantId === restaurantId);
  }

  /**
   * Get total items count
   * @returns {number} Total number of items
   */
  getTotalItemsCount() {
    const cart = this.loadCart();
    return cart.reduce((total, item) => total + item.quantity, 0);
  }

  /**
   * Get cart subtotal
   * @returns {number} Subtotal amount
   */
  getSubtotal() {
    const cart = this.loadCart();
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  }

  /**
   * Get items grouped by restaurant
   * @returns {Object} Items grouped by restaurantId
   */
  getGroupedByRestaurant() {
    const cart = this.loadCart();
    return cart.reduce((acc, item) => {
      const restaurantId = item.restaurantId || 'unknown';
      
      if (!acc[restaurantId]) {
        acc[restaurantId] = {
          restaurantName: item.restaurant,
          restaurantId: restaurantId,
          restaurantImage: item.restaurantImage,
          items: [],
          subtotal: 0,
          savings: 0
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

  /**
   * Sync cart with backend (optional - implement if you have backend cart)
   * @param {string} userId - User ID
   */
  async syncWithBackend(userId) {
    console.log('Cart sync with backend not implemented yet');
  }

  /**
   * Load cart from backend (optional)
   * @param {string} userId - User ID
   */
  async loadFromBackend(userId) {

    console.log('Cart load from backend not implemented yet');
  }
}

const cartService = new CartService();
export default cartService;