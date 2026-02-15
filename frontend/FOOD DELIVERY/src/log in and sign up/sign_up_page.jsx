import { useState } from 'react';
import authService from '../Authservice.js';
import './sign_up_page.css';

const SignUp = ({ onSwitchToSignIn, onSignUpSuccess }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    password2: '',
    first_name: '',
    last_name: '',
    phone_number: ''
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

    if (!formData.email || !formData.password || !formData.password2 || 
        !formData.first_name || !formData.last_name || !formData.phone_number) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.password2) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);

    try {
      const userData = {
        email: formData.email,
        password: formData.password,
        password2: formData.password2,
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone_number: formData.phone_number
      };

      const result = await authService.register(userData);
      console.log('Registration result:', result);
      
      // Registration successful - authService already stores tokens
      if (onSignUpSuccess) {
        onSignUpSuccess(authService.getUser());
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-left-side">
        <div className="signup-logo-section">
          <div className="signup-logo">foodpanda</div>
          <div className="signup-tagline">It's the food and groceries you love, delivered</div>
          <div className="signup-description">
            Join thousands of happy customers and enjoy delicious meals delivered to your doorstep.
          </div>
        </div>
      </div>

      <div className="signup-right-side">
        <div className="signup-card">
          <div className="signup-header">
            <h1>Create Account</h1>
            <p>Join foodpanda today</p>
          </div>

          {error && (
            <div className="signin-error-message show">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="signup-form-group">
              <label htmlFor="first_name">First Name *</label>
              <input
                type="text"
                id="first_name"
                name="first_name"
                placeholder="First name"
                value={formData.first_name}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </div>

            <div className="signup-form-group">
              <label htmlFor="last_name">Last Name *</label>
              <input
                type="text"
                id="last_name"
                name="last_name"
                placeholder="Last name"
                value={formData.last_name}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </div>

            <div className="signup-form-group">
              <label htmlFor="email">Email Address *</label>
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

            <div className="signup-form-group">
              <label htmlFor="phone_number">Phone Number *</label>
              <input
                type="tel"
                id="phone_number"
                name="phone_number"
                placeholder="+880 1712345678"
                value={formData.phone_number}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </div>

            <div className="signup-form-group">
              <label htmlFor="password">Password *</label>
              <div className="signup-password-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  placeholder="Create a password (min. 8 characters)"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                  required
                />
                <span
                  className="signup-toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? 'HIDE' : 'SHOW'}
                </span>
              </div>
            </div>

            <div className="signup-form-group">
              <label htmlFor="password2">Confirm Password *</label>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password2"
                name="password2"
                placeholder="Re-enter your password"
                value={formData.password2}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </div>

            <div className="signup-checkbox-group">
              <input type="checkbox" id="terms" required />
              <label htmlFor="terms">
                I agree to the <a href="#">Terms & Conditions</a>
              </label>
            </div>

            <button 
              type="submit" 
              className="signup-submit-btn"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>

          <div className="signup-signin-link">
            Already have an account?{' '}
            <a onClick={onSwitchToSignIn}>Sign In</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;