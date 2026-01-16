import { useState } from 'react';
import './RestaurantSignUp.css';

const RestaurantPartnerSignUp = ({ onSwitchToLogin, onRiderSignUp, onSignUpSuccess }) => {
  const [formData, setFormData] = useState({
    businessName: '',
    ownerFirstName: '',
    ownerLastName: '',
    businessType: '',
    email: '',
    phone: '',
    sameAsPhone: false,
    whatsappUpdates: true
  });

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

  const handleSubmit = () => {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // Validate phone format (11 digits for Bangladesh)
    const phoneRegex = /^\d{11}$/;

    if (!formData.businessName || !formData.ownerFirstName || !formData.ownerLastName || 
        !formData.businessType || !formData.email || !formData.phone) {
      alert('Please fill in all required fields');
      return;
    }

    if (!emailRegex.test(formData.email)) {
      alert('Please enter a valid email address');
      return;
    }

    if (!phoneRegex.test(formData.phone)) {
      alert('Please enter a valid phone number (11 digits)');
      return;
    }

    onSignUpSuccess({
      businessName: formData.businessName,
      email: formData.email,
      type: 'restaurant_partner'
    });
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
              <span className="benefit-icon">🍽️</span>
              <span className="benefit-text">Reach thousands of customers</span>
            </div>
            <div className="benefit-item">
              <span className="benefit-icon">📱</span>
              <span className="benefit-text">Easy order management</span>
            </div>
            <div className="benefit-item">
              <span className="benefit-icon">💰</span>
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
                <a href="#" onClick={onRiderSignUp}>Click here</a>
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