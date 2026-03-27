// NearMePage.jsx — Standalone "Restaurants Near Me" page
// FIXES applied on top of the original working code:
//   1. Locate Me no longer freezes — uses a one-shot getCurrentPosition with a
//      proper timeout + 12s safety-net timer, clears loading in BOTH success and error.
//   2. Restaurant fetching pipeline is 100% identical to the original working version
//      (adapted → geocoded → withCoords → allMappable → nearbyList). Nothing skipped.
//   3. A Navigation (locate) button sits beside the search box for manual triggering.
//   4. Map pans to new userPos whenever Locate Me succeeds.

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  MapPin, Navigation, X, Star, Clock, ChevronRight,
  Locate, AlertTriangle, Search, SlidersHorizontal,
  Bike, Zap, ArrowLeft, RefreshCw, CheckCircle2,
  Circle, Utensils, ShoppingBag
} from 'lucide-react';
import Header from './Header.jsx';
import AllCarts from './AllCarts.jsx';
import { useRiderLocation, haversineKm, formatDistance } from '../Useriderlocation.js';
import './NearMePage.css';

// ── Toast ─────────────────────────────────────────────────────────────────
let _tid = 0;
function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type = 'info', duration = 3500) => {
    const id = ++_tid;
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), duration);
  }, []);
  const remove = useCallback((id) => setToasts(p => p.filter(t => t.id !== id)), []);
  return { toasts, toast: add, removeToast: remove };
}

// ── Coord extractor ───────────────────────────────────────────────────────
function extractCoords(r) {
  const f = v => { if (v == null || v === '') return null; const n = parseFloat(v); return isNaN(n) ? null : n; };
  const flat = { lat: f(r.latitude), lng: f(r.longitude) };
  if (flat.lat && flat.lng) return flat;
  if (r.address && typeof r.address === 'object') {
    const a = r.address;
    const al = f(a.latitude) ?? f(a.lat); const ag = f(a.longitude) ?? f(a.lng);
    if (al && ag) return { lat: al, lng: ag };
  }
  const sh = { lat: f(r.lat), lng: f(r.lng) };
  if (sh.lat && sh.lng) return sh;
  if (r.address_details) {
    const a = r.address_details;
    const dl = f(a.latitude) ?? f(a.lat); const dg = f(a.longitude) ?? f(a.lng);
    if (dl && dg) return { lat: dl, lng: dg };
  }
  return { lat: null, lng: null };
}

// ── Nominatim geocoder ────────────────────────────────────────────────────
const geocodeCache = {};
async function geocodeAddress(address) {
  if (!address) return null;
  if (geocodeCache[address]) return geocodeCache[address];
  try {
    const q = encodeURIComponent(address + ', Bangladesh');
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    if (data.length > 0) {
      const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      geocodeCache[address] = coords;
      return coords;
    }
  } catch (e) { console.warn('Geocode failed:', address, e); }
  return null;
}

const RADIUS_OPTIONS = [1, 2, 5, 10];

