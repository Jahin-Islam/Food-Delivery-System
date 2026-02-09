// authService.js - Authentication and API service
// Updated to match your Django backend exactly

const API_BASE_URL = 'http://127.0.0.1:8000/api/auth';
class AuthService {
  // Get access token from localStorage
  getAccessToken() {
    return localStorage.getItem('access_token');
  }

  // Get refresh token from localStorage
  getRefreshToken() {
    return localStorage.getItem('refresh_token');
  }

  // Save tokens to localStorage
  saveTokens(accessToken, refreshToken) {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  }

  // Remove tokens from localStorage
  clearTokens() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  }

  // Save user data
  saveUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
  }

  // Get user data
  getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.getAccessToken();
  }

  // Login function - uses /login/ endpoint
  async login(email, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || error.message || 'Login failed');
      }

      const data = await response.json();
      
      // Response format from your backend:
      // {
      //   "refresh": "token...",
      //   "access": "token...",
      //   "role": "CUSTOMER",
      //   "email": "customer1@example.com",
      //   "user_id": 33
      // }
      
      // Save tokens
      this.saveTokens(data.access, data.refresh);
      
      // Create user object from login response
      const user = {
        id: data.user_id,
        email: data.email,
        role: data.role,
      };
      
      this.saveUser(user);
      
      return { success: true, user };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  }

  // Register function - uses /register/ endpoint
  async register(userData) {
    try {
      const response = await fetch(`${API_BASE_URL}/register/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const error = await response.json();
        // Handle validation errors
        if (error.email) {
          throw new Error(error.email[0]);
        }
        if (error.password) {
          throw new Error(error.password[0]);
        }
        throw new Error(error.detail || error.message || 'Registration failed');
      }

      const data = await response.json();
      
      // If registration returns tokens (like login does)
      if (data.access && data.refresh) {
        this.saveTokens(data.access, data.refresh);
        
        const user = {
          id: data.user_id,
          email: data.email,
          role: data.role,
        };
        
        this.saveUser(user);
        return { success: true, user };
      }
      
      // If registration doesn't return tokens, just return success
      return { success: true, data };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: error.message };
    }
  }

  // Refresh access token - uses /token/refresh/ endpoint
  async refreshToken() {
    try {
      const refreshToken = this.getRefreshToken();
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(`${API_BASE_URL}/token/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh: refreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      localStorage.setItem('access_token', data.access);
      
      return data.access;
    } catch (error) {
      console.error('Token refresh error:', error);
      this.clearTokens();
      return null;
    }
  }

  // Get current user profile - uses /profile/ endpoint
  async getCurrentUser() {
    try {
      const response = await this.authenticatedFetch(`${API_BASE_URL}/profile/`);
      return response;
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  }

  // Logout function
  logout() {
    this.clearTokens();
    window.location.href = '/';
  }

  // Authenticated fetch wrapper
  async authenticatedFetch(url, options = {}) {
    let accessToken = this.getAccessToken();

    // First attempt with current token
    let response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    // If token expired (401), try to refresh
    if (response.status === 401) {
      console.log('Token expired, attempting refresh...');
      accessToken = await this.refreshToken();
      
      if (!accessToken) {
        // Refresh failed, logout user
        console.error('Token refresh failed, logging out...');
        this.logout();
        throw new Error('Session expired. Please login again.');
      }

      // Retry request with new token
      response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || error.message || 'Request failed');
    }

    return response.json();
  }
}

// Create and export a singleton instance
const authService = new AuthService();
export default authService;