import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Eye, EyeOff, Mail, Lock, Phone, User, Building2,
  Utensils, Smartphone, MapPin, ArrowRight, Globe,
  TrendingUp, CheckCircle, DollarSign, Search, X,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import './RestaurantSignUp.css';
import authService from '../Authservice.js';
import { COLORS, BRAND } from '../constants.js';

const BENEFITS = [
  { Icon: TrendingUp,   text: 'Reach thousands of customers in your city' },
  { Icon: CheckCircle,  text: 'Easy order management in real time'          },
  { Icon: DollarSign,   text: 'Grow your revenue with promotions'           },
];

const BUSINESS_TYPES = [
  'Restaurant','Cafe','Fast Food','Bakery','Dessert Shop',
  'Cloud Kitchen','Food Truck','Catering Service',
];

const DEFAULT_CENTER = { lat: 23.7808, lng: 90.4206 }; // Dhaka

// ── Lightweight Leaflet map for address picking ──────────────────────────
function AddressMapPicker({ onLocationSelect, initialLat, initialLng }) {
  const mapRef    = useRef(null);
  const leafletRef = useRef(null);
  const markerRef  = useRef(null);
  const mapDivRef  = useRef(null);

  useEffect(() => {
    // Load Leaflet CSS
    if (!document.getElementById('leaflet-css-signup')) {
      const link = document.createElement('link');
      link.id   = 'leaflet-css-signup';
      link.rel  = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    // Load Leaflet JS
    const initMap = () => {
      if (!mapDivRef.current || mapRef.current) return;
      const L = window.L;
      const lat = initialLat || DEFAULT_CENTER.lat;
      const lng = initialLng || DEFAULT_CENTER.lng;

      const map = L.map(mapDivRef.current).setView([lat, lng], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
      }).addTo(map);

      const icon = L.divIcon({
        html: `<div style="width:28px;height:28px;background:${COLORS.primary};border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>`,
        iconSize: [28, 28], iconAnchor: [14, 28], className: '',
      });

      const marker = L.marker([lat, lng], { draggable: true, icon }).addTo(map);
      markerRef.current = marker;
      mapRef.current    = map;
      leafletRef.current = L;

      const onMove = (e) => {
        const { lat: la, lng: lo } = e.latlng || marker.getLatLng();
        reverseGeocode(la, lo);
      };
      marker.on('dragend', onMove);
      map.on('click', (e) => { marker.setLatLng(e.latlng); onMove(e); });
    };

    if (window.L) { initMap(); }
    else {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = initMap;
      document.head.appendChild(script);
    }
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []);

  const reverseGeocode = async (lat, lng) => {
    try {
      const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`);
      const data = await res.json();
      // Extract the best city name from Nominatim's address breakdown
      const addr = data.address || {};
      const city = addr.city || addr.town || addr.village || addr.county ||
                   addr.state_district || addr.state || 'Unknown';
      onLocationSelect({
        lat, lng,
        address: data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        city,
      });
    } catch {
      onLocationSelect({ lat, lng, address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, city: 'Unknown' });
    }
  };

  return (
    <div ref={mapDivRef} style={{ width: '100%', height: '220px', borderRadius: '10px', border: '2px solid var(--c-gray-200)', overflow: 'hidden' }} />
  );
}

const RestaurantPartnerSignUp = ({ onSwitchToLogin, onRiderSignUp, onSignUpSuccess }) => {
  const [formData, setFormData] = useState({
    businessName: '', ownerFirstName: '', ownerLastName: '',
    businessType: '', email: '', phone: '', password: '', password2: '',
    address: '', latitude: null, longitude: null, city: '',
    sameAsPhone: false, whatsappUpdates: true,
  });
  const [showPassword,  setShowPassword]  = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [showMap,       setShowMap]       = useState(false);
  const [focused,       setFocused]       = useState(null);
  const [suggestions,   setSuggestions]   = useState([]);
  const [suggestLoading,setSuggestLoading]= useState(false);
  const debounceRef = useRef(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleLocationSelect = ({ lat, lng, address, city }) => {
    setFormData(prev => ({ ...prev, latitude: lat, longitude: lng, address, city: city || '' }));
    setSuggestions([]);
  };

  // Nominatim autocomplete — fires 400ms after user stops typing
  const fetchSuggestions = useCallback(async (q) => {
    if (q.trim().length < 3) { setSuggestions([]); return; }
    setSuggestLoading(true);
    try {
      const res  = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&countrycodes=bd&format=json&limit=5&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      setSuggestions(data.map(r => {
        const addr = r.address || {};
        const city = addr.city || addr.town || addr.village || addr.county ||
                     addr.state_district || addr.state || '';
        return {
          label: r.display_name,
          lat:   parseFloat(r.lat),
          lng:   parseFloat(r.lon),
          city,
        };
      }));
    } catch { setSuggestions([]); }
    finally { setSuggestLoading(false); }
  }, []);

  const handleAddressInput = (e) => {
    const val = e.target.value;
    setFormData(prev => ({ ...prev, address: val, latitude: null, longitude: null, city: '' }));
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 400);
  };

  const handleSuggestionPick = ({ label, lat, lng, city }) => {
    setFormData(prev => ({ ...prev, address: label, latitude: lat, longitude: lng, city }));
    setSuggestions([]);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\d{10,11}$/;

    if (!formData.businessName || !formData.ownerFirstName || !formData.ownerLastName ||
        !formData.businessType  || !formData.email          || !formData.phone        ||
        !formData.password      || !formData.password2) {
      toast.error('Please fill in all required fields'); return;
    }
    if (!emailRegex.test(formData.email))  { toast.error('Please enter a valid email address'); return; }
    if (!phoneRegex.test(formData.phone))  { toast.error('Phone: 10 or 11 digits after +880'); return; }
    if (formData.password.length < 8)      { toast.error('Password must be at least 8 characters'); return; }
    if (formData.password !== formData.password2) { toast.error('Passwords do not match'); return; }

    setLoading(true);
    try {
      const response = await authService.registerRestaurantPartner({
        businessName:   formData.businessName,
        ownerFirstName: formData.ownerFirstName,
        ownerLastName:  formData.ownerLastName,
        businessType:   formData.businessType,
        email:          formData.email,
        phone:          formData.phone,
        password:       formData.password,
        password2:      formData.password2,
        role:           'RESTAURANT',
        address:        formData.address,
        city:           formData.city,
        latitude:       formData.latitude,
        longitude:      formData.longitude,
      });
      toast.success('Registration successful! Welcome aboard!');
      setTimeout(() => {
        onSignUpSuccess({
          businessName: formData.businessName,
          email:        formData.email,
          type:         'restaurant_partner',
          user:         response.user,
          restaurant:   response.restaurant,
        });
      }, 700);
    } catch (error) {
      toast.error(error.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fg = (id) => `form-group ${focused === id ? 'focused' : ''}`;

  return (
    <div className="restaurant-signup-container">
      <Toaster position="top-center" toastOptions={{
        style: { borderRadius: '10px', fontFamily: 'Segoe UI,sans-serif', fontSize: '14px' },
        success: { iconTheme: { primary: COLORS.primary, secondary: '#fff' } },
      }} />

      {/* LEFT HERO */}
      <div className="restaurant-signup-left">
        <motion.div className="restaurant-hero-content"
          initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
          <div className="restaurant-logo">{BRAND.name}</div>
          <h1 className="restaurant-hero-title">Register your restaurant with us!</h1>
          <p className="restaurant-hero-subtitle">
            Sign up easily, showcase your menu, and start reaching new customers.
          </p>
          <div className="restaurant-benefits">
            {BENEFITS.map(({ Icon, text }, i) => (
              <motion.div key={i} className="benefit-item"
                initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.12 + i * 0.08, duration: 0.38 }}>
                <span className="benefit-icon"><Icon size={20} strokeWidth={2} /></span>
                <span className="benefit-text">{text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* RIGHT FORM */}
      <div className="restaurant-signup-right">
        <motion.div className="restaurant-signup-card"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>

          <div className="restaurant-signup-header">
            <h2>Ready to boost your sales?</h2>
            <p>Join our platform and expand your business</p>
          </div>

          <form className="restaurant-signup-form" onSubmit={handleSubmit} noValidate>

            {/* Business Name */}
            <div className={fg('businessName')}>
              <label>Your Business Name *</label>
              <div className="form-group-wrapper">
                <Building2 size={15} className="form-icon" />
                <input type="text" name="businessName" placeholder="Enter your business name"
                  value={formData.businessName} onChange={handleChange}
                  onFocus={() => setFocused('businessName')} onBlur={() => setFocused(null)} />
              </div>
            </div>

            {/* Owner Names */}
            <div className="form-row">
              <div className={fg('ownerFirstName')}>
                <label>Owner First Name *</label>
                <div className="form-group-wrapper">
                  <User size={15} className="form-icon" />
                  <input type="text" name="ownerFirstName" placeholder="First name"
                    value={formData.ownerFirstName} onChange={handleChange}
                    onFocus={() => setFocused('ownerFirstName')} onBlur={() => setFocused(null)} />
                </div>
              </div>
              <div className={fg('ownerLastName')}>
                <label>Owner Last Name *</label>
                <div className="form-group-wrapper">
                  <User size={15} className="form-icon" />
                  <input type="text" name="ownerLastName" placeholder="Last name"
                    value={formData.ownerLastName} onChange={handleChange}
                    onFocus={() => setFocused('ownerLastName')} onBlur={() => setFocused(null)} />
                </div>
              </div>
            </div>

            {/* Business Type */}
            <div className={fg('businessType')}>
              <label>Business Type *</label>
              <div className="form-group-wrapper">
                <Utensils size={15} className="form-icon" />
                <select name="businessType" value={formData.businessType} onChange={handleChange}
                  onFocus={() => setFocused('businessType')} onBlur={() => setFocused(null)}>
                  <option value="">Select business type</option>
                  {BUSINESS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {/* Email */}
            <div className={fg('email')}>
              <label>Business Email *</label>
              <div className="form-group-wrapper">
                <Mail size={15} className="form-icon" />
                <input type="email" name="email" placeholder="business@example.com"
                  value={formData.email} onChange={handleChange}
                  onFocus={() => setFocused('email')} onBlur={() => setFocused(null)} />
              </div>
            </div>

            {/* Password */}
            <div className={fg('password')}>
              <label>Password *</label>
              <div className="form-group-wrapper">
                <Lock size={15} className="form-icon" />
                <input type={showPassword ? 'text' : 'password'} name="password"
                  placeholder="Min. 8 characters" value={formData.password} onChange={handleChange}
                  onFocus={() => setFocused('password')} onBlur={() => setFocused(null)} />
                <button type="button" className="pw-toggle" onClick={() => setShowPassword(p => !p)}>
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className={fg('password2')}>
              <label>Confirm Password *</label>
              <div className="form-group-wrapper">
                <Lock size={15} className="form-icon" />
                <input type={showPassword2 ? 'text' : 'password'} name="password2"
                  placeholder="Re-enter your password" value={formData.password2} onChange={handleChange}
                  onFocus={() => setFocused('password2')} onBlur={() => setFocused(null)} />
                <button type="button" className="pw-toggle" onClick={() => setShowPassword2(p => !p)}>
                  {showPassword2 ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Phone */}
            <div className="form-group">
              <label>Mobile Phone Number *</label>
              <div className="phone-input-wrapper">
                <span className="country-code">+880</span>
                <input type="tel" name="phone" placeholder="1712345678"
                  value={formData.phone} onChange={handleChange} />
              </div>
            </div>

            {/* ── Address + Suggestions + Map ── */}
            <div className={fg('address')} style={{ position: 'relative' }}>
              <label>Restaurant Address</label>
              <div className="form-group-wrapper">
                <MapPin size={15} className="form-icon" />
                <input type="text" name="address" placeholder="Type to search address…"
                  value={formData.address}
                  onChange={handleAddressInput}
                  onFocus={() => setFocused('address')}
                  onBlur={() => setTimeout(() => setSuggestions([]), 200)}
                  autoComplete="off"
                />
                {formData.address && (
                  <button type="button" onClick={() => {
                    setFormData(prev => ({ ...prev, address: '', latitude: null, longitude: null, city: '' }));
                    setSuggestions([]);
                  }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 6px', color: 'var(--c-gray-400)', display: 'flex', alignItems: 'center' }}>
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Suggestions dropdown */}
              {(suggestLoading || suggestions.length > 0) && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
                  background: 'var(--c-white)', border: '1.5px solid var(--c-gray-200)',
                  borderRadius: 10, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                  marginTop: 4,
                }}>
                  {suggestLoading && (
                    <div style={{ padding: '10px 14px', fontSize: 13, color: 'var(--c-gray-400)' }}>
                      Searching…
                    </div>
                  )}
                  {!suggestLoading && suggestions.map((s, i) => (
                    <button key={i} type="button"
                      onMouseDown={() => handleSuggestionPick(s)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'flex-start', gap: 10,
                        padding: '10px 14px', background: 'none', border: 'none',
                        borderBottom: i < suggestions.length - 1 ? '1px solid var(--c-gray-100)' : 'none',
                        cursor: 'pointer', textAlign: 'left', fontSize: 13,
                        color: 'var(--c-gray-700)', fontFamily: 'var(--font)',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--c-primary-light)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <MapPin size={14} style={{ color: 'var(--c-primary)', flexShrink: 0, marginTop: 1 }} />
                      <span style={{ lineHeight: 1.4 }}>{s.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Picked location confirmation */}
              {formData.latitude && (
                <p style={{ fontSize: 12, color: 'var(--c-primary)', marginTop: 6, fontWeight: 600 }}>
                  📍 {formData.city || 'Location set'} ({formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)})
                </p>
              )}
            </div>

            <button type="button" className="map-picker-toggle"
              onClick={() => setShowMap(p => !p)}>
              <MapPin size={14} />
              {showMap ? 'Hide map' : 'Pick location on map'}
            </button>

            {showMap && (
              <div className="map-picker-wrapper">
                <p className="map-picker-hint">Click or drag the pin to set your restaurant location</p>
                <AddressMapPicker
                  onLocationSelect={handleLocationSelect}
                  initialLat={formData.latitude}
                  initialLng={formData.longitude}
                />
                {formData.latitude && (
                  <p className="map-coords">
                    📍 {formData.latitude.toFixed(5)}, {formData.longitude.toFixed(5)}
                  </p>
                )}
              </div>
            )}

            {/* Checkboxes */}
            <div className="checkbox-group">
              <input type="checkbox" id="sameAsPhone" name="sameAsPhone"
                checked={formData.sameAsPhone} onChange={handleChange} />
              <label htmlFor="sameAsPhone">My Business Phone is the same as my Mobile Number</label>
            </div>
            <div className="checkbox-group whatsapp-checkbox">
              <input type="checkbox" id="whatsappUpdates" name="whatsappUpdates"
                checked={formData.whatsappUpdates} onChange={handleChange} />
              <label htmlFor="whatsappUpdates">
                I'd like updates & promotions by <span className="whatsapp-text">WhatsApp</span>
              </label>
            </div>

            <motion.button type="submit" className="register-btn" disabled={loading}
              whileHover={!loading ? { y: -2 } : {}} whileTap={!loading ? { y: 0 } : {}}>
              {loading
                ? <span className="btn-loading"><span/><span/><span/></span>
                : <> Register <ArrowRight size={15} style={{ marginLeft: 5 }} /> </>}
            </motion.button>

            <div className="form-footer">
              <p>Already have an account? <a onClick={onSwitchToLogin}>Login</a></p>
              <p>Want to be a rider? <a href="#" onClick={(e) => { e.preventDefault(); onRiderSignUp(); }}>Click here</a></p>
              <p className="terms-text">
                This site is protected by reCAPTCHA and the Google Privacy Policy and Terms of Service apply.
              </p>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default RestaurantPartnerSignUp;