import { useState } from 'react';
import authService from '../Authservice.js';
import './log_in_page.css';

const SignIn = ({ onSwitchToSignUp, onLoginSuccess }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      const result = await authService.login(formData.email, formData.password);
      console.log('Login result:', result);
      
      // Login successful - authService already stores tokens
      // Call success callback
      if (onLoginSuccess) {
        onLoginSuccess(authService.getUser());
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signin-container">
      <div className="signin-left-side">
        <div className="signin-logo-section">
          <div className="signin-logo">foodpanda</div>
          <div className="signin-tagline">It's the food and groceries you love, delivered</div>
          <div className="signin-description">
            Order from your favorite restaurants and shops, or discover new ones near you.
          </div>
        </div>
      </div>

      <div className="signin-right-side">
        <div className="signin-card">
          <div className="signin-header">
            <h1>Welcome Back!</h1>
            <p>Sign in to continue to foodpanda</p>
          </div>

          {error && (
            <div className="signin-error-message show">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="signin-form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
                required
              />
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
                  disabled={loading}
                  required
                />
                <span
                  className="signin-toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? 'HIDE' : 'SHOW'}
                </span>
              </div>
            </div>

            <div className="signin-form-options">
              <div className="signin-remember-me">
                <input type="checkbox" id="remember" />
                <label htmlFor="remember">Remember me</label>
              </div>
              <a href="#" className="signin-forgot-password" onClick={(e) => e.preventDefault()}>
                Forgot Password?
              </a>
            </div>

            <button 
              type="submit" 
              className="signin-submit-btn"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="signin-signup-link">
            Don't have an account?{' '}
            <a onClick={onSwitchToSignUp}>Sign Up</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignIn;