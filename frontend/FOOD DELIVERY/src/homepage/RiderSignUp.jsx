import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  MapPin, Bike, User, Mail, ChevronDown, ArrowRight,
  UserCheck, ClipboardList, Car, FileText,
  TrendingUp, Star, Shield, Eye, EyeOff, Lock, Phone, X,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { BRAND, COLORS } from '../constants.js';
import './RiderSignUp.css';

const VEHICLES = ['Motorbike', 'Bi-Cycle'];

const STEPS = [
  { Icon: UserCheck,     text: 'Create your profile'              },
  { Icon: ClipboardList, text: 'Fill in your personal information' },
  { Icon: Car,           text: 'Provide your vehicle information'  },
  { Icon: FileText,      text: 'Agree to our service agreement'    },
];

const HERO_FEATURES = [
  { Icon: TrendingUp, text: 'Earn up to ৳25,000 per month on your schedule' },
  { Icon: Bike,       text: 'Deliver across your city with live guidance'    },
  { Icon: Star,       text: 'Top riders earn bonuses and priority orders'    },
  { Icon: Shield,     text: 'Safe, insured deliveries with full support'     },
];

const DEFAULT_CENTER = { lat: 23.7808, lng: 90.4206 };

function CityMapPicker({ onCitySelect }) {
  const mapRef = useRef(null), mapDivRef = useRef(null);
  useEffect(() => {
    if (!document.getElementById('leaflet-css-rider')) {
      const l = document.createElement('link');
      l.id = 'leaflet-css-rider'; l.rel = 'stylesheet';
      l.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(l);
    }
    const init = () => {
      if (!mapDivRef.current || mapRef.current) return;
      const L = window.L;
      const map = L.map(mapDivRef.current).setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], 11);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
      const icon = L.divIcon({
        html: `<div style="width:26px;height:26px;background:${COLORS.primary};border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>`,
        iconSize: [26,26], iconAnchor: [13,26], className: '',
      });
      const marker = L.marker([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], { draggable: true, icon }).addTo(map);
      mapRef.current = map;
      const resolve = async (ll) => {
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${ll.lat}&lon=${ll.lng}&format=json`);
          const d = await r.json();
          const city = d.address?.city || d.address?.town || d.address?.state_district || d.display_name?.split(',')[0] || 'Selected Location';
          onCitySelect({ city, lat: ll.lat, lng: ll.lng });
        } catch { onCitySelect({ city: `${ll.lat.toFixed(4)}, ${ll.lng.toFixed(4)}`, lat: ll.lat, lng: ll.lng }); }
      };
      marker.on('dragend', () => resolve(marker.getLatLng()));
      map.on('click', e => { marker.setLatLng(e.latlng); resolve(e.latlng); });
    };
    if (window.L) init();
    else { const s = document.createElement('script'); s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; s.onload = init; document.head.appendChild(s); }
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []);
  return <div ref={mapDivRef} style={{ width: '100%', height: '200px', borderRadius: 10, border: '2px solid var(--c-gray-200)', overflow: 'hidden', marginTop: 8 }} />;
}

// ─── Step 1: Collect basic info only — backend call happens in RiderOnBoarding phase 4 ───
const RiderSignUp = ({ onRiderOnBoarding, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    city: '', cityLat: null, cityLng: null, vehicle: '',
    name: '', surname: '', phone: '', email: '',
    password: '', password2: '',
    isOver18: '', privacyAccepted: false,
  });
  const [focused,        setFocused]        = useState(null);
  const [showMap,        setShowMap]        = useState(false);
  const [showPassword,   setShowPassword]   = useState(false);
  const [showPassword2,  setShowPassword2]  = useState(false);
  const [citySuggestions,setCitySuggestions]= useState([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const debounceRef = useRef(null);

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setFormData(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleCitySelect = ({ city, lat, lng }) => {
    setFormData(p => ({ ...p, city, cityLat: lat, cityLng: lng }));
    setCitySuggestions([]);
    setShowMap(false);
    toast.success(`City set to: ${city}`);
  };

  // Nominatim city autocomplete
  const fetchCitySuggestions = useCallback(async (q) => {
    if (q.trim().length < 3) { setCitySuggestions([]); return; }
    setSuggestLoading(true);
    try {
      const res  = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&countrycodes=bd&format=json&limit=5&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      const seen = new Set();
      const results = [];
      for (const r of data) {
        const addr = r.address || {};
        const city = addr.city || addr.town || addr.village || addr.county || addr.state_district || r.display_name.split(',')[0];
        if (!seen.has(city)) {
          seen.add(city);
          results.push({ city, label: r.display_name, lat: parseFloat(r.lat), lng: parseFloat(r.lon) });
        }
      }
      setCitySuggestions(results);
    } catch { setCitySuggestions([]); }
    finally { setSuggestLoading(false); }
  }, []);

  const handleCityInput = (e) => {
    const val = e.target.value;
    setFormData(p => ({ ...p, city: val, cityLat: null, cityLng: null }));
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchCitySuggestions(val), 400);
  };

  // ── STEP 1: Local validation only — backend call deferred to RiderOnBoarding phase 4 ──
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.city || !formData.vehicle || !formData.name || !formData.phone || !formData.email) {
      toast.error('Please fill in all required fields'); return;
    }
    if (!formData.password || formData.password.length < 8) {
      toast.error('Password must be at least 8 characters'); return;
    }
    if (formData.password !== formData.password2) {
      toast.error('Passwords do not match'); return;
    }
    if (formData.isOver18 === 'no') {
      toast.error('You must be over 18 to become a rider'); return;
    }
    if (!formData.isOver18) {
      toast.error('Please confirm you are over 18'); return;
    }
    if (!formData.privacyAccepted) {
      toast.error('Please accept the Rider Privacy Statement'); return;
    }

    // All good — pass step-1 data to onboarding; backend fires at phase 4
    toast.success('Step 1 complete! Continue to onboarding.');
    setTimeout(() => onRiderOnBoarding?.({ ...formData, type: 'rider' }), 600);
  };

  const fg = id => `signup-form-group ${focused === id ? 'focused' : ''}`;

  return (
    <div className="signup-container">
      <Toaster position="top-center" toastOptions={{
        style: { borderRadius: '10px', fontFamily: 'Segoe UI,sans-serif', fontSize: '14px' },
        success: { iconTheme: { primary: COLORS.primary, secondary: '#fff' } },
      }} />

      {/* ── LEFT ── */}
      <div className="signup-left-side">
        <motion.div className="signup-logo-section"
          initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.18)', border: '1.5px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Bike size={22} color="white" strokeWidth={2} />
            </div>
            <div className="signup-logo" style={{ marginBottom: 0 }}>
              {BRAND.name}<span style={{ fontSize: '0.5em', fontWeight: 300, opacity: 0.8, marginLeft: 8 }}>rider</span>
            </div>
          </div>

          <div className="signup-tagline">
            Sign up today and be part of the {BRAND.name} rider family!
          </div>

          <div className="signup-features">
            {HERO_FEATURES.map(({ Icon, text }, i) => (
              <motion.div key={i} className="signup-feature-item"
                initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.12 + i * 0.08, duration: 0.38, ease: [0.22, 1, 0.36, 1] }}>
                <div className="signup-feature-icon"><Icon size={16} strokeWidth={2} /></div>
                <span>{text}</span>
              </motion.div>
            ))}
          </div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
            style={{ marginTop: 20, background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '14px 16px' }}>
            <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, opacity: 0.88 }}>Complete your application in 4 steps:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {STEPS.map(({ Icon, text }, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, opacity: 0.88 }}>
                  <span style={{ width: 20, height: 20, background: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{i + 1}</span>
                  <Icon size={13} strokeWidth={2} color="rgba(255,255,255,0.85)" style={{ flexShrink: 0 }} />
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* ── RIGHT ── */}
      <div className="signup-right-side">
        <motion.div className="signup-card"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}>

          <div className="signup-header">
            <div className="signup-brand-pill">{BRAND.name} Rider — Step 1 of 2</div>
            <h1>Create your profile</h1>
            <p>Fill in your basic info. You'll complete your documents in the next step.</p>
          </div>

          <form onSubmit={handleSubmit} noValidate>

            {/* City with autocomplete */}
            <div className={fg('city')} style={{ position: 'relative' }}>
              <label htmlFor="rs-city">Your City *</label>
              <div className="signup-input-wrapper">
                <MapPin size={14} className="signup-input-icon" />
                <input type="text" id="rs-city" name="city" value={formData.city}
                  onChange={handleCityInput}
                  placeholder="Type city name…"
                  onFocus={() => setFocused('city')}
                  onBlur={() => setTimeout(() => setCitySuggestions([]), 200)}
                  autoComplete="off"
                  required />
                {formData.city && (
                  <button type="button" onClick={() => {
                    setFormData(p => ({ ...p, city: '', cityLat: null, cityLng: null }));
                    setCitySuggestions([]);
                  }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 6px', color: 'var(--c-gray-400)', display: 'flex', alignItems: 'center' }}>
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Suggestions dropdown */}
              {(suggestLoading || citySuggestions.length > 0) && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
                  background: 'var(--c-white)', border: '1.5px solid var(--c-gray-200)',
                  borderRadius: 10, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                  marginTop: 4,
                }}>
                  {suggestLoading && (
                    <div style={{ padding: '10px 14px', fontSize: 13, color: 'var(--c-gray-400)' }}>Searching…</div>
                  )}
                  {!suggestLoading && citySuggestions.map((s, i) => (
                    <button key={i} type="button"
                      onMouseDown={() => handleCitySelect({ city: s.city, lat: s.lat, lng: s.lng })}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'flex-start', gap: 10,
                        padding: '10px 14px', background: 'none', border: 'none',
                        borderBottom: i < citySuggestions.length - 1 ? '1px solid var(--c-gray-100)' : 'none',
                        cursor: 'pointer', textAlign: 'left', fontSize: 13,
                        color: 'var(--c-gray-700)', fontFamily: 'var(--font)',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--c-primary-light)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <MapPin size={14} style={{ color: 'var(--c-primary)', flexShrink: 0, marginTop: 1 }} />
                      <div>
                        <div style={{ fontWeight: 600 }}>{s.city}</div>
                        <div style={{ fontSize: 11, color: 'var(--c-gray-400)', marginTop: 1 }}>{s.label}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {formData.cityLat && (
                <p style={{ fontSize: 12, color: 'var(--c-primary)', marginTop: 6, fontWeight: 600 }}>
                  📍 {formData.city} ({formData.cityLat.toFixed(4)}, {formData.cityLng.toFixed(4)})
                </p>
              )}

              <button type="button" onClick={() => setShowMap(p => !p)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 7, background: 'var(--c-primary-light)', color: 'var(--c-primary)', border: '1.5px solid var(--c-primary)', borderRadius: 8, padding: '5px 11px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                <MapPin size={12} />{showMap ? 'Hide map' : 'Pick city on map'}
              </button>
              {showMap && (
                <>
                  <p style={{ fontSize: 11, color: 'var(--c-gray-400)', marginTop: 6, marginBottom: 2 }}>Click the map to set your city</p>
                  <CityMapPicker onCitySelect={handleCitySelect} />
                </>
              )}
            </div>

            {/* Vehicle */}
            <div className={fg('vehicle')}>
              <label htmlFor="rs-vehicle">Vehicle *</label>
              <div className="signup-input-wrapper" style={{ position: 'relative' }}>
                <Bike size={14} className="signup-input-icon" />
                <select id="rs-vehicle" name="vehicle" value={formData.vehicle}
                  onChange={handleChange} required
                  onFocus={() => setFocused('vehicle')} onBlur={() => setFocused(null)}
                  style={{ width: '100%', padding: '11px 36px 11px 38px', border: '2px solid var(--c-gray-200)', borderRadius: 'var(--radius)', fontSize: 14, fontFamily: 'var(--font)', background: 'var(--c-gray-50)', color: 'var(--c-gray-900)', outline: 'none', appearance: 'none', cursor: 'pointer' }}>
                  <option value="">Choose your vehicle</option>
                  {VEHICLES.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: 12, pointerEvents: 'none', color: 'var(--c-gray-400)' }} />
              </div>
            </div>

            {/* Name row */}
            <div className="signup-form-row">
              <div className={fg('name')}>
                <label htmlFor="rs-name">Name *</label>
                <div className="signup-input-wrapper">
                  <User size={14} className="signup-input-icon" />
                  <input type="text" id="rs-name" name="name" value={formData.name}
                    onChange={handleChange} placeholder="First name" required
                    onFocus={() => setFocused('name')} onBlur={() => setFocused(null)} />
                </div>
              </div>
              <div className={fg('surname')}>
                <label htmlFor="rs-surname">Surname</label>
                <div className="signup-input-wrapper">
                  <User size={14} className="signup-input-icon" />
                  <input type="text" id="rs-surname" name="surname" value={formData.surname}
                    onChange={handleChange} placeholder="Last name"
                    onFocus={() => setFocused('surname')} onBlur={() => setFocused(null)} />
                </div>
              </div>
            </div>

            {/* Phone */}
            <div className="signup-form-group">
              <label>Phone Number *</label>
              <div style={{ display: 'flex' }}>
                <span style={{ padding: '11px 12px', background: 'var(--c-gray-100)', border: '2px solid var(--c-gray-200)', borderRight: 'none', borderRadius: 'var(--radius) 0 0 var(--radius)', fontSize: 14, fontWeight: 600, color: 'var(--c-gray-700)', display: 'flex', alignItems: 'center' }}>+880</span>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
                  placeholder="1712345678" required
                  style={{ flex: 1, padding: '11px 12px', border: '2px solid var(--c-gray-200)', borderLeft: 'none', borderRadius: '0 var(--radius) var(--radius) 0', fontSize: 14, fontFamily: 'var(--font)', background: 'var(--c-gray-50)', color: 'var(--c-gray-900)', outline: 'none', minWidth: 0 }} />
              </div>
            </div>

            {/* Email */}
            <div className={fg('email')}>
              <label htmlFor="rs-email">Email *</label>
              <div className="signup-input-wrapper">
                <Mail size={14} className="signup-input-icon" />
                <input type="email" id="rs-email" name="email" value={formData.email}
                  onChange={handleChange} placeholder="your@email.com" required
                  onFocus={() => setFocused('email')} onBlur={() => setFocused(null)} />
              </div>
            </div>

            {/* Age */}
            <div className="signup-form-group">
              <label>Are you over 18? *</label>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                {['yes', 'no'].map(val => (
                  <label key={val} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '9px', borderRadius: 'var(--radius)', border: `2px solid ${formData.isOver18 === val ? 'var(--c-primary)' : 'var(--c-gray-200)'}`, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: formData.isOver18 === val ? 'var(--c-primary)' : 'var(--c-gray-500)', background: formData.isOver18 === val ? 'var(--c-primary-light)' : 'var(--c-gray-50)', transition: 'all 0.18s' }}>
                    <input type="radio" name="isOver18" value={val} checked={formData.isOver18 === val} onChange={handleChange} style={{ accentColor: 'var(--c-primary)', cursor: 'pointer' }} />
                    {val === 'yes' ? 'Yes' : 'No'}
                  </label>
                ))}
              </div>
            </div>

            {/* Password */}
            <div className={fg('password')}>
              <label htmlFor="rs-password">Password *</label>
              <div className="signup-input-wrapper">
                <Lock size={14} className="signup-input-icon" />
                <input type={showPassword ? 'text' : 'password'} id="rs-password" name="password"
                  value={formData.password} onChange={handleChange}
                  placeholder="Min. 8 characters" required
                  onFocus={() => setFocused('password')} onBlur={() => setFocused(null)} />
                <button type="button" onClick={() => setShowPassword(p => !p)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 6px', color: 'var(--c-gray-400)', display: 'flex', alignItems: 'center' }}>
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className={fg('password2')}>
              <label htmlFor="rs-password2">Confirm Password *</label>
              <div className="signup-input-wrapper">
                <Lock size={14} className="signup-input-icon" />
                <input type={showPassword2 ? 'text' : 'password'} id="rs-password2" name="password2"
                  value={formData.password2} onChange={handleChange}
                  placeholder="Re-enter your password" required
                  onFocus={() => setFocused('password2')} onBlur={() => setFocused(null)} />
                <button type="button" onClick={() => setShowPassword2(p => !p)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 6px', color: 'var(--c-gray-400)', display: 'flex', alignItems: 'center' }}>
                  {showPassword2 ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Privacy */}
            <div className="signup-checkbox-group">
              <input type="checkbox" id="rs-privacy" name="privacyAccepted"
                checked={formData.privacyAccepted} onChange={handleChange} />
              <label htmlFor="rs-privacy">
                I have read and understand the <a href="#">Rider Privacy Statement</a>.
              </label>
            </div>

            <motion.button type="submit" className="signup-submit-btn"
              whileHover={{ y: -2, boxShadow: '0 8px 22px rgba(215,15,100,0.38)' }}
              whileTap={{ y: 0 }}>
              Continue to Onboarding <ArrowRight size={15} style={{ marginLeft: 5 }} />
            </motion.button>
          </form>

          <div className="signup-signin-link">
            Already have an account? <a onClick={onSwitchToLogin}>Log in</a>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default RiderSignUp;