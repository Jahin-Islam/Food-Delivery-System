import React, { useState } from 'react';
import './Checkout.css';
import Header from './Header.jsx';
import AllCarts from './AllCarts.jsx';

const Checkout = ({ 
  restaurant,
  cartItems = [],
  onBack,
  isLoggedIn,
  user,
  onLoginClick,
  onSignUpClick,
  onLogout,
  onPlaceOrder,
  allCartItems = [], // All cart items for the header cart display
  onCheckout // For navigating to other restaurant checkouts from cart
}) => {
  const [deliveryAddress, setDeliveryAddress] = useState('Road 71, Dhaka');
  const [streetNumber, setStreetNumber] = useState('');
  const [apartment, setApartment] = useState('');
  const [note, setNote] = useState('');
  const [addressLabel, setAddressLabel] = useState('home');
  const [contactlessDelivery, setContactlessDelivery] = useState(false);
  const [deliveryOption, setDeliveryOption] = useState('standard');
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [mobile, setMobile] = useState('');
  const [tipAmount, setTipAmount] = useState(0);
  const [saveTip, setSaveTip] = useState(false);
  const [showCart, setShowCart] = useState(false);

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryFee = deliveryOption === 'priority' ? 33 : 0; // Free standard delivery
  const serviceFee = 14;
  const total = subtotal + deliveryFee + serviceFee + tipAmount;
  const savings = 30; // Calculate from discounts

  const handlePlaceOrder = () => {
    const orderData = {
      restaurant,
      items: cartItems,
      deliveryAddress: {
        address: deliveryAddress,
        streetNumber,
        apartment,
        note,
        label: addressLabel
      },
      deliveryOption,
      contactlessDelivery,
      personalDetails: {
        firstName,
        lastName,
        email,
        mobile
      },
      tip: tipAmount,
      subtotal,
      deliveryFee,
      serviceFee,
      total
    };

    if (onPlaceOrder) {
      onPlaceOrder(orderData);
    } else {
      console.log('Order placed:', orderData);
      alert('Order placed successfully!');
    }
  };

  // Handle checkout from AllCarts sidebar
  const handleCheckoutFromCart = (restaurantId) => {
    setShowCart(false);
    if (onCheckout && restaurantId !== restaurant?.id) {
      // Navigate to different restaurant's checkout
      onCheckout(restaurantId);
    }
  };

  // Handle navigation to restaurant - not needed on checkout page
  const handleNavigateToRestaurant = (restaurantId) => {
    setShowCart(false);
    // Just close cart, user is already on checkout
  };

  return (
    <div className="checkout-container">
      <Header
        isLoggedIn={isLoggedIn}
        user={user}
        cartItems={allCartItems}
        onLoginClick={onLoginClick}
        onSignUpClick={onSignUpClick}
        onCartClick={() => setShowCart(!showCart)}
        onLogout={onLogout}
        showBanner={false}
      />

      <div className="checkout-content">
        <div className="checkout-main">
          {/* Page Title */}
          <h1 className="checkout-title">Review and place your order</h1>

          {/* Delivery Address Section */}
          <section className="checkout-section">
            <div className="section-header-checkout">
              <h2 className="section-title-checkout">Delivery address</h2>
              <button className="edit-btn">Edit</button>
            </div>

            {/* Map Placeholder */}
            <div className="map-container">
              <div className="map-placeholder">
                <div className="map-pin">📍</div>
                <p className="map-text">Map View</p>
              </div>
              <div className="address-display">
                <span className="location-icon">📍</span>
                <span className="address-text">{deliveryAddress}</span>
              </div>
            </div>

            {/* Address Details */}
            <div className="address-details">
              <p className="missing-info">We're missing your street - house number</p>
              
              <input
                type="text"
                placeholder="Street / house number"
                value={streetNumber}
                onChange={(e) => setStreetNumber(e.target.value)}
                className="address-input"
              />

              <input
                type="text"
                placeholder="Apartment #"
                value={apartment}
                onChange={(e) => setApartment(e.target.value)}
                className="address-input"
              />

              <textarea
                placeholder="Note to rider - e.g. building, landmark"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="address-textarea"
                rows={3}
              />

              {/* Address Labels */}
              <div className="address-labels">
                <p className="label-title">Add a Label</p>
                <div className="label-options">
                  <button
                    className={`label-btn ${addressLabel === 'home' ? 'active' : ''}`}
                    onClick={() => setAddressLabel('home')}
                  >
                    🏠 Home
                  </button>
                  <button
                    className={`label-btn ${addressLabel === 'work' ? 'active' : ''}`}
                    onClick={() => setAddressLabel('work')}
                  >
                    💼 Work
                  </button>
                  <button
                    className={`label-btn ${addressLabel === 'partner' ? 'active' : ''}`}
                    onClick={() => setAddressLabel('partner')}
                  >
                    ❤️ Partner
                  </button>
                  <button
                    className={`label-btn ${addressLabel === 'other' ? 'active' : ''}`}
                    onClick={() => setAddressLabel('other')}
                  >
                    ➕ Other
                  </button>
                </div>
              </div>

              <button className="save-continue-btn" onClick={() => {}}>
                Save and continue
              </button>

              {/* Contactless Delivery */}
              <div className="contactless-option">
                <span>Contactless delivery</span>
                <label className="toggle-switch-checkout">
                  <input
                    type="checkbox"
                    checked={contactlessDelivery}
                    onChange={(e) => setContactlessDelivery(e.target.checked)}
                  />
                  <span className="toggle-slider-checkout"></span>
                </label>
              </div>
            </div>
          </section>

          {/* Delivery Options */}
          <section className="checkout-section">
            <h2 className="section-title-checkout">Delivery options</h2>
            
            <div className="delivery-options">
              <label className="delivery-option-card">
                <input
                  type="radio"
                  name="delivery"
                  value="standard"
                  checked={deliveryOption === 'standard'}
                  onChange={(e) => setDeliveryOption(e.target.value)}
                />
                <div className="option-content">
                  <div className="option-info">
                    <span className="option-label">Standard</span>
                    <span className="option-time">15 - 30 mins</span>
                  </div>
                </div>
              </label>

              <label className="delivery-option-card">
                <input
                  type="radio"
                  name="delivery"
                  value="priority"
                  checked={deliveryOption === 'priority'}
                  onChange={(e) => setDeliveryOption(e.target.value)}
                />
                <div className="option-content">
                  <div className="option-info">
                    <span className="option-label">Priority</span>
                    <span className="option-time">10 - 25 mins</span>
                  </div>
                  <span className="option-price">+ ৳33</span>
                </div>
              </label>
            </div>
          </section>

          {/* Personal Details */}
          <section className="checkout-section">
            <div className="section-header-checkout">
              <h2 className="section-title-checkout">Personal details</h2>
              <button className="cancel-btn">Cancel</button>
            </div>

            <div className="personal-details-form">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="personal-input"
              />

              <div className="name-row">
                <input
                  type="text"
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="personal-input half"
                />
                <input
                  type="text"
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="personal-input half"
                />
              </div>

              <input
                type="tel"
                placeholder="Mobile number"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="personal-input"
              />
            </div>
          </section>

          {/* Tip Your Rider */}
          <section className="checkout-section">
            <h2 className="section-title-checkout">Tip your rider</h2>
            <p className="section-subtitle-checkout">Your rider receives 100% of the tip</p>

            <div className="tip-options">
              <button
                className={`tip-btn ${tipAmount === 0 ? 'active' : ''}`}
                onClick={() => setTipAmount(0)}
              >
                Not now
              </button>
              <button
                className={`tip-btn ${tipAmount === 10 ? 'active' : ''}`}
                onClick={() => setTipAmount(10)}
              >
                Tk 10
              </button>
              <button
                className={`tip-btn ${tipAmount === 20 ? 'active' : ''}`}
                onClick={() => setTipAmount(20)}
              >
                Tk 20
              </button>
              <button
                className={`tip-btn ${tipAmount === 30 ? 'active' : ''}`}
                onClick={() => setTipAmount(30)}
              >
                Tk 30
              </button>
              <button
                className={`tip-btn ${tipAmount === 50 ? 'active' : ''}`}
                onClick={() => setTipAmount(50)}
              >
                Tk 50
              </button>
            </div>

            <p className="tip-note">More common</p>

            <div className="save-tip-option">
              <input
                type="checkbox"
                id="saveTip"
                checked={saveTip}
                onChange={(e) => setSaveTip(e.target.checked)}
              />
              <label htmlFor="saveTip">Save it for the next order</label>
            </div>
          </section>

          {/* Place Order Button */}
          <button className="place-order-btn" onClick={handlePlaceOrder}>
            Place order
          </button>

          <p className="terms-text">
            By making this purchase you agree to our{' '}
            <a href="#">terms and conditions</a>.
          </p>
          <p className="terms-text">
            I agree that placing the order places the order under an obligation to make a payment in accordance with the{' '}
            <a href="#">General Terms and Conditions</a>.
          </p>
        </div>

        {/* Order Summary Sidebar */}
        <aside className="order-summary-sidebar">
          <h3 className="summary-title">Your order from</h3>
          <p className="restaurant-name-summary">{restaurant?.name || 'Restaurant'}</p>

          <div className="summary-items">
            {cartItems.map((item) => (
              <div key={item.id} className="summary-item">
                <span className="item-qty">{item.quantity} ×</span>
                <span className="item-name-summary">{item.name}</span>
                <span className="item-price-summary">৳{item.price * item.quantity}</span>
              </div>
            ))}
          </div>

          <div className="summary-divider"></div>

          <div className="summary-totals">
            <div className="summary-row">
              <span>Subtotal</span>
              <span>৳{subtotal}</span>
            </div>
            <div className="summary-row">
              <span>Standard delivery</span>
              <span className="free-text">{deliveryFee === 0 ? 'Free' : `৳${deliveryFee}`}</span>
            </div>
            <div className="summary-row">
              <span>Service fee</span>
              <span>৳{serviceFee}</span>
            </div>
            {tipAmount > 0 && (
              <div className="summary-row">
                <span>Tip</span>
                <span>৳{tipAmount}</span>
              </div>
            )}
          </div>

          <div className="summary-divider"></div>

          <div className="summary-total">
            <div className="total-row-checkout">
              <span className="total-label-checkout">Total</span>
              <span className="total-amount-checkout">৳{total}</span>
            </div>
            <p className="tax-note">(incl. fees and tax)</p>
            {savings > 0 && (
              <p className="savings-note">৳{savings} savings</p>
            )}
          </div>
        </aside>
      </div>

      {/* All Carts Sidebar */}
      <AllCarts
        isOpen={showCart}
        onClose={() => setShowCart(false)}
        cartItems={allCartItems}
        onCheckout={handleCheckoutFromCart}
        onNavigateToRestaurant={handleNavigateToRestaurant}
      />
    </div>
  );
};

export default Checkout;