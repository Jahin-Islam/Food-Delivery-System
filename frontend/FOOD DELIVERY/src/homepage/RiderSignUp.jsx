import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  MapPin, Bike, User, Phone, Mail, ChevronDown,
  ArrowRight, UserCheck, ClipboardList, Car, FileText,
  Sun, Moon, LogIn,
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

const DEFAULT_CENTER = { lat: 23.7808, lng: 90.4206 }; // Dhaka

// ── Leaflet city-picker map ───────────────────────────────────────────────
function CityMapPicker({ onCitySelect }) {
  const mapRef    = useRef(null);
  const mapDivRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (!document.getElementById('leaflet-css-rider')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css-rider'; link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    const initMap = () => {
      if (!mapDivRef.current || mapRef.current) return;
      const L   = window.L;
      const map = L.map(mapDivRef.current).setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], 11);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);

      const icon = L.divIcon({
        html: `<div style="width:26px;height:26px;background:${COLORS.primary};border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>`,
        iconSize: [26, 26], iconAnchor: [13, 26], className: '',
      });

      const marker = L.marker([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], { draggable: true, icon }).addTo(map);
      markerRef.current = marker;
      mapRef.current    = map;

      const resolve = async (latlng) => {
        try {
          const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latlng.lat}&lon=${latlng.lng}&format=json`);
          const data = await res.json();
          const city = data.address?.city || data.address?.town || data.address?.state_district || data.display_name?.split(',')[0] || 'Selected Location';
          onCitySelect({ city, lat: latlng.lat, lng: latlng.lng });
        } catch {
          onCitySelect({ city: `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`, lat: latlng.lat, lng: latlng.lng });
        }
      };

      marker.on('dragend', () => resolve(marker.getLatLng()));
      map.on('click', (e) => { marker.setLatLng(e.latlng); resolve(e.latlng); });
    };

    if (window.L) { initMap(); }
    else {
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      s.onload = initMap;
      document.head.appendChild(s);
    }
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []);

  return (
    <div ref={mapDivRef}
      style={{ width: '100%', height: '200px', borderRadius: '10px', border: '2px solid var(--c-gray-200)', overflow: 'hidden' }} />
  );
}

const RiderSignUp = ({ onSignUpSuccess, onRiderOnBoarding, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    city: '', cityLat: null, cityLng: null,
    vehicle: '', name: '', surname: '',
    phone: '', email: '', isOver18: '', privacyAccepted: false,
  });
  const [loading,   setLoading]   = useState(false);
  const [focused,   setFocused]   = useState(null);
  const [showMap,   setShowMap]   = useState(false);
  const [darkMode,  setDarkMode]  = useState(() => document.documentElement.getAttribute('data-theme') === 'dark');

  // Sync dark mode with the global theme
  useEffect(() => {
    const obs = new MutationObserver(() => {
      setDarkMode(document.documentElement.getAttribute('data-theme') === 'dark');
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  const toggleDark = () => {
    const next = !darkMode;
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    try { localStorage.setItem('fp_theme', next ? 'dark' : 'light'); } catch {}
    setDarkMode(next);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleCitySelect = ({ city, lat, lng }) => {
    setFormData(prev => ({ ...prev, city, cityLat: lat, cityLng: lng }));
    setShowMap(false);
    toast.success(`City set to: ${city}`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.city || !formData.vehicle || !formData.name || !formData.phone || !formData.email || !formData.isOver18)
      { toast.error('Please fill in all required fields'); return; }
    if (formData.isOver18 === 'no')
      { toast.error('You must be over 18 to become a rider'); return; }
    if (!formData.privacyAccepted)
      { toast.error('Please accept the Rider Privacy Statement'); return; }

    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 600));
      toast.success('Profile created! Moving to onboarding...');
      setTimeout(() => onRiderOnBoarding({ ...formData, type: 'rider' }), 800);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fg = (id) => `input-group ${focused === id ? 'focused' : ''}`;

  return (
    <div className="rider-signup-page">
      <Toaster position="top-center" toastOptions={{
        style: { borderRadius: '10px', fontFamily: 'Segoe UI,sans-serif', fontSize: '14px' },
        success: { iconTheme: { primary: '#fff', secondary: COLORS.primary } },
      }} />

      {/* HEADER */}
      <header className="rider-header">
        <div className="rider-logo">
          <div className="rider-logo-fp">
            <Bike size={20} color={COLORS.primary} strokeWidth={2.5} />
          </div>
          <span className="logo-text">{BRAND.name}</span>
          <span className="logo-sub-text">rider</span>
        </div>
        <div className="rider-header-right">
          <button className="lang-btn active">EN</button>
          <button className="lang-btn">BN</button>
          <button className="theme-toggle-btn" onClick={toggleDark} title="Toggle dark mode">
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      {/* MAIN */}
      <div className="rider-content">
        {/* LEFT */}
        <div className="rider-left">
          <motion.div className="hero-section"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
            <h1>Sign up today and be a part of the {BRAND.name} rider family!</h1>
            <p>There is an opportunity to earn up to 25,000 Taka per month.</p>
          </motion.div>

          <motion.div className="info-card"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
            <h2>Complete your application in 4 steps:</h2>
            <div className="card-body">
              <div className="steps">
                {STEPS.map(({ Icon, text }, i) => (
                  <motion.div key={i} className="step-item"
                    initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.18 + i * 0.08, duration: 0.35 }}>
                    <div className="step-number">{i + 1}</div>
                    <div className="step-icon">
                      <Icon size={14} strokeWidth={2} color="rgba(255,255,255,0.9)" />
                    </div>
                    <span>{text}</span>
                  </motion.div>
                ))}
              </div>
              <div className="rider-image">
                <div className="rider-illustration">
                  <div className="rider-figure">
                    <div className="rider-head" />
                    <div className="rider-body" />
                  </div>
                  <div className="bike-body">
                    <div className="bike-frame" />
                    <div className="bike-handlebar" />
                    <div className="bike-seat" />
                    <div className="bike-wheel back" />
                    <div className="bike-wheel front" />
                  </div>
                </div>
              </div>
            </div>
            <div className="buildings">
              {[...Array(6)].map((_, i) => <div key={i} className="building" />)}
            </div>
          </motion.div>
        </div>

        {/* RIGHT — wider form */}
        <motion.div className="rider-right"
          initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
          <div className="form-container">
            <h2>Create your profile</h2>

            <form onSubmit={handleSubmit} noValidate>

              {/* City — via map or typed */}
              <div className={fg('city')}>
                <label className="input-label">Your City *</label>
                <div className="input-wrapper-r">
                  <MapPin size={14} className="input-icon-r" />
                  <input type="text" name="city" value={formData.city}
                    onChange={handleChange} placeholder="Type or pick from map"
                    className="input-field" required
                    onFocus={() => setFocused('city')} onBlur={() => setFocused(null)} />
                </div>
                <button type="button" className="map-toggle-btn"
                  onClick={() => setShowMap(p => !p)}>
                  <MapPin size={13} />
                  {showMap ? 'Hide map' : 'Pick city on map'}
                </button>
                {showMap && (
                  <div className="city-map-wrapper">
                    <p className="map-hint">Click the map to set your city</p>
                    <CityMapPicker onCitySelect={handleCitySelect} />
                  </div>
                )}
              </div>

              {/* Vehicle */}
              <div className={fg('vehicle')}>
                <label className="input-label">Vehicle *</label>
                <div className="input-wrapper-r">
                  <Bike size={14} className="input-icon-r" />
                  <select name="vehicle" value={formData.vehicle} onChange={handleChange}
                    className="input-field" required
                    onFocus={() => setFocused('vehicle')} onBlur={() => setFocused(null)}>
                    <option value="">Choose your vehicle</option>
                    {VEHICLES.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <ChevronDown size={14} className="select-arr" />
                </div>
              </div>

              {/* Name + Surname row */}
              <div className="rider-form-row">
                <div className={fg('name')}>
                  <label className="input-label">Name *</label>
                  <div className="input-wrapper-r">
                    <User size={14} className="input-icon-r" />
                    <input type="text" name="name" value={formData.name} onChange={handleChange}
                      placeholder="First name" className="input-field" required
                      onFocus={() => setFocused('name')} onBlur={() => setFocused(null)} />
                  </div>
                </div>
                <div className={fg('surname')}>
                  <label className="input-label">Surname</label>
                  <div className="input-wrapper-r">
                    <User size={14} className="input-icon-r" />
                    <input type="text" name="surname" value={formData.surname} onChange={handleChange}
                      placeholder="Last name" className="input-field"
                      onFocus={() => setFocused('surname')} onBlur={() => setFocused(null)} />
                  </div>
                </div>
              </div>

              {/* Phone */}
              <div className="input-group">
                <label className="input-label">Phone Number *</label>
                <div className="phone-wrapper">
                  <div className="country-code">+880</div>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
                    className="input-field phone-field" required placeholder="1712345678" />
                </div>
              </div>

              {/* Email */}
              <div className={fg('email')}>
                <label className="input-label">Email *</label>
                <div className="input-wrapper-r">
                  <Mail size={14} className="input-icon-r" />
                  <input type="email" name="email" value={formData.email} onChange={handleChange}
                    placeholder="your@email.com" className="input-field" required
                    onFocus={() => setFocused('email')} onBlur={() => setFocused(null)} />
                </div>
              </div>

              {/* Age */}
              <div className="input-group">
                <div className="question-box">
                  <div className="question-header">
                    <UserCheck size={15} color={COLORS.primary} />
                    <p className="question-text">Are you over 18?</p>
                  </div>
                  <div className="radio-options">
                    {['yes', 'no'].map(val => (
                      <label key={val} className="radio-label">
                        <input type="radio" name="isOver18" value={val}
                          checked={formData.isOver18 === val} onChange={handleChange} />
                        <span>{val.charAt(0).toUpperCase() + val.slice(1)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Privacy */}
              <div className="input-group">
                <div className="checkbox-box">
                  <label className="checkbox-label">
                    <input type="checkbox" name="privacyAccepted"
                      checked={formData.privacyAccepted} onChange={handleChange} />
                    <span>
                      I have read and understand the{' '}
                      <a href="#">Rider Privacy Statement</a>.
                    </span>
                  </label>
                </div>
              </div>

              <motion.button type="submit" className="submit-button" disabled={loading}
                whileHover={!loading ? { y: -2 } : {}} whileTap={!loading ? { y: 0 } : {}}>
                {loading
                  ? <span className="btn-loading"><span/><span/><span/></span>
                  : <> Submit <ArrowRight size={14} style={{ marginLeft: 5 }} /> </>}
              </motion.button>
            </form>

            {/* Login link */}
            <div className="rider-login-link">
              <span>Already have an account?</span>
              <button onClick={onSwitchToLogin} className="rider-signin-btn">
                <LogIn size={14} /> Log in
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default RiderSignUp;