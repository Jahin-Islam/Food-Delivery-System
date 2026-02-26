import { useState } from 'react';
import './RestaurantLogIn.css';
import authService from '../Authservice.js';

const RestaurantLogin = ({ onSwitchToSignUp, onLoginSuccess }) => {
  const [loginMode, setLoginMode] = useState('email'); // 'email' | 'phone'
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    phone: '',
    phonePassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showPhonePassword, setShowPhonePassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async () => {
    const isPhone = loginMode === 'phone';
    const identifier = isPhone ? formData.phone : formData.email;
    const password = isPhone ? formData.phonePassword : formData.password;

    if (!identifier || !password) {
      alert('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.login(identifier, password, isPhone ? 'phone' : 'email');
      
      console.log('Login response:', response);

      // Check role from every possible field the backend might return
      const role = (
        response.role ||
        response.user?.role ||
        response.user?.user_type ||
        ''
      ).toString().toUpperCase();

      const hasRestaurantData = !!(response.restaurant || authService.getRestaurantData());
      const isVendor = role === 'RESTAURANT' || role === 'VENDOR' || hasRestaurantData;

      console.log('Role check:', { role, hasRestaurantData, isVendor });

      if (!isVendor) {
        // Don't block login — maybe backend just doesn't return role in login response
        // Try fetching user details to get role
        const userDetails = await authService.fetchUserDetails();
        const detailedRole = (
          userDetails?.role ||
          userDetails?.user_type ||
          authService.getUser()?.role ||
          authService.getUser()?.user_type ||
          ''
        ).toString().toUpperCase();

        console.log('Detailed role from user endpoint:', detailedRole);

        const isVendorFromDetails = detailedRole === 'RESTAURANT' || detailedRole === 'VENDOR' || !!authService.getRestaurantData();

        if (!isVendorFromDetails) {
          alert('This account is not a restaurant partner account. Please check your credentials or sign up.');
          await authService.logout();
          setLoading(false);
          return;
        }
      }

      // Success
      onLoginSuccess({
        type: 'restaurant_partner',
        user: authService.getUser(),
        restaurant: response.restaurant || authService.getRestaurantData()
      });
    } catch (error) {
      console.error('Login error:', error);
      alert(`Login failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    // TODO: Implement Google OAuth
    alert('Google Sign-In not yet implemented. Please use email/password login.');
  };

  const handleForgotPassword = () => {
    alert('Password reset functionality would be implemented here');
  };

  return (
    <div className="restaurant-login-container">
      {/* Left Side - Hero */}
      <div className="restaurant-login-left">
        <div className="restaurant-login-hero">
          {/* Illustration */}
          <div className="hero-illustration">
            <div className="shop-computer">
              <div className="computer-screen">
                <div className="awning"></div>
                <div className="screen-content">
                  
                  
                  
                </div>
                <div className="computer-stand"></div>
              </div>
              <div className="utensils">
                
                
              </div>
            </div>
          </div>

          {/* Hero Content */}
          <div className="hero-content">
            <h1 className="hero-title">Transform your business with Panda Partner</h1>
            
            <div className="hero-features">
              <div className="feature-item">
                <div className="feature-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg></div>
                <p className="feature-text">
                  Track performance and get invaluable insights to improve customer loyalty and sales.
                </p>
              </div>
              
              <div className="feature-item">
                <div className="feature-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg></div>
                <p className="feature-text">
                  Offer discounts and launch ad campaigns to attract new customers.
                </p>
              </div>
              
              <div className="feature-item">
                <div className="feature-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg></div>
                <p className="feature-text">
                  Manage your menu and opening times more easily, so they're always up to date.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="restaurant-login-right">
        <div className="restaurant-login-header">
          <div className="partner-logo">
            <span className="logo-panda">panda</span>
            <span className="logo-partner">partner</span>
          </div>
          <button className="language-btn">
            <span className="globe-icon"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg></span>
            <span>EN</span>
          </button>
        </div>

        <div className="restaurant-login-card">
          <h2 className="login-title">
            {loginMode === 'email' ? 'Log in with your email' : 'Log in with your phone'}
          </h2>

          {/* Toggle between Email and Phone login */}
          <div className="login-mode-toggle">
            <button
              className={`mode-toggle-btn ${loginMode === 'email' ? 'active' : ''}`}
              onClick={() => setLoginMode('email')}
              type="button"
            >
              Email
            </button>
            <button
              className={`mode-toggle-btn ${loginMode === 'phone' ? 'active' : ''}`}
              onClick={() => setLoginMode('phone')}
              type="button"
            >
              Phone Number
            </button>
          </div>

          <div className="login-form">
            {loginMode === 'email' ? (
              <>
                <div className="form-group">
                  <input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <div className="password-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      name="password"
                      placeholder="Password"
                      value={formData.password}
                      onChange={handleChange}
                    />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                  </div>
                </div>

                <div className="forgot-password-link">
                  <a onClick={handleForgotPassword}>Forgot password?</a>
                </div>

                <button onClick={handleSubmit} className="login-btn" disabled={loading}>
                  {loading ? 'Logging in...' : 'Log in'}
                </button>
              </>
            ) : (
              <>
                <div className="form-group">
                  <div className="phone-input-wrapper">
                    <span className="country-code">+880</span>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      placeholder="1712345678"
                      value={formData.phone}
                      onChange={handleChange}
                      className="phone-field"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <div className="password-wrapper">
                    <input
                      type={showPhonePassword ? 'text' : 'password'}
                      id="phonePassword"
                      name="phonePassword"
                      placeholder="Password"
                      value={formData.phonePassword}
                      onChange={handleChange}
                    />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => setShowPhonePassword(!showPhonePassword)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                  </div>
                </div>

                <div className="forgot-password-link">
                  <a onClick={handleForgotPassword}>Forgot password?</a>
                </div>

                <button onClick={handleSubmit} className="login-btn" disabled={loading}>
                  {loading ? 'Logging in...' : 'Log in'}
                </button>
              </>
            )}

            <button className="google-signin-btn" onClick={handleGoogleSignIn}>
              <div className="google-account-info">
                <div className="google-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </div>
                <div className="google-account-details">
                  <span className="signin-as">Sign in with Google</span>
                  <span className="google-email">Not yet implemented</span>
                </div>
              </div>
              <div className="google-g-icon">G</div>
            </button>

            <p className="privacy-text">
              By continuing you acknowledge that your personal data will be processed in accordance with the{' '}
              <a href="#">Privacy Statement</a>.
            </p>
          </div>
        </div>

        <div className="signup-footer">
          <p>
            No account? <a onClick={onSwitchToSignUp}>Partner with Foodpanda</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RestaurantLogin;