// Authservice.js - Fixed with correct API endpoints
// 
// IMPORTANT: This file assumes your Django backend has these endpoints:
// - http://127.0.0.1:8000/api/auth/login/          (POST - login)
// - http://127.0.0.1:8000/api/auth/register/       (POST - register)
// - http://127.0.0.1:8000/api/auth/logout/         (POST - logout)
// - http://127.0.0.1:8000/api/auth/token/refresh/  (POST - refresh token)
// - http://127.0.0.1:8000/api/auth/user/           (GET - get user details)
//
// Restaurant endpoints are separate:
// - http://127.0.0.1:8000/api/v1/restaurants/      (GET - list restaurants)
// - http://127.0.0.1:8000/api/v1/restaurants/{id}/ (GET - restaurant details)

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

  async login(email, password) {
    try {
      const response = await fetch(`${this.API_BASE_URL}/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        let errorMessage = 'Login failed';
        try {
          const errorData = await this.safeJsonParse(response);
          errorMessage = errorData.detail || errorData.message || 'Login failed';
        } catch (e) {
          // If we can't parse the error, use a generic message
          errorMessage = `Login failed with status ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      const data = await this.safeJsonParse(response);
      
      // Store tokens
      this.setTokens(data.access, data.refresh);
      
      // Store user data if provided
      if (data.user) {
        this.setUser(data.user);
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
      // Optional: Call backend logout endpoint if you have one
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
    }
  }

  // ============================================
  // REGISTER
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
  // INITIALIZE - Check auth state on app load
  // ============================================

  async initialize() {
    const accessToken = this.getAccessToken();
    const user = this.getUser();

    if (accessToken) {
      // We have a token, verify it's still valid
      try {
        // If we don't have user data, fetch it
        if (!user) {
          await this.fetchUserDetails();
        }
        return { isAuthenticated: true, user: this.getUser() };
      } catch (error) {
        // Token invalid, try to refresh
        try {
          await this.refreshAccessToken();
          await this.fetchUserDetails();
          return { isAuthenticated: true, user: this.getUser() };
        } catch (refreshError) {
          // Refresh failed, clear everything
          this.clearTokens();
          this.clearUser();
          return { isAuthenticated: false, user: null };
        }
      }
    }

    return { isAuthenticated: false, user: null };
  }
}

// Create and export a singleton instance
const authService = new AuthService();
export default authService;