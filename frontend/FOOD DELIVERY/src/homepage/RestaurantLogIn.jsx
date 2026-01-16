import { useState } from 'react';
import './RestaurantLogin.css';

const RestaurantLogin = ({ onSwitchToSignUp, onLoginSuccess }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState('email'); // 'email' or 'phone'

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = () => {
    if (formData.email && formData.password) {
      onLoginSuccess({
        email: formData.email,
        type: 'restaurant_partner'
      });
    } else {
      alert('Please fill in all fields');
    }
  };

  const handleGoogleSignIn = () => {
    onLoginSuccess({
      email: 'tkossboss@gmail.com',
      provider: 'google',
      type: 'restaurant_partner'
    });
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
                  <div className="menu-item">🥤</div>
                  <div className="menu-item">🍔</div>
                  <div className="menu-item">🍦</div>
                </div>
                <div className="computer-stand"></div>
              </div>
              <div className="utensils">
                <div className="fork-left">🍴</div>
                <div className="fork-right">🍴</div>
              </div>
            </div>
          </div>

          {/* Hero Content */}
          <div className="hero-content">
            <h1 className="hero-title">Transform your business with Panda Partner</h1>
            
            <div className="hero-features">
              <div className="feature-item">
                <div className="feature-icon">📊</div>
                <p className="feature-text">
                  Track performance and get invaluable insights to improve customer loyalty and sales.
                </p>
              </div>
              
              <div className="feature-item">
                <div className="feature-icon">📢</div>
                <p className="feature-text">
                  Offer discounts and launch ad campaigns to attract new customers.
                </p>
              </div>
              
              <div className="feature-item">
                <div className="feature-icon">⚙️</div>
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
            <span className="globe-icon">🌐</span>
            <span>EN</span>
          </button>
        </div>

        <div className="restaurant-login-card">
          <h2 className="login-title">Log in with your email</h2>

          <div className="login-form">
            {loginMethod === 'email' ? (
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
                      {showPassword ? '👁️' : '👁️'}
                    </button>
                  </div>
                </div>

                <div className="forgot-password-link">
                  <a onClick={handleForgotPassword}>Forgot password?</a>
                </div>

                <button onClick={handleSubmit} className="login-btn">
                  Log in
                </button>

                <div className="divider">
                  <span>OR</span>
                </div>

                <button 
                  className="phone-login-btn"
                  onClick={() => setLoginMethod('phone')}
                >
                  <span className="phone-icon">📱</span>
                  Log in with phone number
                </button>
              </>
            ) : (
              <>
                <div className="form-group">
                  <div className="phone-input">
                    <span className="country-code">+880</span>
                    <input
                      type="tel"
                      placeholder="Phone number"
                      name="phone"
                    />
                  </div>
                </div>

                <button onClick={handleSubmit} className="login-btn">
                  Log in
                </button>

                <div className="divider">
                  <span>OR</span>
                </div>

                <button 
                  className="phone-login-btn"
                  onClick={() => setLoginMethod('email')}
                >
                  ✉️ Log in with email
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
                  <span className="signin-as">Sign in as JOY</span>
                  <span className="google-email">tkossboss@gmail.com</span>
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