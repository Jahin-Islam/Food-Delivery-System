// NearMePage.jsx — Standalone "Restaurants Near Me" page
// All emojis and images replaced with Lucide icons

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

    // If already loaded (e.g. DeliveryMapPicker loaded it first), init immediately
    if (window.L) { initMap(); return; }

    // Inject Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id   = 'leaflet-css';
      link.rel  = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Inject Leaflet JS
    if (!document.getElementById('leaflet-js')) {
      const script    = document.createElement('script');
      script.id       = 'leaflet-js';
      script.src      = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload   = initMap;
      script.onerror  = () => console.error('[NearMeMap] Failed to load Leaflet from CDN.');
      document.head.appendChild(script);
    } else {
      // Script tag exists but may still be loading
      document.getElementById('leaflet-js').addEventListener('load', initMap);
    }
  }, []);

  // User marker + radius circle
  useEffect(() => {
    const L = leafRef.current; const map = mapInst.current;
    if (!L || !map) return;
    if (userMarkerRef.current) { userMarkerRef.current.remove(); userMarkerRef.current = null; }
    if (circleRef.current)     { circleRef.current.remove();     circleRef.current = null; }
    if (!userPos) return;

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

    // Large dashed radius circle
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
  onUpdateQuantity, onRemoveItem, onCheckout,
  onBack,
  restaurants = [],
  onRestaurantClick,
}) {
  const { position: userPos, loading: locLoading, error: locError } = useRiderLocation();
  const { toasts, toast, removeToast } = useToast();

  const [radius,      setRadius]      = useState(5);
  const [selected,    setSelected]    = useState(null);
  const [geocoded,    setGeocoded]    = useState({});
  const [search,      setSearch]      = useState('');
  const [filterOpen,  setFilterOpen]  = useState(false);
  const [showCart,    setShowCart]    = useState(false);

  const geocodingRef  = useRef(false);
  const shownLocToast = useRef(false);

  useEffect(() => {
    if (userPos && !locLoading && !shownLocToast.current) {
      shownLocToast.current = true;
      toast('Location found! Showing restaurants near you.', 'success');
    }
  }, [userPos, locLoading]);

  useEffect(() => {
    if (locError) toast('Could not get your location. Showing all restaurants on map.', 'warning', 5000);
  }, [locError]);

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

  const handleNavigateToRestaurant = (restaurantId) => {
    const r = restaurants.find(x => x.id == restaurantId);
    if (r) { setShowCart(false); onRestaurantClick?.(r); }
  };

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
            {locLoading ? (
              <span className="nmp-pill nmp-pill--loading">
                <span className="nmp-spinner" />
                Getting your location…
              </span>
            ) : locError ? (
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

          {/* Search + filter toggle */}
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
                  {/* Thumbnail — image with Lucide fallback, no emoji */}
                  <RestaurantThumb src={r.image_url ?? r.logo} alt={r.name} />

                  {/* Info */}
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

                  {/* Right */}
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

          {/* Floating chips */}
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

          {/* Leaflet map */}
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

          {/* No location overlay */}
          {!userPos && !locLoading && (
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