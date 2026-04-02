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
import { haversineKm, formatDistance } from '../Useriderlocation.js';
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

    // Professional "You are here" pin — pulsing dot with stem
    const youSize = 40;
    const youStem = 12;
    const userIcon = L.divIcon({
      className: '',
      iconSize:   [youSize, youSize + youStem],
      iconAnchor: [youSize / 2, youSize + youStem],
      html: `
        <div style="position:relative;width:${youSize}px;height:${youSize}px;">
          <!-- pulse ring -->
          <div style="
            position:absolute;inset:-8px;border-radius:50%;
            background:rgba(215,15,100,0.18);
            animation:nmpPulse 1.8s ease-in-out infinite;
            z-index:1;"></div>
          <!-- circle badge -->
          <div style="
            position:absolute;inset:0;border-radius:50%;
            background:#d70f64;border:3px solid #fff;
            box-shadow:0 4px 14px rgba(215,15,100,0.45);
            display:flex;align-items:center;justify-content:center;z-index:2;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 2v2M12 20v2M2 12h2M20 12h2
                M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41
                M17.66 6.34l-1.41 1.41M6.34 17.66l-1.41 1.41"/>
            </svg>
          </div>
          <!-- stem -->
          <div style="
            position:absolute;bottom:-${youStem}px;left:50%;
            transform:translateX(-50%);
            width:0;height:0;
            border-left:${Math.round(youSize*0.22)}px solid transparent;
            border-right:${Math.round(youSize*0.22)}px solid transparent;
            border-top:${youStem}px solid #d70f64;
            z-index:2;"></div>
        </div>`,
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
      const bg   = isSelected ? '#d70f64' : '#fff';
      const fg   = isSelected ? '#fff'    : '#d70f64';
      const sz   = isSelected ? 42 : 36;
      const stem = Math.round(sz * 0.30);
      const svgIcon = `<svg width="${isSelected?20:17}" height="${isSelected?20:17}" viewBox="0 0 24 24"
        fill="none" stroke="${fg}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/>
        <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h1"/><path d="M18 22V15"/>
      </svg>`;
      const icon = L.divIcon({
        className: '',
        iconAnchor: [sz / 2, sz + stem],
        popupAnchor: [0, -(sz + stem + 4)],
        html: `<div style="
            width:${sz}px;height:${sz}px;
            background:${bg};
            border-radius:50%;
            border:3px solid ${isSelected ? 'rgba(255,255,255,0.9)' : '#d70f64'};
            box-shadow:0 4px 14px rgba(0,0,0,${isSelected?'0.30':'0.18'}),0 1px 3px rgba(0,0,0,0.12);
            display:flex;align-items:center;justify-content:center;
            position:relative;
            transform:${isSelected ? 'scale(1.1)' : 'scale(1)'};
            transition:transform 0.2s;">
          ${svgIcon}
          <div style="
              position:absolute;bottom:-${stem}px;left:50%;
              transform:translateX(-50%);
              width:0;height:0;
              border-left:${Math.round(sz*0.22)}px solid transparent;
              border-right:${Math.round(sz*0.22)}px solid transparent;
              border-top:${stem}px solid ${bg};"></div>
        </div>`,
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
  // NearMePage does NOT use useRiderLocation (which starts watchPosition immediately
  // and competes with / blocks the manual getCurrentPosition call on many browsers).
  // Instead we manage location state locally: everything is driven by the
  // "Locate Me" button (one-shot getCurrentPosition) or the saved localStorage coords.
  const [locError, setLocError] = useState(null);
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

  // Restore saved position on mount — runs once only so navigation never resets it.
  // Priority: raw lat/lng keys -> geocode saved address text.
  useEffect(() => {
    const savedLat = parseFloat(localStorage.getItem('fp_delivery_lat'));
    const savedLng = parseFloat(localStorage.getItem('fp_delivery_lng'));
    if (!isNaN(savedLat) && !isNaN(savedLng) && savedLat !== 0 && savedLng !== 0) {
      setAddressPos({ lat: savedLat, lng: savedLng });
      return;
    }
    const addr = localStorage.getItem('fp_delivery_address') || currentAddress;
    if (!addr) return;
    (async () => {
      try {
        const q   = encodeURIComponent(addr + ', Bangladesh');
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data = await res.json();
        if (data?.[0]) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          setAddressPos({ lat, lng });
          try {
            localStorage.setItem('fp_delivery_lat', String(lat));
            localStorage.setItem('fp_delivery_lng', String(lng));
          } catch {}
        }
      } catch {}
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // userPos is purely the position the user explicitly provided (Locate Me or saved coords)
  const userPos = addressPos;

  useEffect(() => {
    if (userPos && !shownLocToast.current) {
      shownLocToast.current = true;
      const label = `Showing restaurants near ${currentAddress || 'your location'}.`;
      toast(label, 'success');
    }
  }, [userPos]);

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

  // ── Locate Me — one-shot getCurrentPosition ───────────────────────────────
  // We deliberately avoid watchPosition here. watchPosition with
  // enableHighAccuracy:true fires a browser permission prompt that can block
  // any subsequent getCurrentPosition call on the same page, making the button
  // appear to hang forever. One-shot getCurrentPosition is all we need.
  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      toast('Geolocation is not supported by this browser.', 'error');
      return;
    }

    setManualLocating(true);
    setLocError(null);
    shownLocToast.current = false;

    // Hard safety-net: clear spinner after 14 s no matter what
    const safetyTimer = setTimeout(() => {
      setManualLocating(false);
      toast('Location request timed out. Check GPS/browser permissions.', 'warning', 5000);
    }, 14000);

    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude: lat, longitude: lng } }) => {
        clearTimeout(safetyTimer);

        // 1. Update map immediately — don't wait for reverse-geocode
        setAddressPos({ lat, lng });

        // 2. Persist raw coords right away
        try {
          localStorage.setItem('fp_delivery_lat', String(lat));
          localStorage.setItem('fp_delivery_lng', String(lng));
        } catch {}

        // 3. Reverse-geocode with a strict 5 s abort so the spinner
        //    never hangs on a slow Nominatim response
        let addr = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        try {
          const controller = new AbortController();
          const geocodeTimer = setTimeout(() => controller.abort(), 5000);
          const res  = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { 'Accept-Language': 'en' }, signal: controller.signal }
          );
          clearTimeout(geocodeTimer);
          const data = await res.json();
          if (data.display_name) addr = data.display_name;
        } catch { /* timeout or network — coordinate string fallback is fine */ }

        // 4. Persist address and notify App (address, lat, lng) so App saves
        //    both the text and raw coords to localStorage
        try { localStorage.setItem('fp_delivery_address', addr); } catch {}
        onAddressChange?.(addr, lat, lng);

        toast('Location updated! Showing restaurants near you.', 'success');
        setManualLocating(false);
      },
      (err) => {
        clearTimeout(safetyTimer);
        const msg =
          err.code === 1 ? 'Location permission denied. Please allow it in browser settings.'
          : err.code === 2 ? 'Could not determine your position. Check your GPS or WiFi.'
          : 'Location request timed out. Please try again.';
        setLocError(msg);
        toast(msg, 'error', 5000);
        setManualLocating(false);
      },
      // GPS timeout shorter than safetyTimer so browser error callback fires first
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [onAddressChange, toast]);

  // isAutoLocating no longer exists — location only starts when user clicks Locate Me
  const isAutoLocating = false;

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
        onFavouritesClick={onFavouritesClick}
        currentAddress={currentAddress}
        onAddressChange={(addr, lat, lng) => {
          onAddressChange?.(addr, lat, lng);
          // Use coords passed directly from Header — they are already saved to
          // localStorage by Header before this callback fires, but we prefer the
          // direct args so the map updates in the same React render cycle.
          if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
            setAddressPos({ lat, lng });
          } else {
            // Fallback: read localStorage (e.g. manual text entry without picking a suggestion)
            const resolvedLat = parseFloat(localStorage.getItem('fp_delivery_lat'));
            const resolvedLng = parseFloat(localStorage.getItem('fp_delivery_lng'));
            if (!isNaN(resolvedLat) && !isNaN(resolvedLng) && resolvedLat !== 0 && resolvedLng !== 0) {
              setAddressPos({ lat: resolvedLat, lng: resolvedLng });
            }
          }
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
                      {parseFloat(r.total_rated) > 0 ? (
                        <span className="nmp-badge nmp-badge--star">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} size={9}
                              fill={s <= Math.round(parseFloat(r.rating)) ? '#f59e0b' : 'none'}
                              color={s <= Math.round(parseFloat(r.rating)) ? '#f59e0b' : '#d1d5db'}
                            />
                          ))}
                          <span style={{ marginLeft: 2 }}>{parseFloat(r.rating).toFixed(1)}</span>
                        </span>
                      ) : (
                        <span className="nmp-badge">New</span>
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