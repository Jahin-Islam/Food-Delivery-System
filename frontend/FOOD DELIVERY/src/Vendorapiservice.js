// vendorApiService.js - Vendor/Business Owner API Service
// Handles all API calls for Business Dashboard (Menu, Categories, Discounts, Items)

import authService from './Authservice';

class VendorApiService {
  constructor() {
    this.API_BASE_URL = 'http://127.0.0.1:8000/api/vendor';
  }

  // ============================================
  // HELPER: Authenticated Fetch for Vendor
  // ============================================
  
  async authenticatedFetch(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${this.API_BASE_URL}${endpoint}`;
    return await authService.authenticatedFetch(url, options);
  }

  // ============================================
  // DISCOUNTS (DEALS) API
  // ============================================

  /**
   * Get all discounts for the authenticated restaurant
   * @returns {Promise<Array>} List of discounts
   */
  async getDiscounts() {
    try {
      return await this.authenticatedFetch('/discounts/');
    } catch (error) {
      console.error('Error fetching discounts:', error);
      throw error;
    }
  }

  /**
   * Add a new discount
   * @param {Object} discountData - { description, min_order, percentage }
   * @returns {Promise<Object>} Created discount
   */
  async addDiscount(discountData) {
    try {
      return await this.authenticatedFetch('/discounts/', {
        method: 'POST',
        body: JSON.stringify(discountData),
      });
    } catch (error) {
      console.error('Error adding discount:', error);
      throw error;
    }
  }

  /**
   * Update an existing discount
   * @param {number} discountId - Discount ID
   * @param {Object} discountData - Updated data
   * @returns {Promise<Object>} Updated discount
   */
  async updateDiscount(discountId, discountData) {
    try {
      return await this.authenticatedFetch(`/discounts/${discountId}/`, {
        method: 'PUT',
        body: JSON.stringify(discountData),
      });
    } catch (error) {
      console.error('Error updating discount:', error);
      throw error;
    }
  }

  /**
   * Delete a discount
   * @param {number} discountId - Discount ID
   * @returns {Promise<void>}
   */
  async deleteDiscount(discountId) {
    try {
      await this.authenticatedFetch(`/discounts/${discountId}/`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error deleting discount:', error);
      throw error;
    }
  }

  // ============================================
  // CATEGORIES API
  // ============================================

  /**
   * Get all categories for the authenticated restaurant
   * @returns {Promise<Array>} List of categories
   */
  async getCategories() {
    try {
      return await this.authenticatedFetch('/categories/');
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }

  /**
   * Add a new category
   * @param {Object} categoryData - { name }
   * @returns {Promise<Object>} Created category
   */
  async addCategory(categoryData) {
    try {
      return await this.authenticatedFetch('/categories/', {
        method: 'POST',
        body: JSON.stringify(categoryData),
      });
    } catch (error) {
      console.error('Error adding category:', error);
      throw error;
    }
  }

  /**
   * Update an existing category
   * @param {number} categoryId - Category ID
   * @param {Object} categoryData - Updated data
   * @returns {Promise<Object>} Updated category
   */
  async updateCategory(categoryId, categoryData) {
    try {
      return await this.authenticatedFetch(`/categories/${categoryId}/`, {
        method: 'PUT',
        body: JSON.stringify(categoryData),
      });
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  }

  /**
   * Delete a category
   * @param {number} categoryId - Category ID
   * @returns {Promise<void>}
   */
  async deleteCategory(categoryId) {
    try {
      await this.authenticatedFetch(`/categories/${categoryId}/`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  }

  // ============================================
  // MENU ITEMS API
  // ============================================

  /**
   * Get all menu items for the authenticated restaurant
   * @returns {Promise<Array>} List of menu items
   */
  async getItems() {
    try {
      return await this.authenticatedFetch('/items/');
    } catch (error) {
      console.error('Error fetching items:', error);
      throw error;
    }
  }

  /**
   * Add a new menu item (with image upload)
   * @param {Object} itemData - Item data including image file
   * @returns {Promise<Object>} Created item
   */
  async addItem(itemData) {
    try {
      const accessToken = authService.getAccessToken();
      if (!accessToken) {
        throw new Error('No access token available');
      }

      // Create FormData for file upload
      const formData = new FormData();
      
      // Append all fields to FormData
      Object.keys(itemData).forEach(key => {
        if (itemData[key] !== null && itemData[key] !== undefined) {
          formData.append(key, itemData[key]);
        }
      });

      // Make request with FormData (no Content-Type header, browser sets it)
      const response = await fetch(`${this.API_BASE_URL}/items/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          // Don't set Content-Type - let browser set it with boundary
        },
        body: formData,
      });

      if (response.status === 401) {
        // Try refreshing token
        const newToken = await authService.refreshAccessToken();
        const retryResponse = await fetch(`${this.API_BASE_URL}/items/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${newToken}`,
          },
          body: formData,
        });
        
        if (!retryResponse.ok) {
          throw new Error(`HTTP error! status: ${retryResponse.status}`);
        }
        return await retryResponse.json();
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error adding item:', error);
      throw error;
    }
  }

  /**
   * Update an existing menu item
   * @param {number} itemId - Item ID
   * @param {Object} itemData - Updated data (can include new image)
   * @returns {Promise<Object>} Updated item
   */
  async updateItem(itemId, itemData) {
    try {
      const accessToken = authService.getAccessToken();
      if (!accessToken) {
        throw new Error('No access token available');
      }

      // Create FormData for file upload
      const formData = new FormData();
      
      // Append all fields to FormData
      Object.keys(itemData).forEach(key => {
        if (itemData[key] !== null && itemData[key] !== undefined) {
          formData.append(key, itemData[key]);
        }
      });

      const response = await fetch(`${this.API_BASE_URL}/items/${itemId}/`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        body: formData,
      });

      if (response.status === 401) {
        const newToken = await authService.refreshAccessToken();
        const retryResponse = await fetch(`${this.API_BASE_URL}/items/${itemId}/`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${newToken}`,
          },
          body: formData,
        });
        
        if (!retryResponse.ok) {
          throw new Error(`HTTP error! status: ${retryResponse.status}`);
        }
        return await retryResponse.json();
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating item:', error);
      throw error;
    }
  }

  /**
   * Delete a menu item
   * @param {number} itemId - Item ID
   * @returns {Promise<void>}
   */
  async deleteItem(itemId) {
    try {
      await this.authenticatedFetch(`/items/${itemId}/`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error deleting item:', error);
      throw error;
    }
  }

  /**
   * Toggle item availability
   * @param {number} itemId - Item ID
   * @param {boolean} isAvailable - New availability status
   * @returns {Promise<Object>} Updated item
   */
  async toggleItemAvailability(itemId, isAvailable) {
    try {
      return await this.authenticatedFetch(`/items/${itemId}/`, {
        method: 'PATCH',
        body: JSON.stringify({ is_available: isAvailable ? 1 : 0 }),
      });
    } catch (error) {
      console.error('Error toggling item availability:', error);
      throw error;
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Prepare item data for submission
   * @param {Object} itemData - Raw item data from form
   * @returns {Object} Formatted data for API
   */
  prepareItemData(itemData) {
    return {
      name: itemData.name,
      description: itemData.description || '',
      price: parseFloat(itemData.price),
      discount_ammount: itemData.discount_ammount ? parseFloat(itemData.discount_ammount) : 0,
      discount_description: itemData.discount_description || '',
      is_available: itemData.is_available ? 1 : 0,
      category_id: itemData.category_id || itemData.category_name, // Backend should handle both
      image: itemData.image_file || null, // File object
    };
  }

  /**
   * Prepare discount data for submission
   * @param {Object} discountData - Raw discount data from form
   * @returns {Object} Formatted data for API
   */
  prepareDiscountData(discountData) {
    return {
      description: discountData.description,
      min_order: parseFloat(discountData.min_order),
      percentage: parseFloat(discountData.percentage),
    };
  }

  /**
   * Prepare category data for submission
   * @param {Object} categoryData - Raw category data from form
   * @returns {Object} Formatted data for API
   */
  prepareCategoryData(categoryData) {
    return {
      name: categoryData.name,
    };
  }
}

// Create and export singleton instance
const vendorApiService = new VendorApiService();
export default vendorApiService;