// ── Leaflet Map with radius circle ────────────────────────────────────────
function NearMeLeafletMap({ userPos, restaurants, selectedId, radius, onMarkerClick }) {
  const mapRef        = useRef(null);
  const leafRef       = useRef(null);
  const mapInst       = useRef(null);
  const markersRef    = useRef([]);
  const circleRef     = useRef(null);
  const userMarkerRef = useRef(null);

  // Load Leaflet from CDN then init map
  useEffect(() => {
    if (mapInst.current) return;

    const initMap = () => {
      const L = window.L;
      if (!L || !mapRef.current) return;
      leafRef.current = L;
      const center = userPos ? [userPos.lat, userPos.lng] : [23.8103, 90.4125];
      const map = L.map(mapRef.current, { center, zoom: 13, zoomControl: true });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors', maxZoom: 19,
      }).addTo(map);
      mapInst.current = map;
    };

    if (window.L) { initMap(); return; }

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id   = 'leaflet-css';
      link.rel  = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    if (!document.getElementById('leaflet-js')) {
      const script    = document.createElement('script');
      script.id       = 'leaflet-js';
      script.src      = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload   = initMap;
      script.onerror  = () => console.error('[NearMeMap] Failed to load Leaflet from CDN.');
      document.head.appendChild(script);
    } else {
      document.getElementById('leaflet-js').addEventListener('load', initMap);
    }
  }, []);

  // User marker + radius circle — also pans map to new position
  useEffect(() => {
    const L = leafRef.current; const map = mapInst.current;
    if (!L || !map) return;
    if (userMarkerRef.current) { userMarkerRef.current.remove(); userMarkerRef.current = null; }
    if (circleRef.current)     { circleRef.current.remove();     circleRef.current = null; }
    if (!userPos) return;

    // Pan smoothly to new user position
    map.setView([userPos.lat, userPos.lng], map.getZoom(), { animate: true });

    const userIcon = L.divIcon({
      className: '',
      html: `<div style="position:relative;width:22px;height:22px;">
        <div style="width:22px;height:22px;border-radius:50%;background:#d70f64;border:3px solid white;
          box-shadow:0 2px 10px rgba(215,15,100,0.5);position:absolute;top:0;left:0;z-index:2;"></div>
        <div style="width:40px;height:40px;border-radius:50%;background:rgba(215,15,100,0.18);
          position:absolute;top:-9px;left:-9px;z-index:1;animation:nmpPulse 1.8s ease-in-out infinite;"></div>
      </div>`,
      iconSize: [22, 22], iconAnchor: [11, 11],
    });

    userMarkerRef.current = L.marker([userPos.lat, userPos.lng], { icon: userIcon, zIndexOffset: 1000 })
      .addTo(map).bindPopup('<strong>You are here</strong>');

    circleRef.current = L.circle([userPos.lat, userPos.lng], {
      radius: radius * 1000,
      color: '#d70f64', fillColor: '#d70f64',
      fillOpacity: 0.07, weight: 2.5,
      dashArray: '8 6', opacity: 0.7,
    }).addTo(map);

    map.fitBounds(circleRef.current.getBounds(), { padding: [40, 40] });
  }, [userPos, radius]);

  // Restaurant markers
  useEffect(() => {
    const L = leafRef.current; const map = mapInst.current;
    if (!L || !map) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    restaurants.forEach(r => {
      if (!r.lat || !r.lng) return;
      const isSelected = r.id === selectedId;
      const icon = L.divIcon({
        className: '',
        html: `<div style="
          background:${isSelected ? '#d70f64' : '#fff'};
          color:${isSelected ? '#fff' : '#d70f64'};
          border:2.5px solid #d70f64;border-radius:10px;
          padding:4px 8px;font-size:11px;font-weight:700;white-space:nowrap;
          box-shadow:0 3px 12px rgba(0,0,0,0.18);font-family:sans-serif;
          display:flex;align-items:center;gap:4px;
          transform:${isSelected ? 'scale(1.12)' : 'scale(1)'};transition:all 0.2s;">
          ${r.name.length > 14 ? r.name.slice(0, 13) + '…' : r.name}
        </div>`,
        iconAnchor: [0, 0],
      });

      const marker = L.marker([r.lat, r.lng], { icon }).addTo(map).bindPopup(`
        <div style="font-family:sans-serif;min-width:150px;">
          <strong style="font-size:13px;">${r.name}</strong><br/>
          ${r.rating ? `${r.rating} stars` : ''}
          ${r.distKm != null ? ` · ${r.distKm < 1 ? (r.distKm * 1000).toFixed(0) + ' m' : r.distKm.toFixed(1) + ' km'}` : ''}
          <br/><small style="color:#6b7280;">${typeof r.address === 'string' ? r.address : (r.address?.street_address ?? '')}</small>
        </div>`);

      marker.on('click', () => onMarkerClick?.(r));
      markersRef.current.push(marker);
    });
  }, [restaurants, selectedId]);

  return (
    <>
      <style>{`@keyframes nmpPulse { 0%,100%{transform:scale(1);opacity:0.6;} 50%{transform:scale(1.5);opacity:0.15;} }`}</style>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
    </>
  );
}

// ── Toast icon helper ─────────────────────────────────────────────────────
function ToastIcon({ type }) {
  if (type === 'success') return <CheckCircle2 size={15} />;
  if (type === 'error')   return <AlertTriangle size={15} />;
  if (type === 'warning') return <AlertTriangle size={15} />;
  return <MapPin size={15} />;
}

