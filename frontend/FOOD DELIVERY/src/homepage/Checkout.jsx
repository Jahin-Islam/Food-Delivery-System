import React, { useState, useEffect, useMemo } from 'react';
import './Checkout.css';
import Header from './Header.jsx';
import AllCarts from './Allcarts.jsx';
import DeliveryMapPicker from './DeliveryMapPicker.jsx';
import cartApiService from '../Cartapiservice.js';
import {
  MapPin, Home, Briefcase, Heart, Plus,
  Pencil, Trash2, X, Check, Loader2, Tag,
  Zap, Clock,
} from 'lucide-react';

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

const toBackendType  = (label) => (label ?? 'home').toUpperCase();
const toFrontendType = (type)  => (type  ?? 'HOME').toLowerCase();

const emptyForm = () => ({
  address: '', streetNumber: '', apartment: '', note: '',
  label: 'home', lat: null, lng: null,
});

function haversineKm(lat1, lng1, lat2, lng2) {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function apiFetch(path, options = {}) {
  return cartApiService._rawFetch(`${API_BASE}${path}`, options);
}

async function fetchAddresses() {
  const res = await apiFetch('/customers/me/addresses/');
  if (!res.ok) throw new Error('Failed to load addresses.');
  return res.json();
}

async function fetchRestaurantDetail(restaurantId) {
  const res = await fetch(`http://127.0.0.1:8000/api/v1/restaurants/${restaurantId}/`);
  if (!res.ok) throw new Error(`Failed to load restaurant detail (${res.status})`);
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
  return res.json();
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
  return res.json();
}

async function deleteAddress(id) {
  const res = await apiFetch(`/customers/me/addresses/${id}/`, { method: 'DELETE' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Failed to delete address.');
  }
}

/* ─── Normalise backend address → frontend shape ─────────── */
function normalize(a) {
  return {
    id:           a.id,
    label:        toFrontendType(a.address_type),
    streetNumber: a.street_number    ?? '',
    apartment:    a.apartment_number ?? '',
    note:         a.description      ?? '',
    address:      '',
    lat:          a.latitude  != null ? parseFloat(a.latitude)  : null,
    lng:          a.longitude != null ? parseFloat(a.longitude) : null,
  };
}

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
  onDeliveryClick,
  onPickupClick,
  onNearMeClick,
  onFavouritesClick,
  currentAddress,
  onAddressChange,
}) => {

  const [addresses,      setAddresses]      = useState([]);
  const [addrLoading,    setAddrLoading]    = useState(false);
  const [addrError,      setAddrError]      = useState('');
  const [selectedAddrId, setSelectedAddrId] = useState(null);
  const [showModal,      setShowModal]      = useState(false);
  const [editingAddr,    setEditingAddr]    = useState(null);
  const [saving,         setSaving]         = useState(false);
  const [actionError,    setActionError]    = useState('');

  const [firstName,      setFirstName]      = useState(user?.first_name || '');
  const [lastName,       setLastName]       = useState(user?.last_name  || '');
  const [email,          setEmail]          = useState(user?.email      || '');
  const [mobile,         setMobile]         = useState('');
  const [tipAmount,      setTipAmount]      = useState(0);
  const [saveTip,        setSaveTip]        = useState(false);
  const [contactless,    setContactless]    = useState(false);
  const [deliveryOption, setDeliveryOption] = useState('standard');
  const [showCart,       setShowCart]       = useState(false);
  const [placing,        setPlacing]        = useState(false);
  const [placeError,     setPlaceError]     = useState('');

  const [freshDiscounts,    setFreshDiscounts]    = useState(
    Array.isArray(restaurant?.discounts) ? restaurant.discounts : []
  );
  const [selectedDiscountNum, setSelectedDiscountNum] = useState(null);

  useEffect(() => {
    if (!restaurant?.id) return;
    setSelectedDiscountNum(null);
    fetchRestaurantDetail(restaurant.id)
      .then(detail => {
        const discounts = Array.isArray(detail.discounts) ? detail.discounts : [];
        setFreshDiscounts(discounts);
      })
      .catch(() => {
        setFreshDiscounts(Array.isArray(restaurant?.discounts) ? restaurant.discounts : []);
      });
  }, [restaurant?.id]);

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
  const selectedAddr = addresses.find(a => a.id === selectedAddrId) ?? null;

  const distanceKm = useMemo(() => {
    const addrLat = selectedAddr?.lat;
    const addrLng = selectedAddr?.lng;
    const restLat = restaurant?.latitude  ?? restaurant?.address?.latitude  ?? null;
    const restLng = restaurant?.longitude ?? restaurant?.address?.longitude ?? null;
    return haversineKm(addrLat, addrLng, restLat, restLng);
  }, [selectedAddr, restaurant]);

  const deliveryFee = useMemo(() => {
    if (distanceKm == null) {
      return deliveryOption === 'priority' ? 50 : 0;
    }
    const ratePerKm = deliveryOption === 'priority' ? 30 : 10;
    return Math.max(10, Math.round(distanceKm * ratePerKm));
  }, [distanceKm, deliveryOption]);

  const serviceFee = 14;

  const activeDiscounts = freshDiscounts.filter(d => {
    const v = d.is_active;
    return v === true || v === 1 || v === '1';
  });

  const subtotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const applicableDiscount = useMemo(() => {
    if (selectedDiscountNum == null) return null;
    const found = activeDiscounts.find(d => d.discount_num === selectedDiscountNum);
    if (!found) return null;
    if (subtotal < (parseFloat(found.min_order) || 0)) return null;
    return found;
  }, [selectedDiscountNum, activeDiscounts, subtotal]);

  const discountAmount = applicableDiscount
    ? Math.round(subtotal * parseFloat(applicableDiscount.percentage) / 100)
    : 0;

  const total   = subtotal - discountAmount + deliveryFee + serviceFee + tipAmount;
  const savings = discountAmount;
  const handleVoucherToggle = (discountNum, meetsMin) => {
    if (!meetsMin) return; // locked — can't select
    setSelectedDiscountNum(prev => prev === discountNum ? null : discountNum);
  };

  const takenLabels    = addresses.map(a => a.label);
  const allLabelsTaken = Object.keys(LABEL_META).every(l => takenLabels.includes(l));

  const openAddModal  = ()     => { setEditingAddr(null); setShowModal(true); setActionError(''); };
  const openEditModal = (addr) => { setEditingAddr(addr); setShowModal(true); setActionError(''); };
  const closeModal    = ()     => { setShowModal(false);  setEditingAddr(null); };

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

  const handlePlaceOrder = async () => {
    if (!isLoggedIn) {
      setPlaceError('Please log in to place an order.');
      return;
    }
    if (!selectedAddrId) {
      setPlaceError('Please select a delivery address before placing your order.');
      return;
    }
    if (!restaurant?.id) {
      setPlaceError('Restaurant information is missing. Please go back and try again.');
      return;
    }
    if (!cartItems.length) {
      setPlaceError('Your cart is empty.');
      return;
    }

    setPlacing(true);
    setPlaceError('');

    try {
      const body = {
        restaurant_id:   Number(restaurant.id),
        address_id:      selectedAddrId,
        delivery_charge: deliveryFee,
        service_charge:  serviceFee,
        rider_tip:       tipAmount,
        total_amount:    total,
        email:           email,
        first_name:      firstName,
        last_name:       lastName,
        phone_number:    mobile,
        items: cartItems.map(item => {
          const foodId = item.food_id ?? item.foodId;
          if (!foodId) {
            console.error('[Checkout] Item missing food_id/foodId — will be skipped:', item);
          }
          return {
            item_id:  Number(foodId ?? item.id),
            quantity: item.quantity,
          };
        }).filter(i => i.item_id > 0),
      };

      if (applicableDiscount != null && applicableDiscount.discount_num != null) {
        body.discount_num = applicableDiscount.discount_num;
      }

      const res = await apiFetch('/customers/me/orders/', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Order failed (${res.status})`);
      }

      const responseData     = await res.json();
      const order_id          = responseData.order_id;
      const confirmedDiscount = responseData.discount_amount ?? discountAmount;
      const confirmedTotal    = subtotal - confirmedDiscount + deliveryFee + serviceFee + tipAmount;

      const orderData = {
        orderId:        order_id,
        restaurant,
        items: cartItems.map(item => ({
          name:     item.name,
          quantity: item.quantity,
          price:    item.price,
          image:    item.image ?? '',
        })),
        subtotal,
        deliveryFee,
        discountAmount: confirmedDiscount,
        tip:   tipAmount,
        total: confirmedTotal,
      };

      if (onPlaceOrder) onPlaceOrder(orderData);

    } catch (err) {
      setPlaceError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  const handleCheckoutFromCart = (restaurantId) => {
    setShowCart(false);
    if (onCheckout && restaurantId !== restaurant?.id) onCheckout(restaurantId);
  };

  const handleNavigateToRestaurant = () => {
    setShowCart(false);
    if (onBack) onBack();
  };
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
            {distanceKm != null && (
              <p className="section-subtitle-checkout" style={{ marginTop: 4 }}>
                Distance to restaurant: <strong>{distanceKm.toFixed(1)} km</strong>
                &nbsp;· Standard ৳10/km · Priority ৳30/km
              </p>
            )}
            <div className="delivery-options" style={{ marginTop: 12 }}>
              <label className={`delivery-option-card ${deliveryOption === 'standard' ? 'selected' : ''}`}>
                <input type="radio" name="delivery" value="standard"
                  checked={deliveryOption === 'standard'}
                  onChange={() => setDeliveryOption('standard')} />
                <div className="option-icon-wrap standard-icon">
                  <Clock size={18} />
                </div>
                <div className="option-content">
                  <div className="option-info">
                    <span className="option-label">Standard delivery</span>
                    <span className="option-time">15 – 30 mins</span>
                  </div>
                  <span className="option-price">
                    {distanceKm != null
                      ? `৳${Math.max(10, Math.round(distanceKm * 10))}`
                      : 'Free'}
                  </span>
                </div>
              </label>
              <label className={`delivery-option-card ${deliveryOption === 'priority' ? 'selected' : ''}`}>
                <input type="radio" name="delivery" value="priority"
                  checked={deliveryOption === 'priority'}
                  onChange={() => setDeliveryOption('priority')} />
                <div className="option-icon-wrap priority-icon">
                  <Zap size={18} />
                </div>
                <div className="option-content">
                  <div className="option-info">
                    <span className="option-label">Priority delivery</span>
                    <span className="option-time">10 – 25 mins · Faster &amp; dedicated rider</span>
                  </div>
                  <span className="option-price priority-price">
                    {distanceKm != null
                      ? `৳${Math.max(10, Math.round(distanceKm * 30))}`
                      : '+ ৳50'}
                  </span>
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

          {/* ── PLACE ORDER ERROR BANNER ─────────────────── */}
          {placeError && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626',
              borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13,
            }}>
              {placeError}
            </div>
          )}

          {/* ── PLACE ORDER BUTTON ───────────────────────── */}
          <button
            className="place-order-btn"
            onClick={handlePlaceOrder}
            disabled={placing}
            style={placing ? { opacity: 0.7, cursor: 'not-allowed' } : {}}
          >
            {placing
              ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Loader2 size={16} className="spin" /> Placing order…
                </span>
              : 'Place order'
            }
          </button>

          <p className="terms-text">
            By making this purchase you agree to our <a href="#">terms and conditions</a>.
          </p>
          <p className="terms-text">
            I agree that placing the order places the order under an obligation to make
            a payment in accordance with the{' '}
            <a href="#">General Terms and Conditions</a>.
          </p>
        </div>

        {/* ── ORDER SUMMARY SIDEBAR ─────────────────────────── */}
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

          {/* ── VOUCHERS / DEALS SECTION ─────────────────── */}
          {activeDiscounts.length > 0 && (
            <div className="vouchers-section">
              <p className="vouchers-title">
                <Tag size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
                Vouchers for your order
              </p>
              <p className="vouchers-subtitle">Select one voucher to apply</p>

              <div className="vouchers-list">
                {activeDiscounts.map((d) => {
                  const minOrder  = parseFloat(d.min_order) || 0;
                  const meetsMin  = subtotal >= minOrder;
                  const shortfall = Math.ceil(minOrder - subtotal);
                  const saving    = Math.round(subtotal * parseFloat(d.percentage) / 100);
                  const isSelected = selectedDiscountNum === d.discount_num;

                  return (
                    <div key={d.discount_num} className={`voucher-ticket ${isSelected ? 'vt-selected' : meetsMin ? 'vt-eligible' : 'vt-locked'}`}>
                      {/* Left coloured stripe */}
                      <div className="vt-stripe" />

                      {/* Notch top + bottom */}
                      <div className="vt-notch vt-notch-top" />
                      <div className="vt-notch vt-notch-bottom" />

                      {/* Body */}
                      <div className="vt-body">
                        <div className="vt-left">
                          <div className="vt-percent">{d.percentage}%</div>
                          <div className="vt-off-label">OFF</div>
                        </div>

                        <div className="vt-divider" />

                        <div className="vt-center">
                          <div className="vt-title">{d.description}</div>
                          {isSelected ? (
                            <div className="vt-saving-badge">Saving ৳{saving}</div>
                          ) : meetsMin ? (
                            <div className="vt-saving-text">৳{saving} off your order</div>
                          ) : (
                            <div className="vt-locked-msg">
                              Add ৳{shortfall} more to unlock
                            </div>
                          )}
                          <div className="vt-meta">Min. order ৳{minOrder}
                            {d.expires_at
                              ? ` · Expires ${new Date(d.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                              : ''}
                          </div>
                        </div>

                        <div className="vt-action">
                          {meetsMin ? (
                            <button
                              className={`vt-btn ${isSelected ? 'vt-btn-remove' : 'vt-btn-apply'}`}
                              onClick={() => handleVoucherToggle(d.discount_num, meetsMin)}
                            >
                              {isSelected ? (
                                <>
                                  <Check size={12} style={{ marginRight: 3 }} />
                                  Applied
                                </>
                              ) : 'Apply'}
                            </button>
                          ) : (
                            <div className="vt-lock-icon">🔒</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="summary-divider" />

          <div className="summary-totals">
            <div className="summary-row"><span>Subtotal</span><span>৳{subtotal}</span></div>
            {discountAmount > 0 && applicableDiscount && (
              <div className="summary-row" style={{ color: '#10b981', fontWeight: 700 }}>
                <span>Discount ({applicableDiscount.percentage}% off)</span>
                <span>−৳{discountAmount}</span>
              </div>
            )}
            <div className="summary-row">
              <span>Delivery fee
                {distanceKm != null && (
                  <span style={{ fontSize: 11, color: 'var(--c-gray-400)', marginLeft: 4 }}>
                    ({distanceKm.toFixed(1)} km)
                  </span>
                )}
              </span>
              <span className={deliveryFee === 0 ? 'free-text' : ''}>
                {deliveryFee === 0 ? 'Free' : `৳${deliveryFee}`}
              </span>
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
            {savings > 0 && <p className="savings-note">You save ৳{savings} 🎉</p>}
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