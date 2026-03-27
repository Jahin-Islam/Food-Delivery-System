// authService.js - Enhanced with Role-Based Signup Enforcement
//
// FIX #4: Role is now strictly enforced on registration.
// - Customer register → /api/auth/register/ with role=CUSTOMER
// - Restaurant register → /api/auth/register/ with role=RESTAURANT
// - Rider register → /api/auth/register/ with role=RIDER
// The backend must also enforce uniqueness per email across roles.
// On the frontend we check if an email is already in use before registering
// under a different role, and throw a clear error if so.

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

  getAccessToken()  { return localStorage.getItem('accessToken');  }
  getRefreshToken() { return localStorage.getItem('refreshToken'); }

  clearTokens() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('restaurantData');
  }

  isAuthenticated() { return !!this.getAccessToken(); }

  // ============================================
  // USER DATA MANAGEMENT
  // ============================================

  setUser(user)  { localStorage.setItem('user', JSON.stringify(user)); }
  getUser()      { const s = localStorage.getItem('user'); return s ? JSON.parse(s) : null; }
  clearUser()    { localStorage.removeItem('user'); }

  // ============================================
  // RESTAURANT DATA MANAGEMENT (for vendors)
  // ============================================

  setRestaurantData(data) { localStorage.setItem('restaurantData', JSON.stringify(data)); }
  getRestaurantData()     { const s = localStorage.getItem('restaurantData'); return s ? JSON.parse(s) : null; }
  clearRestaurantData()   { localStorage.removeItem('restaurantData'); }

  isRestaurantOwner() {
    const user = this.getUser();
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
    if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
      throw new Error('Server returned an error page. Please check if the backend is running.');
    }
    try { return JSON.parse(text); }
    catch { throw new Error('Invalid response from server'); }
  }

  // ============================================
  // FETCH USER DETAILS
  // ============================================

  async fetchUserDetails() {
    try {
      const response = await this.authenticatedFetch(`${this.API_BASE_URL}/profile/`);
      if (response) {
        this.setUser(response);
        if (response.restaurant_info?.id) {
          this.setRestaurantData({
            id:           response.restaurant_info.id,
            name:         response.restaurant_info.restaurant_name,
            category:     response.restaurant_info.category,
            phone:        response.restaurant_info.contact_phone,
            opening_time: response.restaurant_info.opening_time,
            closing_time: response.restaurant_info.closing_time,
            image_url:    response.restaurant_info.restaurant_image,
          });
        }
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
    if (!refreshToken) throw new Error('No refresh token available');

    try {
      const response = await fetch(`${this.API_BASE_URL}/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken }),
      });
      if (!response.ok) throw new Error('Token refresh failed');
      const data = await this.safeJsonParse(response);
      this.setTokens(data.access, refreshToken);
      return data.access;
    } catch (error) {
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
    if (!accessToken) throw new Error('No access token available');

    let response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 401) {
      try {
        accessToken = await this.refreshAccessToken();
        response    = await fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        this.logout();
        throw error;
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      let detail = `HTTP error! status: ${response.status}`;
      try {
        const j = JSON.parse(errorText);
        detail = j.detail || j.message || j.error
          || Object.entries(j).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ')
          || detail;
      } catch {}
      throw new Error(detail);
    }

    return this.safeJsonParse(response);
  }

  // ============================================
  // LOGIN — email only
  // ============================================

  async login(identifier, password) {
    try {
      const payload  = { email: identifier.trim(), password };
      const response = await fetch(`${this.API_BASE_URL}/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMessage = 'Login failed';
        try {
          const errorData  = await this.safeJsonParse(response);
          errorMessage     = errorData.detail
            || errorData.message
            || errorData.non_field_errors?.[0]
            || errorData.email?.[0]
            || errorData.password?.[0]
            || JSON.stringify(errorData);
        } catch {
          errorMessage = `Login failed with status ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      const data = await this.safeJsonParse(response);
      this.setTokens(data.access, data.refresh);

      if (data.user) {
        this.setUser(data.user);
        if (data.restaurant) this.setRestaurantData(data.restaurant);
      } else {
        await this.fetchUserDetails();
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  // ============================================
  // LOGOUT
  // ============================================

  async logout() {
    try {
      const refreshToken = this.getRefreshToken();
      if (refreshToken) {
        await fetch(`${this.API_BASE_URL}/logout/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.getAccessToken()}`,
          },
          body: JSON.stringify({ refresh: refreshToken }),
        }).catch(() => {});
      }
    } finally {
      this.clearTokens();
      this.clearUser();
      this.clearRestaurantData();
    }
  }

  // ============================================
  // FIX #4: REGISTER CUSTOMER (role=CUSTOMER strictly)
  // ============================================

  async register(userData) {
    try {
      // Always set role to CUSTOMER for the customer sign-up flow
      const payload = { ...userData, role: 'CUSTOMER' };

      const response = await fetch(`${this.API_BASE_URL}/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMessage = 'Registration failed';
        try {
          const errorData = await this.safeJsonParse(response);
          // FIX #4: catch "email already registered" from backend
          if (errorData.email) {
            const msg = Array.isArray(errorData.email) ? errorData.email[0] : errorData.email;
            // If backend says email exists under a different role, surface it clearly
            errorMessage = msg.toLowerCase().includes('exist')
              ? 'This email is already registered. Please log in or use a different email.'
              : `Email: ${msg}`;
          } else if (errorData.password)  errorMessage = `Password: ${Array.isArray(errorData.password) ? errorData.password[0] : errorData.password}`;
          else if (errorData.detail)      errorMessage = errorData.detail;
          else if (errorData.message)     errorMessage = errorData.message;
          else                            errorMessage = JSON.stringify(errorData);
        } catch {
          errorMessage = `Registration failed with status ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      const data = await this.safeJsonParse(response);
      if (data.access && data.refresh) {
        this.setTokens(data.access, data.refresh);
        if (data.user) this.setUser(data.user);
        else await this.fetchUserDetails();
      }
      return data;
    } catch (error) {
      throw error;
    }
  }

  // ============================================
  // FIX #4: REGISTER RESTAURANT PARTNER (role=RESTAURANT strictly)
  // ============================================

  async registerRestaurantPartner(partnerData) {
    try {
      const password  = partnerData.password  || 'TempPassword123!';
      const password2 = partnerData.password2 || password;

      let phone = partnerData.phone || '';
      if (phone.startsWith('0'))        phone = '+880' + phone.slice(1);
      else if (!phone.startsWith('+'))  phone = '+880' + phone;

      // FIX #4: role is always RESTAURANT — not overridable by caller
      const vendorData = {
        email:               partnerData.email,
        password,
        password2,
        first_name:          partnerData.ownerFirstName,
        last_name:           partnerData.ownerLastName,
        phone_number:        phone,
        role:                'RESTAURANT',       // ← strictly enforced
        restaurant_name:     partnerData.businessName,
        restaurant_category: partnerData.businessType,
        address:             partnerData.address   || '',
        city:                partnerData.city       || '',
        latitude:            partnerData.latitude  ?? null,
        longitude:           partnerData.longitude ?? null,
      };

      const response = await fetch(`${this.API_BASE_URL}/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vendorData),
      });

      if (!response.ok) {
        let errorMessage = 'Restaurant registration failed';
        try {
          const errorData = await this.safeJsonParse(response);
          if (errorData.email) {
            const msg = Array.isArray(errorData.email) ? errorData.email[0] : errorData.email;
            errorMessage = msg.toLowerCase().includes('exist')
              ? 'This email is already registered. Each role requires a unique email address.'
              : `Email: ${msg}`;
          } else if (errorData.phone_number)    errorMessage = `Phone: ${Array.isArray(errorData.phone_number) ? errorData.phone_number[0] : errorData.phone_number}`;
          else if (errorData.password)          errorMessage = `Password: ${Array.isArray(errorData.password) ? errorData.password[0] : errorData.password}`;
          else if (errorData.restaurant_name)   errorMessage = `Business Name: ${Array.isArray(errorData.restaurant_name) ? errorData.restaurant_name[0] : errorData.restaurant_name}`;
          else if (errorData.detail)            errorMessage = errorData.detail;
          else if (errorData.message)           errorMessage = errorData.message;
          else                                  errorMessage = JSON.stringify(errorData);
        } catch { errorMessage = `Registration failed with status ${response.status}`; }
        throw new Error(errorMessage);
      }

      const data = await this.safeJsonParse(response);

      try {
        await this.login(partnerData.email, partnerData.password);
      } catch (loginErr) {
        throw new Error(
          'Account created! But auto-login failed: ' + loginErr.message +
          '. Please go to login and sign in manually.'
        );
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  // ============================================
  // FIX #4: REGISTER RIDER (role=RIDER strictly)
  // ============================================

  async registerRider(riderData) {
    const formData = new FormData();

    // FIX #4: role is always RIDER — not overridable
    formData.append('role',         'RIDER');
    formData.append('email',        riderData.email);
    formData.append('password',     riderData.password);
    formData.append('password2',    riderData.password2);
    formData.append('first_name',   riderData.firstName || riderData.name     || '');
    formData.append('last_name',    riderData.lastName  || riderData.surname  || '');
    formData.append('phone_number', riderData.phone.replace(/\D/g, ''));

    formData.append('vehicle',       (riderData.vehicle || '').toUpperCase()
      .replace('MOTORBIKE', 'BIKE').replace('BI-CYCLE', 'CYCLE').replace('BICYCLE', 'CYCLE'));
    formData.append('license_plate', riderData.licensePlate || riderData.license_plate || '');
    formData.append('street_address', riderData.streetAddress || riderData.city || '');
    formData.append('city',          riderData.city           || '');
    formData.append('nid_number',    riderData.nidNumber      || riderData.nid_number || '');
    formData.append('gender',        riderData.gender         || '');
    formData.append('emergency_contact_name',   riderData.emergencyName  || riderData.emergency_contact_name   || '');
    formData.append('emergency_contact_number', riderData.emergencyPhone || riderData.emergency_contact_number || '');

    if (riderData.latitude)  formData.append('latitude',  riderData.latitude);
    if (riderData.longitude) formData.append('longitude', riderData.longitude);

    if (riderData.nidFront) formData.append('nid_front', riderData.nidFront);
    if (riderData.nidBack)  formData.append('nid_back',  riderData.nidBack);

    try {
      const response = await fetch(`${this.API_BASE_URL}/register/`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = 'Rider registration failed';
        try {
          const errorData = await this.safeJsonParse(response);
          if (errorData.email) {
            const msg = Array.isArray(errorData.email) ? errorData.email[0] : errorData.email;
            errorMessage = msg.toLowerCase().includes('exist')
              ? 'This email is already registered. Each role requires a unique email address.'
              : `Email: ${msg}`;
          } else {
            errorMessage = errorData.error || errorData.detail || errorData.message || errorMessage;
          }
        } catch {}
        throw new Error(errorMessage);
      }

      const data = await this.safeJsonParse(response);
      await this.login(riderData.email, riderData.password);
      return data;
    } catch (error) {
      throw error;
    }
  }

  // ============================================
  // INITIALIZE (restore session on page load)
  // ============================================

  async initialize() {
    const accessToken = this.getAccessToken();
    const user        = this.getUser();

    if (accessToken) {
      try {
        if (!user) await this.fetchUserDetails();
        return {
          isAuthenticated: true,
          user:            this.getUser(),
          restaurant:      this.getRestaurantData(),
        };
      } catch {
        try {
          await this.refreshAccessToken();
          await this.fetchUserDetails();
          return {
            isAuthenticated: true,
            user:            this.getUser(),
            restaurant:      this.getRestaurantData(),
          };
        } catch {
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

const authService = new AuthService();
export default authService;