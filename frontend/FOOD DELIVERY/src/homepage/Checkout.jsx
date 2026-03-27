import React, { useState, useEffect, useRef } from 'react';
import './Checkout.css';
import { COLORS, SHADOWS } from '../constants.js';
import Header from './Header.jsx';
import AllCarts from './AllCarts.jsx';
import DeliveryMapPicker from './DeliveryMapPicker.jsx';
import { MapPin, Home, Briefcase, Heart, Plus } from 'lucide-react';
import authService from '../Authservice.js';

const API_BASE = 'http://127.0.0.1:8000/api/customers';

// ─── Address API helpers ───────────────────────────────────────────────────────

async function fetchAddresses() {
  return authService.authenticatedFetch(`${API_BASE}/me/addresses/`);
}

async function createAddress(payload) {
  return authService.authenticatedFetch(`${API_BASE}/me/addresses/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

async function updateAddress(addressId, payload) {
  return authService.authenticatedFetch(`${API_BASE}/me/addresses/${addressId}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

// Map label button value → backend address_type
const LABEL_TO_TYPE = {
  home:    'HOME',
  work:    'WORK',
  partner: 'PARTNER',
  other:   'OTHER',
};

// ─── Component ────────────────────────────────────────────────────────────────

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
  allCartItems = [],
  onCheckout,
  onProfileClick,
  onOrdersClick,
  onLogoClick,
  currentAddress,
  onAddressChange,
}) => {
  // ── Address form state ──
  const [deliveryAddress, setDeliveryAddress] = useState(currentAddress || '');
  const [streetNumber,    setStreetNumber]    = useState('');
  const [apartment,       setApartment]       = useState('');
  const [note,            setNote]            = useState('');
  const [addressLabel,    setAddressLabel]    = useState('home');
  const [deliveryLatLng,  setDeliveryLatLng]  = useState({ lat: null, lng: null });

  // ── Saved addresses from backend ──
  // savedAddresses: array of address objects keyed by address_type
  const [savedAddresses,  setSavedAddresses]  = useState([]);   // raw list from API
  const [addressLoading,  setAddressLoading]  = useState(false);
  const [addressSaving,   setAddressSaving]   = useState(false);
  const [addressMsg,      setAddressMsg]      = useState('');   // success / error feedback

  // Track what was last saved/loaded for the current label so we can detect changes
  const savedStateRef = useRef(null); // { street_number, apartment_number, description, latitude, longitude }

  // ── Other checkout state ──
  const [contactlessDelivery, setContactlessDelivery] = useState(false);
  const [deliveryOption,      setDeliveryOption]      = useState('standard');
  const [firstName,           setFirstName]           = useState(user?.first_name || '');
  const [lastName,            setLastName]            = useState(user?.last_name  || '');
  const [email,               setEmail]               = useState(user?.email      || '');
  const [mobile,              setMobile]              = useState('');
  const [tipAmount,           setTipAmount]           = useState(0);
  const [saveTip,             setSaveTip]             = useState(false);
  const [showCart,            setShowCart]            = useState(false);

  // ── Totals ──
  const subtotal           = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee        = deliveryOption === 'priority' ? 33 : 0;
  const serviceFee         = 14;
  const discounts          = restaurant?.discounts || [];
  const applicableDiscount = discounts
    .filter(d => d.is_active !== false && subtotal >= (parseFloat(d.min_order) || 0))
    .sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage))[0] || null;
  const discountAmount     = applicableDiscount
    ? Math.round(subtotal * parseFloat(applicableDiscount.percentage) / 100) : 0;
  const total   = subtotal - discountAmount + deliveryFee + serviceFee + tipAmount;
  const savings = discountAmount;

  // ── Load all saved addresses on mount ──────────────────────────────────────
  useEffect(() => {
    if (!isLoggedIn) return;
    setAddressLoading(true);
    fetchAddresses()
      .then(data => {
        setSavedAddresses(Array.isArray(data) ? data : []);
      })
      .catch(() => setSavedAddresses([]))
      .finally(() => setAddressLoading(false));
  }, [isLoggedIn]);

  // ── When saved addresses load OR label changes, auto-fill the form ─────────
  useEffect(() => {
    const type    = LABEL_TO_TYPE[addressLabel];
    const matched = savedAddresses.find(a => a.address_type === type);

    if (matched) {
      setStreetNumber(matched.street_number      || '');
      setApartment(   matched.apartment_number   || '');
      setNote(        matched.description        || '');
      setDeliveryLatLng({
        lat: matched.latitude  ?? null,
        lng: matched.longitude ?? null,
      });
      // Record the baseline so we can detect dirty state
      savedStateRef.current = {
        street_number:    matched.street_number      || '',
        apartment_number: matched.apartment_number   || '',
        description:      matched.description        || '',
        latitude:         matched.latitude  ?? null,
        longitude:        matched.longitude ?? null,
      };
    } else {
      // No saved address for this label → clear the form
      setStreetNumber('');
      setApartment('');
      setNote('');
      setDeliveryLatLng({ lat: null, lng: null });
      savedStateRef.current = null;
    }
    setAddressMsg('');
  }, [addressLabel, savedAddresses]);

  // ── Detect whether the form has changed from the saved baseline ───────────
  const isFormDirty = () => {
    const base = savedStateRef.current;
    if (!base) {
      // No saved address for this label → dirty only if something has been typed
      return streetNumber.trim() !== '' || apartment.trim() !== '' || note.trim() !== '';
    }
    return (
      streetNumber !== base.street_number    ||
      apartment    !== base.apartment_number ||
      note         !== base.description      ||
      deliveryLatLng.lat !== base.latitude   ||
      deliveryLatLng.lng !== base.longitude
    );
  };

  // ── Save and continue handler ──────────────────────────────────────────────
  const handleSaveAndContinue = async () => {
    setAddressMsg('');
    const type    = LABEL_TO_TYPE[addressLabel];
    const matched = savedAddresses.find(a => a.address_type === type);

    const payload = {
      address_type:     type,
      street_number:    streetNumber    || null,
      apartment_number: apartment       || null,
      description:      note            || null,
      latitude:         deliveryLatLng.lat ?? null,
      longitude:        deliveryLatLng.lng ?? null,
    };

    setAddressSaving(true);
    try {
      if (matched) {
        // Address of this type already exists → PATCH it
        const { address_type, ...patchPayload } = payload; // address_type not updatable via PATCH in services.py
        const result = await updateAddress(matched.id, patchPayload);
        // Merge updated address back into savedAddresses
        setSavedAddresses(prev =>
          prev.map(a => a.id === matched.id ? { ...a, ...result.address } : a)
        );
        setAddressMsg('✓ Address updated successfully.');
      } else {
        // No address of this type → POST a new one
        const result = await createAddress(payload);
        // Re-fetch the full list so we have the new id
        const refreshed = await fetchAddresses();
        setSavedAddresses(Array.isArray(refreshed) ? refreshed : []);
        setAddressMsg('✓ Address saved successfully.');
      }
    } catch (err) {
      setAddressMsg(`✗ ${err.message || 'Failed to save address.'}`);
    } finally {
      setAddressSaving(false);
    }
  };

  // ── Place order ────────────────────────────────────────────────────────────
  const handlePlaceOrder = () => {
    const orderData = {
      restaurant,
      items: cartItems,
      deliveryAddress: { address: deliveryAddress, streetNumber, apartment, note, label: addressLabel },
      deliveryOption,
      contactlessDelivery,
      personalDetails: { firstName, lastName, email, mobile },
      tip: tipAmount,
      subtotal, discountAmount, applicableDiscount, deliveryFee, serviceFee, total,
    };
    if (onPlaceOrder) onPlaceOrder(orderData);
    else alert('Order placed successfully!');
  };

  const handleCheckoutFromCart = (restaurantId) => {
    setShowCart(false);
    if (onCheckout && restaurantId !== restaurant?.id) onCheckout(restaurantId);
  };

  const handleNavigateToRestaurant = () => {
    setShowCart(false);
    if (onBack) onBack();
  };

  const saveButtonDisabled = addressSaving || !isFormDirty();

  // ── Render ─────────────────────────────────────────────────────────────────
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
        onProfileClick={onProfileClick}
        onOrdersClick={onOrdersClick}
        onLogoClick={onLogoClick}
        showBanner={false}
        currentAddress={currentAddress}
        onAddressChange={onAddressChange}
      />

      <div className="checkout-content">
        <div className="checkout-main">
          <h1 className="checkout-title">Review and place your order</h1>

          {/* ── Delivery Address ── */}
          <section className="checkout-section">
            <div className="section-header-checkout">
              <h2 className="section-title-checkout">Delivery address</h2>
              <button className="edit-btn">Edit</button>
            </div>

            <div className="map-container" style={{ height: 'auto', background: 'none', border: 'none', display: 'block', padding: 0 }}>
              <DeliveryMapPicker
                initialLat={deliveryLatLng.lat ?? user?.delivery_addresses?.[0]?.latitude ?? undefined}
                initialLng={deliveryLatLng.lng ?? user?.delivery_addresses?.[0]?.longitude ?? undefined}
                onLocationSelect={({ lat, lng, address }) => {
                  setDeliveryLatLng({ lat, lng });
                  setDeliveryAddress(address);
                }}
              />
            </div>

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

              {/* ── Label buttons ── */}
              <div className="address-labels">
                <p className="label-title">Add a Label</p>
                {addressLoading && (
                  <p style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>
                    Loading saved addresses…
                  </p>
                )}
                <div className="label-options">
                  {[
                    { key: 'home',    icon: <Home    size={14} />, label: 'Home'    },
                    { key: 'work',    icon: <Briefcase size={14} />, label: 'Work' },
                    { key: 'partner', icon: <Heart   size={14} />, label: 'Partner' },
                    { key: 'other',   icon: <Plus    size={14} />, label: 'Other'   },
                  ].map(({ key, icon, label }) => {
                    const isSaved = savedAddresses.some(
                      a => a.address_type === LABEL_TO_TYPE[key]
                    );
                    return (
                      <button
                        key={key}
                        className={`label-btn ${addressLabel === key ? 'active' : ''}`}
                        onClick={() => setAddressLabel(key)}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'relative' }}
                        title={isSaved ? `${label} address saved` : `No ${label} address saved yet`}
                      >
                        {icon} {label}
                        {/* Small dot indicator when an address is already saved for this type */}
                        {isSaved && (
                          <span style={{
                            display: 'inline-block',
                            width: '6px', height: '6px',
                            borderRadius: '50%',
                            background: '#10b981',
                            marginLeft: '2px',
                            verticalAlign: 'middle',
                          }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Save and continue ── */}
              <button
                className="save-continue-btn"
                onClick={handleSaveAndContinue}
                disabled={saveButtonDisabled}
                style={{ opacity: saveButtonDisabled ? 0.5 : 1, cursor: saveButtonDisabled ? 'not-allowed' : 'pointer' }}
              >
                {addressSaving ? 'Saving…' : 'Save and continue'}
              </button>

              {/* Feedback message */}
              {addressMsg && (
                <p style={{
                  marginTop: '8px',
                  fontSize: '13px',
                  color: addressMsg.startsWith('✓') ? '#10b981' : '#ef4444',
                  fontWeight: 500,
                }}>
                  {addressMsg}
                </p>
              )}

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

          {/* ── Delivery options ── */}
          <section className="checkout-section">
            <h2 className="section-title-checkout">Delivery options</h2>
            <div className="delivery-options">
              <label className="delivery-option-card">
                <input type="radio" name="delivery" value="standard"
                  checked={deliveryOption === 'standard'}
                  onChange={(e) => setDeliveryOption(e.target.value)} />
                <div className="option-content">
                  <div className="option-info">
                    <span className="option-label">Standard</span>
                    <span className="option-time">15 - 30 mins</span>
                  </div>
                </div>
              </label>
              <label className="delivery-option-card">
                <input type="radio" name="delivery" value="priority"
                  checked={deliveryOption === 'priority'}
                  onChange={(e) => setDeliveryOption(e.target.value)} />
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

          {/* ── Personal details ── */}
          <section className="checkout-section">
            <div className="section-header-checkout">
              <h2 className="section-title-checkout">Personal details</h2>
              <button className="cancel-btn">Cancel</button>
            </div>
            <div className="personal-details-form">
              <input type="email" placeholder="Email" value={email}
                onChange={(e) => setEmail(e.target.value)} className="personal-input" />
              <div className="name-row">
                <input type="text" placeholder="First name" value={firstName}
                  onChange={(e) => setFirstName(e.target.value)} className="personal-input half" />
                <input type="text" placeholder="Last name" value={lastName}
                  onChange={(e) => setLastName(e.target.value)} className="personal-input half" />
              </div>
              <input type="tel" placeholder="Mobile number" value={mobile}
                onChange={(e) => setMobile(e.target.value)} className="personal-input" />
            </div>
          </section>

          {/* ── Tip ── */}
          <section className="checkout-section">
            <h2 className="section-title-checkout">Tip your rider</h2>
            <br />
            <p className="section-subtitle-checkout">Your rider receives 100% of the tip</p>
            <div className="tip-options">
              {[0, 10, 20, 30, 50].map(amount => (
                <button key={amount}
                  className={`tip-btn ${tipAmount === amount ? 'active' : ''}`}
                  onClick={() => setTipAmount(amount)}>
                  {amount === 0 ? 'Not now' : `Tk ${amount}`}
                </button>
              ))}
            </div>
            <p className="tip-note">More common</p>
            <div className="save-tip-option">
              <input type="checkbox" id="saveTip" checked={saveTip}
                onChange={(e) => setSaveTip(e.target.checked)} />
              <label htmlFor="saveTip">Save it for the next order</label>
            </div>
          </section>

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

        {/* ── Order summary sidebar ── */}
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
            <div className="summary-row"><span>Subtotal</span><span>৳{subtotal}</span></div>
            {discountAmount > 0 && (
              <div className="summary-row" style={{ color: '#10b981', fontWeight: 700 }}>
                <span>Discount ({applicableDiscount.percentage}% off)</span>
                <span>-৳{discountAmount}</span>
              </div>
            )}
            <div className="summary-row">
              <span>Standard delivery</span>
              <span className="free-text">{deliveryFee === 0 ? 'Free' : `৳${deliveryFee}`}</span>
            </div>
            <div className="summary-row"><span>Service fee</span><span>৳{serviceFee}</span></div>
            {tipAmount > 0 && (
              <div className="summary-row"><span>Tip</span><span>৳{tipAmount}</span></div>
            )}
          </div>
          <div className="summary-divider"></div>
          <div className="summary-total">
            <div className="total-row-checkout">
              <span className="total-label-checkout">Total</span>
              <span className="total-amount-checkout">৳{total}</span>
            </div>
            <p className="tax-note">(incl. fees and tax)</p>
            {savings > 0 && <p className="savings-note">৳{savings} savings</p>}
          </div>
        </aside>
      </div>

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
