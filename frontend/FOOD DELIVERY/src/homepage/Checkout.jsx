import React, { useState } from 'react';
import './Checkout.css';
import Header from './Header.jsx';
import AllCarts from './AllCarts.jsx';
import DeliveryMapPicker from './DeliveryMapPicker.jsx';
import {
  MapPin, Home, Briefcase, Heart, Plus,
  Pencil, Trash2, X, Check,
} from 'lucide-react';

/* ─── helpers ─────────────────────────────────────────────── */
const LABEL_ICONS = {
  home:    <Home    size={14} />,
  work:    <Briefcase size={14} />,
  partner: <Heart   size={14} />,
  other:   <Plus    size={14} />,
};

const emptyForm = () => ({
  address: '', streetNumber: '', apartment: '', note: '', label: 'home',
  lat: null, lng: null,
});

/* ─── Address Form Modal ──────────────────────────────────── */
const AddressModal = ({ initial, onSave, onClose }) => {
  const [form, setForm] = useState(initial ?? emptyForm());

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.address && !form.streetNumber) return;
    onSave(form);
  };

  return (
    <div className="addr-modal-overlay" onClick={onClose}>
      <div className="addr-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="addr-modal-header">
          <h2 className="addr-modal-title">What's your exact location?</h2>
          <button className="addr-modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <p className="addr-modal-subtitle">
          Providing your location enables more accurate search and delivery ETA,
          seamless order tracking and personalised recommendations.
        </p>

        {/* Map picker */}
        <div className="addr-modal-map">
          <DeliveryMapPicker
            initialLat={form.lat ?? undefined}
            initialLng={form.lng ?? undefined}
            onLocationSelect={({ lat, lng, address }) => {
              set('lat', lat);
              set('lng', lng);
              set('address', address);
            }}
          />
        </div>

        {/* Inputs */}
        <div className="addr-modal-inputs">
          <input
            className="address-input"
            placeholder="Street / house number"
            value={form.streetNumber}
            onChange={e => set('streetNumber', e.target.value)}
          />
          <input
            className="address-input"
            placeholder="Apartment #"
            value={form.apartment}
            onChange={e => set('apartment', e.target.value)}
          />
          <textarea
            className="address-textarea"
            placeholder="Note to rider – e.g. building, landmark"
            rows={2}
            value={form.note}
            onChange={e => set('note', e.target.value)}
          />

          {/* Label */}
          <p className="label-title">Add a Label</p>
          <div className="label-options">
            {Object.entries(LABEL_ICONS).map(([key, icon]) => (
              <button
                key={key}
                className={`label-btn ${form.label === key ? 'active' : ''}`}
                onClick={() => set('label', key)}
              >
                {icon} {key.charAt(0).toUpperCase() + key.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <button className="addr-modal-submit" onClick={handleSave}>
          SUBMIT
        </button>
      </div>
    </div>
  );
};

/* ─── Main Checkout ───────────────────────────────────────── */
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
  /* ── address list (seed from user profile if available) ── */
  const seedAddresses = () => {
    const saved = user?.delivery_addresses ?? [];
    if (saved.length > 0) {
      return saved.map((a, i) => ({
        id: Date.now() + i,
        address: a.address ?? '',
        streetNumber: a.street_number ?? '',
        apartment: a.apartment ?? '',
        note: a.note ?? '',
        label: a.label ?? 'home',
        lat: a.latitude ?? null,
        lng: a.longitude ?? null,
      }));
    }
    return [];
  };

  const [addresses,       setAddresses]       = useState(seedAddresses);
  const [selectedAddrId,  setSelectedAddrId]  = useState(null);
  const [showModal,       setShowModal]       = useState(false);
  const [editingAddr,     setEditingAddr]     = useState(null); // null = new

  const [note,            setNote]            = useState('');
  const [firstName,       setFirstName]       = useState(user?.first_name || '');
  const [lastName,        setLastName]        = useState(user?.last_name  || '');
  const [email,           setEmail]           = useState(user?.email      || '');
  const [mobile,          setMobile]          = useState('');
  const [tipAmount,       setTipAmount]       = useState(0);
  const [saveTip,         setSaveTip]         = useState(false);
  const [contactless,     setContactless]     = useState(false);
  const [deliveryOption,  setDeliveryOption]  = useState('standard');
  const [showCart,        setShowCart]        = useState(false);

  /* ── financials ─────────────────────────────────────────── */
  const subtotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const deliveryFee = deliveryOption === 'priority' ? 33 : 0;
  const serviceFee  = 14;
  const discounts   = restaurant?.discounts ?? [];
  const applicableDiscount = discounts
    .filter(d => d.is_active !== false && subtotal >= (parseFloat(d.min_order) || 0))
    .sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage))[0] ?? null;
  const discountAmount = applicableDiscount
    ? Math.round(subtotal * parseFloat(applicableDiscount.percentage) / 100) : 0;
  const total   = subtotal - discountAmount + deliveryFee + serviceFee + tipAmount;
  const savings = discountAmount;

  /* ── address helpers ─────────────────────────────────────── */
  const openAddModal  = ()      => { setEditingAddr(null);  setShowModal(true); };
  const openEditModal = (addr)  => { setEditingAddr(addr);  setShowModal(true); };
  const closeModal    = ()      => { setShowModal(false); setEditingAddr(null); };

  const handleSaveAddr = (form) => {
    if (editingAddr) {
      setAddresses(prev => prev.map(a => a.id === editingAddr.id ? { ...form, id: a.id } : a));
    } else {
      const newAddr = { ...form, id: Date.now() };
      setAddresses(prev => [...prev, newAddr]);
      setSelectedAddrId(newAddr.id);
    }
    closeModal();
  };

  const handleDeleteAddr = (id) => {
    setAddresses(prev => prev.filter(a => a.id !== id));
    if (selectedAddrId === id) setSelectedAddrId(null);
  };

  /* ── place order ─────────────────────────────────────────── */
  const selectedAddr = addresses.find(a => a.id === selectedAddrId) ?? null;

  const handlePlaceOrder = () => {
    const orderData = {
      restaurant,
      items: cartItems,
      deliveryAddress: selectedAddr,
      deliveryOption,
      contactlessDelivery: contactless,
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

  /* ── render ─────────────────────────────────────────────── */
  return (
    <div className="checkout-container">
      <Header
        isLoggedIn={isLoggedIn} user={user} cartItems={allCartItems}
        onLoginClick={onLoginClick} onSignUpClick={onSignUpClick}
        onCartClick={() => setShowCart(!showCart)} onLogout={onLogout}
        onProfileClick={onProfileClick} onOrdersClick={onOrdersClick}
        onLogoClick={onLogoClick} showBanner={false}
        currentAddress={currentAddress} onAddressChange={onAddressChange}
      />

      <div className="checkout-content">
        <div className="checkout-main">
          <h1 className="checkout-title">Review and place your order</h1>

          {/* ── DELIVERY ADDRESS ── */}
          <section className="checkout-section">
            <h2 className="section-title-checkout">Delivery address</h2>

            {/* Saved address cards */}
            {addresses.length > 0 && (
              <>
                <p className="saved-addr-label">Saved Addresses</p>
                <div className="saved-addresses-list">
                  {addresses.map(addr => (
                    <div
                      key={addr.id}
                      className={`saved-addr-card ${selectedAddrId === addr.id ? 'selected' : ''}`}
                      onClick={() => setSelectedAddrId(addr.id)}
                    >
                      {/* Radio */}
                      <div className={`addr-radio ${selectedAddrId === addr.id ? 'checked' : ''}`}>
                        {selectedAddrId === addr.id && <Check size={12} />}
                      </div>

                      {/* Icon */}
                      <div className="addr-card-icon">
                        {addr.label === 'work' ? <Briefcase size={16} /> : <MapPin size={16} />}
                      </div>

                      {/* Content */}
                      <div className="addr-card-content">
                        {addr.label !== 'home' && addr.label && (
                          <span className="addr-card-label-badge">{addr.label.charAt(0).toUpperCase() + addr.label.slice(1)}</span>
                        )}
                        <p className="addr-card-main">
                          {[addr.streetNumber, addr.address].filter(Boolean).join(' ') || 'Address'}
                        </p>
                        {addr.apartment && <p className="addr-card-sub">Flat Number: {addr.apartment}</p>}
                        <p className="addr-card-sub">Note to rider: {addr.note || 'none'}</p>
                      </div>

                      {/* Actions */}
                      <div className="addr-card-actions" onClick={e => e.stopPropagation()}>
                        <button className="addr-action-btn" onClick={() => openEditModal(addr)} title="Edit">
                          <Pencil size={15} />
                        </button>
                        <button className="addr-action-btn danger" onClick={() => handleDeleteAddr(addr.id)} title="Delete">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Add address */}
            <button className="add-address-btn" onClick={openAddModal}>
              <Plus size={16} /> Add address
            </button>

            <div className="section-divider" />

            {/* Contactless */}
            <div className="contactless-option">
              <span>Contactless delivery</span>
              <label className="toggle-switch-checkout">
                <input type="checkbox" checked={contactless} onChange={e => setContactless(e.target.checked)} />
                <span className="toggle-slider-checkout" />
              </label>
            </div>
          </section>

          {/* ── DELIVERY OPTIONS ── */}
          <section className="checkout-section">
            <h2 className="section-title-checkout">Delivery options</h2>
            <div className="delivery-options">
              <label className="delivery-option-card">
                <input type="radio" name="delivery" value="standard"
                  checked={deliveryOption === 'standard'}
                  onChange={() => setDeliveryOption('standard')} />
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
                  onChange={() => setDeliveryOption('priority')} />
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

          {/* ── PERSONAL DETAILS ── */}
          <section className="checkout-section">
            <div className="section-header-checkout">
              <h2 className="section-title-checkout">Personal details</h2>
              <button className="cancel-btn">Cancel</button>
            </div>
            <div className="personal-details-form">
              <input className="personal-input" type="email" placeholder="Email"
                value={email} onChange={e => setEmail(e.target.value)} />
              <div className="name-row">
                <input className="personal-input half" type="text" placeholder="First name"
                  value={firstName} onChange={e => setFirstName(e.target.value)} />
                <input className="personal-input half" type="text" placeholder="Last name"
                  value={lastName} onChange={e => setLastName(e.target.value)} />
              </div>
              <input className="personal-input" type="tel" placeholder="Mobile number"
                value={mobile} onChange={e => setMobile(e.target.value)} />
            </div>
          </section>

          {/* ── TIP ── */}
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
              <input type="checkbox" id="saveTip" checked={saveTip} onChange={e => setSaveTip(e.target.checked)} />
              <label htmlFor="saveTip">Save it for the next order</label>
            </div>
          </section>

          <button className="place-order-btn" onClick={handlePlaceOrder}>Place order</button>
          <p className="terms-text">
            By making this purchase you agree to our <a href="#">terms and conditions</a>.
          </p>
          <p className="terms-text">
            I agree that placing the order places the order under an obligation to make a payment in
            accordance with the <a href="#">General Terms and Conditions</a>.
          </p>
        </div>

        {/* ── ORDER SUMMARY SIDEBAR ── */}
        <aside className="order-summary-sidebar">
          <h3 className="summary-title">Your order from</h3>
          <p className="restaurant-name-summary">{restaurant?.name || 'Restaurant'}</p>

          <div className="summary-items">
            {cartItems.map(item => (
              <div key={item.id} className="summary-item">
                <span className="item-qty">{item.quantity} ×</span>
                <span className="item-name-summary">{item.name}</span>
                <span className="item-price-summary">৳{item.price * item.quantity}</span>
              </div>
            ))}
          </div>

          {/* Add more items link */}
          <button className="add-more-items-btn" onClick={onBack}>
            <Plus size={14} /> Add more items
          </button>

          <div className="summary-divider" />

          <div className="summary-totals">
            <div className="summary-row">
              <span>Subtotal</span>
              <span>৳{subtotal}</span>
            </div>
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
            <div className="summary-row">
              <span>Service fee</span>
              <span>৳{serviceFee}</span>
            </div>
            {tipAmount > 0 && (
              <div className="summary-row"><span>Tip</span><span>৳{tipAmount}</span></div>
            )}
          </div>

          <div className="summary-divider" />

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

      {/* ── ADDRESS MODAL ── */}
      {showModal && (
        <AddressModal
          initial={editingAddr}
          onSave={handleSaveAddr}
          onClose={closeModal}
        />
      )}

      <AllCarts
        isOpen={showCart} onClose={() => setShowCart(false)}
        cartItems={allCartItems} onCheckout={handleCheckoutFromCart}
        onNavigateToRestaurant={handleNavigateToRestaurant}
      />
    </div>
  );
};

export default Checkout;