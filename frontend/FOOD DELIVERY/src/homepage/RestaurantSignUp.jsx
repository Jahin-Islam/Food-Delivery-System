import { useState } from 'react';
import './RestaurantSignUp.css';
import authService from '../Authservice.js';

const RestaurantPartnerSignUp = ({ onSwitchToLogin, onRiderSignUp, onSignUpSuccess }) => {
  const [formData, setFormData] = useState({
    businessName: '',
    ownerFirstName: '',
    ownerLastName: '',
    businessType: '',
    email: '',
    phone: '',
    password: '',
    password2: '',
    role: 'RESTAURANT',
    sameAsPhone: false,
    whatsappUpdates: true
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);

  const businessTypes = [
    'Restaurant',
    'Cafe',
    'Fast Food',
    'Bakery',
    'Dessert Shop',
    'Cloud Kitchen',
    'Food Truck',
    'Catering Service'
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async () => {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // Validate phone format (10 or 11 digits for Bangladesh, typed after +880 prefix)
    const phoneRegex = /^\d{10,11}$/;

    if (!formData.businessName || !formData.ownerFirstName || !formData.ownerLastName || 
        !formData.businessType || !formData.email || !formData.phone ||
        !formData.password || !formData.password2) {
      alert('Please fill in all required fields');
      return;
    }

    if (!emailRegex.test(formData.email)) {
      alert('Please enter a valid email address');
      return;
    }

    if (!phoneRegex.test(formData.phone)) {
      alert('Please enter a valid phone number (10 or 11 digits after +880)');
      return;
    }

    if (formData.password.length < 8) {
      alert('Password must be at least 8 characters');
      return;
    }

    if (formData.password !== formData.password2) {
      alert('Passwords do not match');
      return;
    }

    try {
      // Call backend API for restaurant registration
      const response = await authService.registerRestaurantPartner({
        businessName: formData.businessName,
        ownerFirstName: formData.ownerFirstName,
        ownerLastName: formData.ownerLastName,
        businessType: formData.businessType,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: 'RESTAURANT',
        password2: formData.password2   // ← pass actual confirm password
      });

      console.log('Registration successful:', response);

      // Success - pass restaurant data to parent
      onSignUpSuccess({
        businessName: formData.businessName,
        email: formData.email,
        type: 'restaurant_partner',
        user: response.user,
        restaurant: response.restaurant
      });
    } catch (error) {
      console.error('Registration error:', error);
      alert(`Registration failed: ${error.message}`);
    }
  };

  return (
    <div className="restaurant-signup-container">
      {/* Left Side - Hero */}
      <div className="restaurant-signup-left">
        <div className="restaurant-hero-content">
          <div className="restaurant-logo">foodpanda</div>
          
          <h1 className="restaurant-hero-title">
            Register your restaurant with us!
          </h1>
          
          <p className="restaurant-hero-subtitle">
            Sign up easily, showcase your menu, and you can start reaching new customers
          </p>
          
          <div className="restaurant-benefits">
            <div className="benefit-item">
              <span className="benefit-icon"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg></span>
              <span className="benefit-text">Reach thousands of customers</span>
            </div>
            <div className="benefit-item">
              <span className="benefit-icon"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg></span>
              <span className="benefit-text">Easy order management</span>
            </div>
            <div className="benefit-item">
              <span className="benefit-icon"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="1" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></span>
              <span className="benefit-text">Grow your revenue</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="restaurant-signup-right">
        <div className="restaurant-signup-card">
          <div className="restaurant-signup-header">
            <h2>Ready to boost your sales?</h2>
            <p>Join our platform and expand your business</p>
          </div>

          <div className="restaurant-signup-form">
            {/* Business Name */}
            <div className="form-group">
              <label htmlFor="businessName">Your Business Name *</label>
              <input
                type="text"
                id="businessName"
                name="businessName"
                placeholder="Enter your business name"
                value={formData.businessName}
                onChange={handleChange}
              />
            </div>

            {/* First and Last Name Row */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="ownerFirstName">Business Owner First Name *</label>
                <input
                  type="text"
                  id="ownerFirstName"
                  name="ownerFirstName"
                  placeholder="First name"
                  value={formData.ownerFirstName}
                  onChange={handleChange}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="ownerLastName">Business Owner Last Name *</label>
                <input
                  type="text"
                  id="ownerLastName"
                  name="ownerLastName"
                  placeholder="Last name"
                  value={formData.ownerLastName}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Business Type */}
            <div className="form-group">
              <label htmlFor="businessType">Business type *</label>
              <select
                id="businessType"
                name="businessType"
                value={formData.businessType}
                onChange={handleChange}
              >
                <option value="">Select business type</option>
                {businessTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Email */}
            <div className="form-group">
              <label htmlFor="email">Enter your Business Email *</label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="business@example.com"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            {/* Password */}
            <div className="form-group">
              <label htmlFor="password">Password *</label>
              <div className="phone-input-wrapper" style={{position: 'relative'}}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  placeholder="Min. 8 characters"
                  value={formData.password}
                  onChange={handleChange}
                  style={{paddingRight: '44px'}}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:'18px'}}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="form-group">
              <label htmlFor="password2">Confirm Password *</label>
              <div className="phone-input-wrapper" style={{position: 'relative'}}>
                <input
                  type={showPassword2 ? 'text' : 'password'}
                  id="password2"
                  name="password2"
                  placeholder="Re-enter your password"
                  value={formData.password2}
                  onChange={handleChange}
                  style={{paddingRight: '44px'}}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword2(!showPassword2)}
                  style={{position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:'18px'}}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
              </div>
            </div>

            {/* Phone */}
            <div className="form-group">
              <label htmlFor="phone">Mobile phone number *</label>
              <div className="phone-input-wrapper">
                <span className="country-code">+880</span>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  placeholder="1712345678"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Checkboxes */}
            <div className="checkbox-group">
              <input
                type="checkbox"
                id="sameAsPhone"
                name="sameAsPhone"
                checked={formData.sameAsPhone}
                onChange={handleChange}
              />
              <label htmlFor="sameAsPhone">
                My Business Phone is the same as my Mobile Number
              </label>
            </div>

            <div className="checkbox-group whatsapp-checkbox">
              <input
                type="checkbox"
                id="whatsappUpdates"
                name="whatsappUpdates"
                checked={formData.whatsappUpdates}
                onChange={handleChange}
              />
              <label htmlFor="whatsappUpdates">
                I'd like to get updates & promotions by{' '}
                <span className="whatsapp-text">WhatsApp</span>
              </label>
            </div>

            {/* Register Button */}
            <button onClick={handleSubmit} className="register-btn">
              Register
            </button>

            {/* Footer Links */}
            <div className="form-footer">
              <p className="login-link">
                Already have an account?{' '}
                <a onClick={onSwitchToLogin}>Login</a>
              </p>
              <p className="rider-link">
                Do you want to be a foodpanda rider?{' '}
                <a href="#" onClick={(e) => { e.preventDefault(); onRiderSignUp(); }}>Click here</a>
              </p>
              <p className="terms-text">
                This site is protected by reCAPTCHA and the Google Privacy Policy and Terms of Service apply.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantPartnerSignUp;