import React, { useState, useEffect } from 'react';
import './Checkout.css';
import Header from './Header.jsx';
import AllCarts from './Allcarts.jsx';          // ← exact filename on disk
import DeliveryMapPicker from './DeliveryMapPicker.jsx';
import cartApiService from '../Cartapiservice.js'; // ← has _rawFetch with auth built-in
import {
  MapPin, Home, Briefcase, Heart, Plus,
  Pencil, Trash2, X, Check, Loader2,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────── */
const API_BASE = 'http://127.0.0.1:8000/api';

const LABEL_META = {
  home:    { icon: <Home      size={14} />, text: 'Home'    },
  work:    { icon: <Briefcase size={14} />, text: 'Work'    },
  partner: { icon: <Heart     size={14} />, text: 'Partner' },
  other:   { icon: <Plus      size={14} />, text: 'Other'   },
};

const LABEL_CARD_ICON = {
  home:    <Home      size={16} />,
  work:    <Briefcase size={16} />,
  partner: <Heart     size={16} />,
  other:   <MapPin    size={16} />,
};

// Backend stores address_type as uppercase (HOME / WORK / PARTNER / OTHER)
const toBackendType  = (label) => (label ?? 'home').toUpperCase();
const toFrontendType = (type)  => (type  ?? 'HOME').toLowerCase();

const emptyForm = () => ({
  address: '', streetNumber: '', apartment: '', note: '',
  label: 'home', lat: null, lng: null,
});

/* ─────────────────────────────────────────────────────────────
   ADDRESS API HELPERS
   All HTTP calls go through cartApiService._rawFetch which
   already handles Bearer-token injection and 401→refresh→retry,
   so Checkout.jsx never needs to import authService directly.
   _rawFetch treats any "http…" string as an absolute URL and
   skips its own cart-specific base-URL prefix.
───────────────────────────────────────────────────────────── */
function apiFetch(path, options = {}) {
  return cartApiService._rawFetch(`${API_BASE}${path}`, options);
}

async function fetchAddresses() {
  const res = await apiFetch('/customers/me/addresses/');
  if (!res.ok) throw new Error('Failed to load addresses.');
  return res.json();
}

async function createAddress(form) {
  const res = await apiFetch('/customers/me/addresses/', {
    method: 'POST',
    body: JSON.stringify({
      address_type:     toBackendType(form.label),
      street_number:    form.streetNumber || null,
      apartment_number: form.apartment    || null,
      description:      form.note         || null,
      latitude:         form.lat          ?? null,
      longitude:        form.lng          ?? null,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to save address.');
  }
  return res.json(); // { message, address_id }
}

async function updateAddress(id, form) {
  const payload = {};
  if (form.streetNumber !== undefined) payload.street_number    = form.streetNumber || null;
  if (form.apartment    !== undefined) payload.apartment_number = form.apartment    || null;
  if (form.note         !== undefined) payload.description      = form.note         || null;
  if (form.lat          !== undefined) payload.latitude         = form.lat          ?? null;
  if (form.lng          !== undefined) payload.longitude        = form.lng          ?? null;

  const res = await apiFetch(`/customers/me/addresses/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to update address.');
  }
  return res.json(); // { message, address }
}

async function deleteAddress(id) {
  const res = await apiFetch(`/customers/me/addresses/${id}/`, { method: 'DELETE' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to delete address.');
  }
}

/* ─────────────────────────────────────────────────────────────
   NORMALISE  backend shape → frontend shape
   Backend:  { id, address_type, street_number,
               apartment_number, description, latitude, longitude }
   Frontend: { id, label, streetNumber, apartment, note,
               address (map text), lat, lng }
───────────────────────────────────────────────────────────── */
function normalize(a) {
  return {
    id:           a.id,
    label:        toFrontendType(a.address_type),
    streetNumber: a.street_number    ?? '',
    apartment:    a.apartment_number ?? '',
    note:         a.description      ?? '',
    address:      '',   // reverse-geocoded text; not persisted by backend
    lat:          a.latitude  != null ? parseFloat(a.latitude)  : null,
    lng:          a.longitude != null ? parseFloat(a.longitude) : null,
  };
}

/* ─────────────────────────────────────────────────────────────
   ADDRESS FORM MODAL
───────────────────────────────────────────────────────────── */
const AddressModal = ({ initial, onSave, onClose, takenLabels = [], saving }) => {
  const editingLabel = initial?.label ?? null;
  const [form, setForm] = useState(initial ?? emptyForm());
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.address && !form.streetNumber) return;
    onSave(form);
  };

  return (
    <div className="addr-modal-overlay" onClick={onClose}>
      <div className="addr-modal" onClick={e => e.stopPropagation()}>

        <div className="addr-modal-header">
          <h2 className="addr-modal-title">What's your exact location?</h2>
          <button className="addr-modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        <p className="addr-modal-subtitle">
          Providing your location enables more accurate search and delivery ETA,
          seamless order tracking and personalised recommendations.
        </p>

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

          <p className="label-title">Add a Label</p>
          <div className="label-options">
            {Object.entries(LABEL_META).map(([key, { icon, text }]) => {
              const isTaken = takenLabels.includes(key) && key !== editingLabel;
              return (
                <button
                  key={key}
                  className={`label-btn ${form.label === key ? 'active' : ''} ${isTaken ? 'disabled' : ''}`}
                  onClick={() => !isTaken && set('label', key)}
                  disabled={isTaken}
                  title={isTaken ? `You already have a ${text} address` : ''}
                  style={isTaken ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
                >
                  {icon} {text}
                </button>
              );
            })}
          </div>
        </div>

        <button className="addr-modal-submit" onClick={handleSave} disabled={saving}>
          {saving
            ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Loader2 size={14} className="spin" /> Saving…
              </span>
            : 'SUBMIT'}
        </button>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   MAIN CHECKOUT COMPONENT
───────────────────────────────────────────────────────────── */
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
  onDeliveryClick,   // passed from App via {...H}
  onPickupClick,     // passed from App via {...H}
  onNearMeClick,     // passed from App via {...H}
  onFavouritesClick, // passed from App via {...H}
  currentAddress,
  onAddressChange,
}) => {

  /* ── Address state ──────────────────────────────────────── */
  const [addresses,      setAddresses]      = useState([]);
  const [addrLoading,    setAddrLoading]    = useState(false);
  const [addrError,      setAddrError]      = useState('');
  const [selectedAddrId, setSelectedAddrId] = useState(null);
  const [showModal,      setShowModal]      = useState(false);
  const [editingAddr,    setEditingAddr]    = useState(null);
  const [saving,         setSaving]         = useState(false);
  const [actionError,    setActionError]    = useState('');

  /* ── Form / UI state ────────────────────────────────────── */
  const [firstName,      setFirstName]      = useState(user?.first_name || '');
  const [lastName,       setLastName]       = useState(user?.last_name  || '');
  const [email,          setEmail]          = useState(user?.email      || '');
  const [mobile,         setMobile]         = useState('');
  const [tipAmount,      setTipAmount]      = useState(0);
  const [saveTip,        setSaveTip]        = useState(false);
  const [contactless,    setContactless]    = useState(false);
  const [deliveryOption, setDeliveryOption] = useState('standard');
  const [showCart,       setShowCart]       = useState(false);

  /* ── Fetch addresses on mount ───────────────────────────── */
  useEffect(() => {
    if (!isLoggedIn) return;
    setAddrLoading(true);
    setAddrError('');
    fetchAddresses()
      .then(data => {
        const normalised = data.map(normalize);
        setAddresses(normalised);
        if (normalised.length > 0) setSelectedAddrId(normalised[0].id);
      })
      .catch(err => setAddrError(err.message))
      .finally(() => setAddrLoading(false));
  }, [isLoggedIn]);

  /* ── Financials ─────────────────────────────────────────── */
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

  /* ── Address helpers ────────────────────────────────────── */
  const takenLabels    = addresses.map(a => a.label);
  const allLabelsTaken = Object.keys(LABEL_META).every(l => takenLabels.includes(l));

  const openAddModal  = ()     => { setEditingAddr(null); setShowModal(true); setActionError(''); };
  const openEditModal = (addr) => { setEditingAddr(addr); setShowModal(true); setActionError(''); };
  const closeModal    = ()     => { setShowModal(false);  setEditingAddr(null); };

  /* ── Save (create or update) ────────────────────────────── */
  const handleSaveAddr = async (form) => {
    setSaving(true);
    setActionError('');
    try {
      if (editingAddr) {
        const { address: updated } = await updateAddress(editingAddr.id, form);
        const merged = { ...normalize(updated), address: form.address };
        setAddresses(prev => prev.map(a => a.id === editingAddr.id ? merged : a));
      } else {
        const { address_id } = await createAddress(form);
        const newAddr = { ...form, id: address_id };
        setAddresses(prev => [...prev, newAddr]);
        setSelectedAddrId(address_id);
      }
      closeModal();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSaving(false);
    }
  };

  /* ── Delete ─────────────────────────────────────────────── */
  const handleDeleteAddr = async (id) => {
    setActionError('');
    try {
      await deleteAddress(id);
      setAddresses(prev => {
        const remaining = prev.filter(a => a.id !== id);
        if (selectedAddrId === id)
          setSelectedAddrId(remaining.length > 0 ? remaining[0].id : null);
        return remaining;
      });
    } catch (err) {
      setActionError(err.message);
    }
  };

  /* ── Place order ────────────────────────────────────────── */
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
      subtotal, discountAmount, applicableDiscount,
      deliveryFee, serviceFee, total,
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

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div className="checkout-container">
      <Header
        isLoggedIn={isLoggedIn}
        user={user}
        cartItems={allCartItems}
        onLoginClick={onLoginClick}
        onSignUpClick={onSignUpClick}
        onCartClick={() => setShowCart(prev => !prev)}
        onLogout={onLogout}
        onProfileClick={onProfileClick}
        onOrdersClick={onOrdersClick}
        onLogoClick={onLogoClick}
        onDeliveryClick={onDeliveryClick}
        onPickupClick={onPickupClick}
        onNearMeClick={onNearMeClick}
        onFavouritesClick={onFavouritesClick}
        showBanner={false}
        currentAddress={currentAddress}
        onAddressChange={onAddressChange}
      />

      <div className="checkout-content">
        <div className="checkout-main">
          <h1 className="checkout-title">Review and place your order</h1>

          {/* ── DELIVERY ADDRESS ─────────────────────────── */}
          <section className="checkout-section">
            <h2 className="section-title-checkout">Delivery address</h2>

            {/* Error banner */}
            {(addrError || actionError) && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626',
                borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 13,
              }}>
                {addrError || actionError}
              </div>
            )}

            {addrLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8,
                            color: '#6b7280', padding: '12px 0' }}>
                <Loader2 size={16} className="spin" />
                <span>Loading your saved addresses…</span>
              </div>
            ) : (
              <>
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
                          <div className={`addr-radio ${selectedAddrId === addr.id ? 'checked' : ''}`}>
                            {selectedAddrId === addr.id && <Check size={12} />}
                          </div>

                          <div className="addr-card-icon">
                            {LABEL_CARD_ICON[addr.label] ?? <MapPin size={16} />}
                          </div>

                          <div className="addr-card-content">
                            {addr.label && (
                              <span className="addr-card-label-badge"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                {LABEL_META[addr.label]?.icon}
                                {LABEL_META[addr.label]?.text
                                  ?? addr.label.charAt(0).toUpperCase() + addr.label.slice(1)}
                              </span>
                            )}
                            <p className="addr-card-main">
                              {[addr.streetNumber, addr.address].filter(Boolean).join(' ') || 'Address'}
                            </p>
                            {addr.apartment && (
                              <p className="addr-card-sub">Flat Number: {addr.apartment}</p>
                            )}
                            <p className="addr-card-sub">Note to rider: {addr.note || 'none'}</p>
                          </div>

                          <div className="addr-card-actions" onClick={e => e.stopPropagation()}>
                            <button className="addr-action-btn"
                              onClick={() => openEditModal(addr)} title="Edit">
                              <Pencil size={15} />
                            </button>
                            <button className="addr-action-btn danger"
                              onClick={() => handleDeleteAddr(addr.id)} title="Delete">
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {!isLoggedIn && addresses.length === 0 && (
                  <p style={{ color: '#6b7280', fontSize: 13 }}>
                    Please{' '}
                    <button onClick={onLoginClick}
                      style={{ color: '#4f46e5', background: 'none', border: 'none',
                               cursor: 'pointer', padding: 0, fontSize: 13 }}>
                      log in
                    </button>
                    {' '}to load your saved addresses.
                  </p>
                )}
              </>
            )}

            {!allLabelsTaken && (
              <button className="add-address-btn" onClick={openAddModal} disabled={addrLoading}>
                <Plus size={16} /> Add address
              </button>
            )}

            <div className="section-divider" />

            <div className="contactless-option">
              <span>Contactless delivery</span>
              <label className="toggle-switch-checkout">
                <input type="checkbox" checked={contactless}
                  onChange={e => setContactless(e.target.checked)} />
                <span className="toggle-slider-checkout" />
              </label>
            </div>
          </section>

          {/* ── DELIVERY OPTIONS ──────────────────────────── */}
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

          {/* ── PERSONAL DETAILS ──────────────────────────── */}
          <section className="checkout-section">
            <div className="section-header-checkout">
              <h2 className="section-title-checkout">Personal details</h2>
              <button className="cancel-btn" onClick={() => {
                setFirstName(user?.first_name || '');
                setLastName(user?.last_name   || '');
                setEmail(user?.email          || '');
                setMobile('');
              }}>Cancel</button>
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

          {/* ── TIP ──────────────────────────────────────── */}
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
                onChange={e => setSaveTip(e.target.checked)} />
              <label htmlFor="saveTip">Save it for the next order</label>
            </div>
          </section>

          <button className="place-order-btn" onClick={handlePlaceOrder}>Place order</button>
          <p className="terms-text">
            By making this purchase you agree to our <a href="#">terms and conditions</a>.
          </p>
          <p className="terms-text">
            I agree that placing the order places the order under an obligation to make
            a payment in accordance with the <a href="#">General Terms and Conditions</a>.
          </p>
        </div>

        {/* ── ORDER SUMMARY SIDEBAR ─────────────────────── */}
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

          <button className="add-more-items-btn" onClick={onBack}>
            <Plus size={14} /> Add more items
          </button>

          <div className="summary-divider" />

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

      {/* ── ADDRESS MODAL ─────────────────────────────── */}
      {showModal && (
        <AddressModal
          initial={editingAddr}
          onSave={handleSaveAddr}
          onClose={closeModal}
          takenLabels={takenLabels}
          saving={saving}
        />
      )}

      {/* ── ALL CARTS SIDEBAR ─────────────────────────── */}
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
