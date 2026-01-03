import { useState } from 'react';
import './log_in_page.css';

const SignIn = ({ onSwitchToSignUp }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    remember: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({
    email: false,
    password: false
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: false }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    let isValid = true;
    const newErrors = { email: false, password: false };
    
    if (formData.email.length < 3) {
      newErrors.email = true;
      isValid = false;
    }
    
    if (formData.password.length < 6) {
      newErrors.password = true;
      isValid = false;
    }
    
    setErrors(newErrors);
    
    if (isValid) {
      alert(`Sign in successful!\nEmail/Mobile: ${formData.email}\nRemember me: ${formData.remember ? 'Yes' : 'No'}`);
      // Here you would typically make an API call to authenticate the user
    }
  };

  const handleSocialSignIn = (provider) => {
    alert(`${provider} Sign In clicked! This would integrate with ${provider} OAuth.`);
    // Here you would integrate with OAuth providers
  };

  const handleForgotPassword = () => {
    alert('Forgot Password clicked! This would open a password reset flow.');
    // Here you would implement password reset functionality
  };

  return (
    <div className="signin-container">
      {/* Left Side - Logo and Content */}
      <div className="signin-left-side">
        <div className="signin-logo-section">
          <div className="signin-logo">YourLogo</div>
          <h2 className="signin-tagline">Welcome Back!</h2>
          <p className="signin-description">
            Continue your journey with us. Access your account to manage 
            your projects, connect with your team, and achieve your goals 
            with powerful tools at your fingertips.
          </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="signin-right-side">
        <div className="signin-card">
          <div className="signin-header">
            <h1>Sign In</h1>
            <p>Enter your credentials to continue</p>
          </div>

          <div className="signin-social-buttons">
            <button className="signin-social-btn" onClick={() => handleSocialSignIn('Google')}>
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </button>
            <button className="signin-social-btn" onClick={() => handleSocialSignIn('Facebook')}>
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Facebook
            </button>
          </div>

          <div className="signin-divider">
            <span>OR</span>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="signin-form-group">
              <label htmlFor="email">Email or Mobile</label>
              <input
                type="text"
                id="email"
                name="email"
                placeholder="Enter email or mobile number"
                value={formData.email}
                onChange={handleChange}
                required
              />
              <div className={`signin-error-message ${errors.email ? 'show' : ''}`}>
                Please enter a valid email or mobile number
              </div>
            </div>

            <div className="signin-form-group">
              <label htmlFor="password">Password</label>
              <div className="signin-password-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                <span
                  className="signin-toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? 'HIDE' : 'SHOW'}
                </span>
              </div>
              <div className={`signin-error-message ${errors.password ? 'show' : ''}`}>
                Password must be at least 6 characters
              </div>
            </div>

            <div className="signin-form-options">
              <div className="signin-remember-me">
                <input
                  type="checkbox"
                  id="remember"
                  name="remember"
                  checked={formData.remember}
                  onChange={handleChange}
                />
                <label htmlFor="remember">Remember me</label>
              </div>
              <span className="signin-forgot-password" onClick={handleForgotPassword}>
                Forgot Password?
              </span>
            </div>

            <button type="submit" className="signin-submit-btn">
              Sign In
            </button>
          </form>

          <div className="signin-signup-link">
            Don't have an account? <a onClick={onSwitchToSignUp}>Sign Up</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignIn;