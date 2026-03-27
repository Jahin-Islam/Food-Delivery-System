import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sun, Moon, MapPin, Globe, ShoppingCart, Heart,
  User, Truck, Navigation, Store,
  ChevronDown, Utensils, LocateFixed, ArrowRight, X, Search, Bike,
} from 'lucide-react';
import './Header.css';
import ProfileDropdown from './Profiledropdown.jsx';
import authService from '../Authservice.js';

const Header = ({
  isLoggedIn, user, cartItems = [],
  onLoginClick, onSignUpClick, onCartClick, onLogout,
  showBanner = false, onRestaurantSignUpClick,
  onRiderSignUpClick,
  onProfileClick, onOrdersClick, onLogoClick,
  onDeliveryClick, onPickupClick, onNearMeClick,
  activeTab = 'delivery',
  currentAddress = '',
  onAddressChange,
  onFavouritesClick,  // opens AllCarts sidebar on the favourites tab
}) => {
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [isDark,           setIsDark]           = useState(() => localStorage.getItem('theme') === 'dark');
  const [showPanel,        setShowPanel]        = useState(false);
  const [inputVal,         setInputVal]         = useState(currentAddress || '');
  const [displayAddress,   setDisplayAddress]   = useState(currentAddress || '');
  const [locating,         setLocating]         = useState(false);
  const [suggestions,      setSuggestions]      = useState([]);
  const [suggestLoading,   setSuggestLoading]   = useState(false);

  const panelRef    = useRef(null);
  const debounceRef = useRef(null);

  // Sync whenever the saved address arrives from App (e.g. after localStorage restore on init)
  useEffect(() => {
    if (currentAddress) {
      setDisplayAddress(currentAddress);
      setInputVal(currentAddress);
    }
  }, [currentAddress]);

  useEffect(() => {
    isDark
      ? (document.documentElement.setAttribute('data-theme','dark'), localStorage.setItem('theme','dark'))
      : (document.documentElement.removeAttribute('data-theme'), localStorage.setItem('theme','light'));
  }, [isDark]);

  useEffect(() => {
    if (!showPanel) return;
    const h = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) { setShowPanel(false); setSuggestions([]); } };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showPanel]);

  /* ── Nominatim autocomplete ── */
  const fetchSuggestions = useCallback(async (q) => {
    if (q.trim().length < 3) { setSuggestions([]); return; }
    setSuggestLoading(true);
    try {
      const res  = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&countrycodes=bd&format=json&limit=5&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      setSuggestions(data.map(r => ({ label: r.display_name, lat: parseFloat(r.lat), lng: parseFloat(r.lon) })));
    } catch { setSuggestions([]); }
    finally { setSuggestLoading(false); }
  }, []);

  const handleInputChange = (e) => {
    setInputVal(e.target.value);
    // Clear stored coords since user is typing a new address (no suggestion picked yet)
    try { localStorage.removeItem('fp_delivery_lat'); localStorage.removeItem('fp_delivery_lng'); } catch {}
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(e.target.value), 400);
  };

  /* ── Save to backend ── */
  const saveToBackend = async (address, lat, lng) => {
    if (!authService.isAuthenticated()) return;
    try {
      await authService.authenticatedFetch('http://127.0.0.1:8000/api/auth/address/', {
        method: 'POST',
        body: JSON.stringify({ address, latitude: lat ?? null, longitude: lng ?? null, type: 'delivery' }),
      });
    } catch (e) { console.warn('Address save failed:', e); }
  };

  const confirmAddress = async (label, lat, lng) => {
    const val = (label || inputVal).trim();
    if (!val) return;
    setDisplayAddress(val);
    setInputVal(val);
    setSuggestions([]);
    setShowPanel(false);
    onAddressChange?.(val);
    // Save lat/lng to localStorage so NearMePage uses the exact picked location
    if (lat && lng) {
      try { localStorage.setItem('fp_delivery_lat', String(lat)); localStorage.setItem('fp_delivery_lng', String(lng)); } catch {}
    }
    await saveToBackend(val, lat, lng);
  };

  /* ── Locate me ── */
  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude: lat, longitude: lng } }) => {
        try {
          const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
          const data = await res.json();
          await confirmAddress(data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng);
        } catch { await confirmAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng); }
        finally { setLocating(false); }
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const addr  = displayAddress || 'Set delivery address';
  const short = addr.length > 36 ? addr.slice(0, 36) + '…' : addr;

  return (
    <>
      <AnimatePresence>
        {showBanner && !isLoggedIn && (
          <motion.div className="top-banner"
            initial={{ opacity: 0, y: -32 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -32 }} transition={{ duration: 0.3 }}>
            <Store size={16} strokeWidth={2} />
            <span>Own a restaurant? Join us today!</span>
            <button className="banner-btn" onClick={onRestaurantSignUpClick}>SIGN UP FOR A BUSINESS ACCOUNT</button>
            {/* TASK 2: Rider signup button */}
            <Bike size={16} strokeWidth={2} style={{ marginLeft: 8 }} />
            <span>Want to deliver?</span>
            <button className="banner-btn" onClick={onRiderSignUpClick} style={{ background: 'rgba(255,255,255,0.85)', marginLeft: 4 }}>
              SIGN UP AS A RIDER
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.header className="header"
        initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
        <div className="header-content">

          {/* LEFT */}
          <div className="header-left">
            <div className="logo-section" onClick={onLogoClick} style={{ cursor: onLogoClick ? 'pointer' : 'default' }}>
              <button className="logo-icon" aria-label="home" onClick={onLogoClick}>
                <Utensils size={20} strokeWidth={2.5} color="white" />
              </button>
              <span className="logo-text">foodpanda</span>
            </div>

            {/* Address button + panel */}
            <div ref={panelRef} style={{ position: 'relative' }}>
              <button className="address-button" onClick={() => { setShowPanel(p => !p); setSuggestions([]); }}>
                <MapPin size={18} strokeWidth={2} className="address-pin-icon" />
                <div className="address-text">
                  <div className="address-label">Deliver to</div>
                  <div className="address-full">
                    {short}
                    <ChevronDown size={13} strokeWidth={2.5} style={{ marginLeft: 4, verticalAlign: 'middle', transform: showPanel ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                  </div>
                </div>
              </button>

              <AnimatePresence>
                {showPanel && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                    transition={{ duration: 0.17, ease: [0.22, 1, 0.36, 1] }}
                    style={{ position: 'absolute', top: 'calc(100% + 10px)', left: 0, width: 380, background: 'var(--c-white)', borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.14)', border: '1.5px solid var(--c-gray-200)', zIndex: 2000, padding: 16 }}>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-gray-900)' }}>Enter your address</span>
                      <button onClick={() => { setShowPanel(false); setSuggestions([]); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-gray-400)', display: 'flex', alignItems: 'center' }}>
                        <X size={16} />
                      </button>
                    </div>

                    <div style={{ position: 'relative', marginBottom: 6 }}>
                      <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-gray-400)', pointerEvents: 'none' }} />
                      <input type="text" value={inputVal} onChange={handleInputChange}
                        onKeyDown={e => { if (e.key === 'Enter') confirmAddress(inputVal, null, null); }}
                        placeholder="Street, area, postal code…" autoFocus
                        style={{ width: '100%', padding: '11px 44px 11px 38px', border: '2px solid var(--c-gray-200)', borderRadius: 10, fontSize: 14, fontFamily: 'var(--font)', background: 'var(--c-gray-50)', color: 'var(--c-gray-900)', outline: 'none' }}
                        onFocus={e => e.target.style.borderColor = 'var(--c-primary)'}
                        onBlur={e => e.target.style.borderColor = 'var(--c-gray-200)'}
                      />
                      <button onClick={() => confirmAddress(inputVal, null, null)}
                        style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'var(--c-primary)', border: 'none', borderRadius: 7, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <ArrowRight size={14} color="white" />
                      </button>
                    </div>

                    {(suggestLoading || suggestions.length > 0) && (
                      <div style={{ border: '1.5px solid var(--c-gray-200)', borderRadius: 10, overflow: 'hidden', marginBottom: 10, background: 'var(--c-white)' }}>
                        {suggestLoading && <div style={{ padding: '10px 14px', fontSize: 13, color: 'var(--c-gray-400)' }}>Searching…</div>}
                        {!suggestLoading && suggestions.map((s, i) => (
                          <button key={i} type="button" onClick={() => confirmAddress(s.label, s.lat, s.lng)}
                            style={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', background: 'none', border: 'none', borderBottom: i < suggestions.length - 1 ? '1px solid var(--c-gray-100)' : 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, color: 'var(--c-gray-700)', fontFamily: 'var(--font)' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--c-primary-light)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                            <MapPin size={14} style={{ color: 'var(--c-primary)', flexShrink: 0, marginTop: 1 }} />
                            <span style={{ lineHeight: 1.4 }}>{s.label}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '10px 0' }}>
                      <div style={{ flex: 1, height: 1, background: 'var(--c-gray-200)' }} />
                      <span style={{ fontSize: 11, color: 'var(--c-gray-400)', fontWeight: 600 }}>OR</span>
                      <div style={{ flex: 1, height: 1, background: 'var(--c-gray-200)' }} />
                    </div>

                    <button onClick={handleLocateMe} disabled={locating}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 11, border: '2px solid var(--c-primary)', borderRadius: 10, background: 'var(--c-primary-light)', color: 'var(--c-primary)', fontSize: 14, fontWeight: 700, cursor: locating ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)', opacity: locating ? 0.7 : 1, transition: 'all 0.2s' }}>
                      <LocateFixed size={15} style={{ animation: locating ? 'hdrSpin 1s linear infinite' : 'none' }} />
                      {locating ? 'Locating…' : 'Locate me'}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* RIGHT */}
          <div className="header-right">
            <motion.button className="header-btn dark-toggle-btn"
              onClick={() => setIsDark(p => !p)} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}>
              <AnimatePresence mode="wait">
                {isDark
                  ? <motion.span key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.18 }} style={{ display: 'flex' }}><Sun size={17} strokeWidth={2} /></motion.span>
                  : <motion.span key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.18 }} style={{ display: 'flex' }}><Moon size={17} strokeWidth={2} /></motion.span>}
              </AnimatePresence>
            </motion.button>

            {!isLoggedIn ? (
              <>
                <motion.button className="header-btn" onClick={onLoginClick} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>Log in</motion.button>
                <motion.button className="header-btn signup-btn" onClick={onSignUpClick} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>Sign up for free delivery</motion.button>
              </>
            ) : (
              <>
                <motion.button className="header-btn language-btn" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}><Globe size={16} strokeWidth={2} /><span>EN</span></motion.button>
                <motion.button className="header-btn cart-button" onClick={onCartClick} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  <ShoppingCart size={17} strokeWidth={2} />
                  <AnimatePresence>
                    {cartItems?.length > 0 && (() => {
                      const uniqueCount = new Set(cartItems.map(i => i.restaurantId)).size;
                      return (
                        <motion.span className="cart-badge" key={uniqueCount} initial={{ scale: 0.4 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
                          {uniqueCount}
                        </motion.span>
                      );
                    })()}
                  </AnimatePresence>
                  <span>CART</span>
                </motion.button>
                <div style={{ width: 1, height: 24, background: 'var(--c-gray-200)', margin: '0 2px', alignSelf: 'center', flexShrink: 0 }} />
                <motion.button className="header-btn favourite-btn" onClick={onFavouritesClick} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}><Heart size={16} strokeWidth={2} /><span>FAVOURITES</span></motion.button>
                <motion.button className="header-btn profile-btn" onClick={() => setShowProfileDropdown(p => !p)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  <User size={16} strokeWidth={2} /><span>{user?.first_name || 'PROFILE'}</span><ChevronDown size={13} strokeWidth={2.5} />
                </motion.button>
                <ProfileDropdown isOpen={showProfileDropdown} onClose={() => setShowProfileDropdown(false)}
                  user={user} onProfileClick={onProfileClick} onOrdersClick={onOrdersClick} onLogout={onLogout} />
              </>
            )}
          </div>
        </div>

        {/* Nav Tabs */}
        <div className="nav-tabs">
          <div className="nav-tabs-content">
            <button className={`nav-tab ${activeTab === 'delivery' ? 'active' : ''}`} onClick={onDeliveryClick ?? onLogoClick}>
              <Truck size={16} strokeWidth={2} /><span>Delivery</span>
            </button>
            <button className={`nav-tab ${activeTab === 'nearme' ? 'active' : ''}`} onClick={onNearMeClick}>
              <Navigation size={16} strokeWidth={2} /><span>Restaurants Near Me</span>
            </button>
            <button className={`nav-tab ${activeTab === 'orders' ? 'active' : ''}`} onClick={onOrdersClick}>
              <Store size={16} strokeWidth={2} /><span>My Orders</span>
            </button>
          </div>
        </div>

        <style>{`@keyframes hdrSpin { to { transform: rotate(360deg); } }`}</style>
      </motion.header>
    </>
  );
};

export default Header;