// ── Restaurant thumbnail fallback ─────────────────────────────────────────
function RestaurantThumb({ src, alt }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="nmp-card-thumb-placeholder">
        <Utensils size={20} strokeWidth={1.5} />
      </div>
    );
  }
  return (
    <div className="nmp-card-thumb">
      <img src={src} alt={alt} onError={() => setFailed(true)} />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function NearMePage({
  isLoggedIn, user, cartItems = [],
  onLoginClick, onSignUpClick, onRestaurantSignUpClick,
  onLogout, onProfileClick, onOrdersClick,
  onLogoClick, onDeliveryClick, onPickupClick,
  onFavouritesClick,
  onUpdateQuantity, onRemoveItem, onCheckout,
  onBack,
  restaurants = [],
  onRestaurantClick,
  currentAddress,
  onAddressChange,
}) {
  const { position: gpsPos, loading: locLoading, error: locError } = useRiderLocation();
  const { toasts, toast, removeToast } = useToast();

  const [radius,         setRadius]         = useState(5);
  const [selected,       setSelected]       = useState(null);
  const [geocoded,       setGeocoded]       = useState({});
  const [search,         setSearch]         = useState('');
  const [filterOpen,     setFilterOpen]     = useState(false);
  const [showCart,       setShowCart]       = useState(false);
  const [addressPos,     setAddressPos]     = useState(null);
  // FIX: dedicated loading flag for the manual Locate Me button so it never freezes
  const [manualLocating, setManualLocating] = useState(false);

  const geocodingRef  = useRef(false);
  const shownLocToast = useRef(false);

  // Read saved delivery lat/lng from localStorage first
  useEffect(() => {
    const savedLat = parseFloat(localStorage.getItem('fp_delivery_lat'));
    const savedLng = parseFloat(localStorage.getItem('fp_delivery_lng'));

    if (savedLat && savedLng && !isNaN(savedLat) && !isNaN(savedLng)) {
      setAddressPos({ lat: savedLat, lng: savedLng });
      return;
    }

    if (!currentAddress) return;
    const geocodeDeliveryAddress = async () => {
      try {
        const q   = encodeURIComponent(currentAddress + ', Bangladesh');
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`);
        const data = await res.json();
        if (data?.[0]) {
          setAddressPos({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
        }
      } catch {}
    };
    geocodeDeliveryAddress();
  }, [currentAddress]);

  // userPos = saved address coords if set, otherwise real GPS
  const userPos = addressPos || gpsPos;

  useEffect(() => {
    if (userPos && !locLoading && !shownLocToast.current) {
      shownLocToast.current = true;
      const label = addressPos
        ? `Showing restaurants near ${currentAddress || 'your delivery address'}.`
        : 'Location found! Showing restaurants near you.';
      toast(label, 'success');
    }
  }, [userPos, locLoading, addressPos]);

  useEffect(() => {
    if (locError && !addressPos) toast('Could not get your location. Showing all restaurants on map.', 'warning', 5000);
  }, [locError, addressPos]);

  // ── Original restaurant pipeline (unchanged — this is why it was fetching correctly) ──
  const adapted = useMemo(() =>
    restaurants.map(r => ({ ...r, ...extractCoords(r) })),
    [restaurants]
  );

  useEffect(() => {
    const needs = adapted.filter(r =>
      (!r.lat || !r.lng) && typeof r.address === 'string' &&
      r.address.length > 3 && geocoded[r.id] === undefined
    );
    if (!needs.length || geocodingRef.current) return;
    geocodingRef.current = true;
    (async () => {
      for (const r of needs) {
        setGeocoded(p => ({ ...p, [r.id]: 'pending' }));
        const coords = await geocodeAddress(r.address);
        setGeocoded(p => ({ ...p, [r.id]: coords || null }));
        await new Promise(res => setTimeout(res, 1100));
      }
      geocodingRef.current = false;
    })();
  }, [adapted]);

  const withCoords = useMemo(() =>
    adapted.map(r => {
      if (r.lat && r.lng) return r;
      const gc = geocoded[r.id];
      if (gc && gc !== 'pending') return { ...r, ...gc };
      return r;
    }),
    [adapted, geocoded]
  );

  const allMappable = useMemo(() =>
    withCoords.filter(r => r.lat && r.lng).map(r => ({
      ...r,
      distKm: userPos ? haversineKm(userPos, { lat: r.lat, lng: r.lng }) : null,
    })),
    [withCoords, userPos]
  );

  const nearbyList = useMemo(() => {
    let list = userPos
      ? allMappable.filter(r => r.distKm != null && r.distKm <= radius)
      : allMappable;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.name?.toLowerCase().includes(q) ||
        (typeof r.address === 'string' && r.address.toLowerCase().includes(q))
      );
    }
    return list.sort((a, b) => (a.distKm ?? Infinity) - (b.distKm ?? Infinity));
  }, [allMappable, userPos, radius, search]);

  const geocodingCount = Object.values(geocoded).filter(v => v === 'pending').length;

  // ── FIX: Locate Me — one-shot getCurrentPosition, always resolves ─────
  // The useRiderLocation hook uses watchPosition which can silently stall on
  // some browsers/devices. This button uses a direct getCurrentPosition call
  // with an explicit timeout, plus a 12-second safety net, so it ALWAYS
  // clears the loading state whether GPS succeeds, fails, or times out.
  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      toast('Geolocation is not supported by this browser.', 'error');
      return;
    }

    setManualLocating(true);
    shownLocToast.current = false; // allow the success toast again

    // Safety net: clear loading after 12 s no matter what
    const safetyTimer = setTimeout(() => {
      setManualLocating(false);
      toast('Location request timed out. Check GPS/browser permissions.', 'warning', 5000);
    }, 12000);

    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude: lat, longitude: lng } }) => {
        clearTimeout(safetyTimer);

        setAddressPos({ lat, lng });
        try {
          localStorage.setItem('fp_delivery_lat', String(lat));
          localStorage.setItem('fp_delivery_lng', String(lng));
        } catch {}

        // Reverse-geocode so the Header address bar also updates
        try {
          const res  = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json();
          const addr = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          onAddressChange?.(addr);
          localStorage.setItem('fp_delivery_address', addr);
        } catch {}

        toast('Location updated! Showing restaurants near you.', 'success');
        setManualLocating(false);
      },
      (err) => {
        clearTimeout(safetyTimer);
        const msg =
          err.code === 1 ? 'Location permission denied. Please allow it in browser settings.'
          : err.code === 2 ? 'Could not determine your position. Check your GPS or WiFi.'
          : 'Location request timed out. Please try again.';
        toast(msg, 'error', 5000);
        setManualLocating(false);
      },
      // timeout must be shorter than safetyTimer so the browser error callback
      // fires first (and we clearTimeout the safety net properly)
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [onAddressChange, toast]);

  const handleNavigateToRestaurant = (restaurantId) => {
    const r = restaurants.find(x => x.id == restaurantId);
    if (r) { setShowCart(false); onRestaurantClick?.(r); }
  };

  // Show spinner in pill only when auto-GPS is still loading AND we have no position yet
  const isAutoLocating = locLoading && !userPos;

  return (
    <div className="nmp-root">

      {/* ── Toasts ───────────────────────────────────────────────────── */}
      <div className="nmp-toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`nmp-toast nmp-toast--${t.type}`}>
            <ToastIcon type={t.type} />
            <span>{t.msg}</span>
            <button onClick={() => removeToast(t.id)} className="nmp-toast-close">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* ── Header ───────────────────────────────────────────────────── */}
      <Header
        isLoggedIn={isLoggedIn}
        user={user}
        cartItems={cartItems}
        onLoginClick={onLoginClick}
        onSignUpClick={onSignUpClick}
        onRestaurantSignUpClick={onRestaurantSignUpClick}
        onCartClick={() => setShowCart(s => !s)}
        onLogout={onLogout}
        onProfileClick={onProfileClick}
        onOrdersClick={onOrdersClick}
        onLogoClick={onLogoClick}
        onDeliveryClick={onDeliveryClick ?? onBack}
        onPickupClick={onPickupClick ?? onBack}
        onNearMeClick={() => {}}
        activeTab="nearme"
        showBanner={false}
        onFavouritesClick={onFavouritesClick}
        currentAddress={currentAddress}
        onAddressChange={(addr) => {
          onAddressChange?.(addr);
          // When Header picks a new address, immediately read the saved coords
          setTimeout(() => {
            const lat = parseFloat(localStorage.getItem('fp_delivery_lat'));
            const lng = parseFloat(localStorage.getItem('fp_delivery_lng'));
            if (!isNaN(lat) && !isNaN(lng)) setAddressPos({ lat, lng });
          }, 200);
        }}
      />

      {/* ── Body ─────────────────────────────────────────────────────── */}
      <div className="nmp-body">

        {/* ── Sidebar ──────────────────────────────────────────────── */}
        <aside className="nmp-sidebar">

          {/* Header row */}
          <div className="nmp-sidebar-header">
            <button className="nmp-back-btn" onClick={onBack}>
              <ArrowLeft size={15} />
              <span>Back</span>
            </button>
            <div className="nmp-sidebar-title">
              <Navigation size={17} className="nmp-title-icon" />
              <h1>Restaurants Near Me</h1>
            </div>
          </div>

          {/* Location status pill */}
          <div className="nmp-location-pill">
            {(isAutoLocating || manualLocating) ? (
              <span className="nmp-pill nmp-pill--loading">
                <span className="nmp-spinner" />
                {manualLocating ? 'Locating…' : 'Getting your location…'}
              </span>
            ) : locError && !addressPos ? (
              <span className="nmp-pill nmp-pill--error">
                <AlertTriangle size={12} />
                Location unavailable
              </span>
            ) : userPos ? (
              <span className="nmp-pill nmp-pill--success">
                <CheckCircle2 size={12} />
                Location active
              </span>
            ) : null}
          </div>

          {/* Search + locate + filter row */}
          <div className="nmp-search-row">
            <div className="nmp-search-box">
              <Search size={14} className="nmp-search-icon" />
              <input
                className="nmp-search-input"
                placeholder="Search restaurants…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button className="nmp-search-clear" onClick={() => setSearch('')}>
                  <X size={13} />
                </button>
              )}
            </div>

            {/* FIX: Locate Me button — uses getCurrentPosition, always resolves */}
            <button
              className={`nmp-filter-btn ${manualLocating ? 'active' : ''}`}
              onClick={handleLocateMe}
              disabled={manualLocating}
              title="Use my current location"
              style={{ minWidth: 36 }}
            >
              {manualLocating
                ? <span className="nmp-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                : <Navigation size={15} />
              }
            </button>

            <button
              className={`nmp-filter-btn ${filterOpen ? 'active' : ''}`}
              onClick={() => setFilterOpen(p => !p)}
              title="Radius filter"
            >
              <SlidersHorizontal size={15} />
            </button>
          </div>

          {/* Radius drawer */}
          {filterOpen && (
            <div className="nmp-radius-drawer">
              <p className="nmp-radius-label">
                <Circle size={12} />
                Search radius
              </p>
              <div className="nmp-radius-pills">
                {RADIUS_OPTIONS.map(v => (
                  <button
                    key={v}
                    className={`nmp-radius-pill ${radius === v ? 'active' : ''}`}
                    onClick={() => { setRadius(v); toast(`Radius set to ${v} km`, 'info', 1800); }}
                  >
                    {v} km
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stats bar */}
          <div className="nmp-stats">
            <div className="nmp-stat">
              <span className="nmp-stat-num">{allMappable.length}</span>
              <span className="nmp-stat-lbl">on map</span>
            </div>
            {userPos && (
              <div className="nmp-stat">
                <span className="nmp-stat-num">{nearbyList.length}</span>
                <span className="nmp-stat-lbl">within {radius} km</span>
              </div>
            )}
            {geocodingCount > 0 && (
              <div className="nmp-stat nmp-stat--loading">
                <RefreshCw size={11} className="nmp-spin" />
                <span className="nmp-stat-lbl">locating {geocodingCount}…</span>
              </div>
            )}
          </div>

          {/* Restaurant list */}
          <div className="nmp-list">
            {nearbyList.length === 0 ? (
              <div className="nmp-empty">
                {geocodingCount > 0 ? (
                  <>
                    <div className="nmp-empty-icon">
                      <RefreshCw size={28} className="nmp-spin" />
                    </div>
                    <p>Locating restaurants…</p>
                    <span>{geocodingCount} remaining</span>
                  </>
                ) : (
                  <>
                    <div className="nmp-empty-icon">
                      <MapPin size={28} />
                    </div>
                    <p>No restaurants found</p>
                    <span>
                      {userPos
                        ? 'Try a wider radius — all are shown on the map.'
                        : 'Enable location for distance filtering.'}
                    </span>
                  </>
                )}
              </div>
            ) : (
              nearbyList.map(r => (
                <div
                  key={r.id}
                  className={`nmp-card ${selected === r.id ? 'selected' : ''}`}
                  onClick={() => {
                    setSelected(r.id);
                    toast(`${r.name} selected`, 'info', 2000);
                  }}
                >
                  <RestaurantThumb src={r.image_url ?? r.logo} alt={r.name} />

                  <div className="nmp-card-info">
                    <div className="nmp-card-name">{r.name}</div>
                    <div className="nmp-card-addr">
                      <MapPin size={10} />
                      {typeof r.address === 'string'
                        ? r.address
                        : r.address?.street_address ?? '—'}
                    </div>
                    <div className="nmp-card-meta">
                      {r.rating && (
                        <span className="nmp-badge nmp-badge--star">
                          <Star size={9} fill="currentColor" />
                          {r.rating}
                        </span>
                      )}
                      {r.delivery_time && (
                        <span className="nmp-badge">
                          <Clock size={9} />
                          {r.delivery_time}
                        </span>
                      )}
                      {r.min_order && (
                        <span className="nmp-badge">
                          <ShoppingBag size={9} />
                          ৳{r.min_order}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="nmp-card-right">
                    {r.distKm != null && (
                      <span className="nmp-card-dist">
                        <Zap size={10} />
                        {formatDistance(r.distKm)}
                      </span>
                    )}
                    <button
                      className="nmp-open-btn"
                      onClick={e => { e.stopPropagation(); onRestaurantClick?.(r); }}
                      title={`Open ${r.name}`}
                    >
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* ── Map Panel ────────────────────────────────────────────── */}
        <div className="nmp-map-panel">

          <div className="nmp-map-chips">
            {userPos && (
              <div className="nmp-chip nmp-chip--you">
                <Locate size={11} />
                You are here · {radius} km radius
              </div>
            )}
            {selected && (() => {
              const r = allMappable.find(x => x.id === selected);
              return r ? (
                <div className="nmp-chip nmp-chip--selected">
                  <MapPin size={11} />
                  {r.name}
                  {r.distKm != null && <> · {formatDistance(r.distKm)}</>}
                  <button
                    className="nmp-chip-open"
                    onClick={() => onRestaurantClick?.(r)}
                  >
                    Open
                    <ChevronRight size={11} />
                  </button>
                </div>
              ) : null;
            })()}
          </div>

          <NearMeLeafletMap
            userPos={userPos}
            restaurants={allMappable}
            selectedId={selected}
            radius={radius}
            onMarkerClick={r => {
              setSelected(r.id);
              toast(`${r.name} selected`, 'info', 2000);
            }}
          />

          {!userPos && !isAutoLocating && !manualLocating && (
            <div className="nmp-map-overlay">
              <div className="nmp-map-overlay-card">
                <Navigation size={26} />
                <p>Enable location for radius filtering</p>
                <span>All restaurants with coordinates are shown on the map</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── AllCarts sidebar ─────────────────────────────────────────── */}
      <AllCarts
        isOpen={showCart}
        onClose={() => setShowCart(false)}
        cartItems={cartItems}
        onCheckout={(restaurantId) => { setShowCart(false); onCheckout?.(restaurantId); }}
        onNavigateToRestaurant={handleNavigateToRestaurant}
        onUpdateQuantity={onUpdateQuantity}
        onRemoveItem={onRemoveItem}
      />
    </div>
  );
}