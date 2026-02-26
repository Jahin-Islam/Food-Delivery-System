// authService.js - Enhanced with Restaurant Partner Support
// 
// ENDPOINTS:
// - http://127.0.0.1:8000/api/auth/login/          (POST - login)
// - http://127.0.0.1:8000/api/auth/register/       (POST - register customer)
// - http://127.0.0.1:8000/api/auth/register/vendor/ (POST - register restaurant partner)
// - http://127.0.0.1:8000/api/auth/logout/         (POST - logout)
// - http://127.0.0.1:8000/api/auth/token/refresh/  (POST - refresh token)
// - http://127.0.0.1:8000/api/auth/user/           (GET - get user details)

class AuthService {
  constructor() {
    this.API_BASE_URL = 'http://127.0.0.1:8000/api/auth';
  }

  // ============================================
  // TOKEN MANAGEMENT (with localStorage)
  // ============================================

  setTokens(accessToken, refreshToken) {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  getAccessToken() {
    return localStorage.getItem('accessToken');
  }

  getRefreshToken() {
    return localStorage.getItem('refreshToken');
  }

  clearTokens() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('restaurantData'); // Clear restaurant data on logout
  }

  isAuthenticated() {
    return !!this.getAccessToken();
  }

  // ============================================
  // USER DATA MANAGEMENT
  // ============================================

  setUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
  }

  getUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  clearUser() {
    localStorage.removeItem('user');
  }

  // ============================================
  // RESTAURANT DATA MANAGEMENT (for vendors)
  // ============================================

  setRestaurantData(restaurantData) {
    localStorage.setItem('restaurantData', JSON.stringify(restaurantData));
  }

  getRestaurantData() {
    const dataStr = localStorage.getItem('restaurantData');
    return dataStr ? JSON.parse(dataStr) : null;
  }

  clearRestaurantData() {
    localStorage.removeItem('restaurantData');
  }

  // Check if user is a restaurant owner
  isRestaurantOwner() {
    const user = this.getUser();
    // Backend role is 'RESTAURANT' (from views.py: request.user.role != 'RESTAURANT')
    return user?.role === 'RESTAURANT'
      || user?.role === 'vendor'
      || user?.user_type === 'vendor'
      || user?.is_vendor
      || !!this.getRestaurantData();
  }

  // ============================================
  // HELPER: Safe JSON parsing
  // ============================================
  
  async safeJsonParse(response) {
    const text = await response.text();
    
    // Check if response is HTML (error page)
    if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
      console.error('Received HTML instead of JSON. Response:', text.substring(0, 200));
      throw new Error('Server returned an error page. Please check if the backend is running.');
    }
    
    try {
      return JSON.parse(text);
    } catch (error) {
      console.error('Failed to parse JSON:', text.substring(0, 200));
      throw new Error('Invalid response from server');
    }
  }

  // ============================================
  // FETCH USER DETAILS
  // ============================================

  async fetchUserDetails() {
    try {
      const response = await this.authenticatedFetch(`${this.API_BASE_URL}/user/`);
      if (response) {
        this.setUser(response);
        return response;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user details:', error);
      return null;
    }
  }

  // ============================================
  // TOKEN REFRESH
  // ============================================

  async refreshAccessToken() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch(`${this.API_BASE_URL}/token/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await this.safeJsonParse(response);
      this.setTokens(data.access, refreshToken);
      return data.access;
    } catch (error) {
      console.error('Token refresh error:', error);
      this.clearTokens();
      this.clearUser();
      this.clearRestaurantData();
      throw error;
    }
  }

  // ============================================
  // AUTHENTICATED FETCH (with auto token refresh)
  // ============================================

  async authenticatedFetch(url, options = {}) {
    let accessToken = this.getAccessToken();

    if (!accessToken) {
      throw new Error('No access token available');
    }

    // First attempt with current token
    let response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    // If token expired (401), refresh and retry
    if (response.status === 401) {
      try {
        accessToken = await this.refreshAccessToken();
        
        // Retry with new token
        response = await fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        // Refresh failed, user needs to log in again
        console.error('Token refresh failed:', error);
        this.logout();
        throw error;
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', response.status, errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return this.safeJsonParse(response);
  }

  // ============================================
  // LOGIN
  // ============================================

  async login(identifier, password, loginType = 'email') {
    try {
      // Build payload based on login type
      // Format phone number for backend (+880 prefix)
      let formattedIdentifier = identifier;
      if (loginType === 'phone') {
        let phone = identifier.toString().trim();
        if (phone.startsWith('0')) {
          phone = '+880' + phone.slice(1);   // 01712345678 → +8801712345678
        } else if (!phone.startsWith('+')) {
          phone = '+880' + phone;             // 1712345678  → +8801712345678
        }
        formattedIdentifier = phone;
      }

      const payload = loginType === 'phone'
        ? { phone_number: formattedIdentifier, password }
        : { email: formattedIdentifier, password };

      const response = await fetch(`${this.API_BASE_URL}/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMessage = 'Login failed';
        try {
          const errorData = await this.safeJsonParse(response);
          console.error('Backend error response:', errorData);
          // Try every possible error field from Django
          errorMessage = errorData.detail 
            || errorData.message 
            || errorData.non_field_errors?.[0]
            || errorData.email?.[0]
            || errorData.phone_number?.[0]
            || errorData.phone?.[0]
            || errorData.username?.[0]
            || JSON.stringify(errorData);
        } catch (e) {
          errorMessage = `Login failed with status ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      const data = await this.safeJsonParse(response);
      
      // Store tokens
      this.setTokens(data.access, data.refresh);
      
      // Store user data
      if (data.user) {
        this.setUser(data.user);
        
        // If user is a vendor, store restaurant data
        if (data.restaurant) {
          this.setRestaurantData(data.restaurant);
        }
      } else {
        // Fetch user details if not provided
        await this.fetchUserDetails();
      }

      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // ============================================
  // LOGOUT
  // ============================================

  async logout() {
    try {
      // Optional: Call backend logout endpoint
      const refreshToken = this.getRefreshToken();
      if (refreshToken) {
        await fetch(`${this.API_BASE_URL}/logout/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.getAccessToken()}`,
          },
          body: JSON.stringify({ refresh: refreshToken }),
        }).catch(() => {
          // Ignore errors on logout endpoint
        });
      }
    } finally {
      // Always clear local data
      this.clearTokens();
      this.clearUser();
      this.clearRestaurantData();
    }
  }

  // ============================================
  // REGISTER CUSTOMER
  // ============================================

  async register(userData) {
    try {
      const response = await fetch(`${this.API_BASE_URL}/register/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        let errorMessage = 'Registration failed';
        try {
          const errorData = await this.safeJsonParse(response);
          
          // Handle field-specific errors
          if (errorData.email) {
            errorMessage = `Email: ${errorData.email[0]}`;
          } else if (errorData.password) {
            errorMessage = `Password: ${errorData.password[0]}`;
          } else if (errorData.detail) {
            errorMessage = errorData.detail;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (e) {
          errorMessage = `Registration failed with status ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      const data = await this.safeJsonParse(response);
      
      // Auto-login after registration if tokens are provided
      if (data.access && data.refresh) {
        this.setTokens(data.access, data.refresh);
        if (data.user) {
          this.setUser(data.user);
        } else {
          await this.fetchUserDetails();
        }
      }

      return data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  // ============================================
  // REGISTER RESTAURANT PARTNER (VENDOR)
  // ============================================

  async registerRestaurantPartner(partnerData) {
    try {
      // Prepare data for vendor registration
      const password = partnerData.password || 'TempPassword123!';
      const password2 = partnerData.password2 || password;

      // Format phone: if user typed 01712345678 (11 digits) or 1712345678 (10 digits),
      // send as +8801712345678 to backend
      let phone = partnerData.phone || '';
      if (phone.startsWith('0')) {
        phone = '+880' + phone.slice(1); // 01712345678 → +8801712345678
      } else if (!phone.startsWith('+')) {
        phone = '+880' + phone;          // 1712345678  → +8801712345678
      }

      const vendorData = {
        email: partnerData.email,
        password: password,
        password2: password2,            // ← actual confirm password
        first_name: partnerData.ownerFirstName,
        last_name: partnerData.ownerLastName,
        phone_number: phone,             // ← formatted with +880
        user_type: 'vendor',
        // Restaurant specific data
        restaurant_name: partnerData.businessName,
        restaurant_category: partnerData.businessType,
      };

      const response = await fetch(`${this.API_BASE_URL}/register/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(vendorData),
      });

      if (!response.ok) {
        let errorMessage = 'Restaurant registration failed';
        try {
          const errorData = await this.safeJsonParse(response);
          console.error('Registration error response:', errorData);
          
          // Extract first meaningful error from any field
          if (errorData.email) {
            errorMessage = `Email: ${Array.isArray(errorData.email) ? errorData.email[0] : errorData.email}`;
          } else if (errorData.phone_number) {
            errorMessage = `Phone: ${Array.isArray(errorData.phone_number) ? errorData.phone_number[0] : errorData.phone_number}`;
          } else if (errorData.password) {
            errorMessage = `Password: ${Array.isArray(errorData.password) ? errorData.password[0] : errorData.password}`;
          } else if (errorData.password2) {
            errorMessage = `Confirm Password: ${Array.isArray(errorData.password2) ? errorData.password2[0] : errorData.password2}`;
          } else if (errorData.restaurant_name) {
            errorMessage = `Business Name: ${Array.isArray(errorData.restaurant_name) ? errorData.restaurant_name[0] : errorData.restaurant_name}`;
          } else if (errorData.detail) {
            errorMessage = errorData.detail;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          } else {
            // Show all errors so we can debug
            errorMessage = JSON.stringify(errorData);
          }
        } catch (e) {
          errorMessage = `Registration failed with status ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      const data = await this.safeJsonParse(response);
      
      // Auto-login after registration
      if (data.access && data.refresh) {
        this.setTokens(data.access, data.refresh);
        
        if (data.user) {
          this.setUser(data.user);
        }
        
        if (data.restaurant) {
          this.setRestaurantData(data.restaurant);
        }
        
        // If user data not provided, fetch it
        if (!data.user) {
          await this.fetchUserDetails();
        }
      }

      return data;
    } catch (error) {
      console.error('Restaurant partner registration error:', error);
      throw error;
    }
  }

  // ============================================
  // INITIALIZE - Check auth state on app load
  // ============================================

  async initialize() {
    const accessToken = this.getAccessToken();
    const user = this.getUser();

    if (accessToken) {
      try {
        // If we don't have user data, fetch it
        if (!user) {
          await this.fetchUserDetails();
        }
        return { 
          isAuthenticated: true, 
          user: this.getUser(),
          restaurant: this.getRestaurantData()
        };
      } catch (error) {
        // Token invalid, try to refresh
        try {
          await this.refreshAccessToken();
          await this.fetchUserDetails();
          return { 
            isAuthenticated: true, 
            user: this.getUser(),
            restaurant: this.getRestaurantData()
          };
        } catch (refreshError) {
          // Refresh failed, clear everything
          this.clearTokens();
          this.clearUser();
          this.clearRestaurantData();
          return { isAuthenticated: false, user: null, restaurant: null };
        }
      }
    }

    return { isAuthenticated: false, user: null, restaurant: null };
  }
}

// Create and export a singleton instance
const authService = new AuthService();
export default authService;