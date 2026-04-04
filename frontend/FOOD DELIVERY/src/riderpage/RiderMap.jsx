import { useState, useEffect, useRef, useCallback } from 'react';
import { useRiderLocation, haversineKm, formatDistance, etaMinutes } from '../Useriderlocation.js';
import './RiderMap.css';

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS  = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const TILE_URL    = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTR   = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const OSRM_BASE   = 'https://router.project-osrm.org/route/v1/driving';
const DHAKA       = { lat: 23.8103, lng: 90.4125 };

// ─── Load Leaflet dynamically (idempotent) ────────────────────────────────────
function loadLeaflet() {
  return new Promise((resolve, reject) => {
    // Already loaded
    if (window.L) { resolve(window.L); return; }

    // CSS
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement('link');
      link.rel  = 'stylesheet';
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }

    // JS
    if (!document.querySelector(`script[src="${LEAFLET_JS}"]`)) {
      const script    = document.createElement('script');
      script.src      = LEAFLET_JS;
      script.onload   = () => resolve(window.L);
      script.onerror  = () => reject(new Error('Failed to load Leaflet'));
      document.head.appendChild(script);
    } else {
      const poll = setInterval(() => {
        if (window.L) { clearInterval(poll); resolve(window.L); }
      }, 50);
    }
  });
}

function makePin(L, svgIcon, bg, size = 44, borderColor = 'rgba(255,255,255,0.95)', glow = false) {
  const stem  = Math.round(size * 0.30);
  const total = size + stem;

  const glowStyle = glow
    ? `box-shadow:0 0 0 4px ${bg}33, 0 0 18px 6px ${bg}55, 0 4px 14px rgba(0,0,0,0.30);`
    : `box-shadow:0 4px 14px rgba(0,0,0,0.30),0 1px 3px rgba(0,0,0,0.18);`;

  const pulseRing = glow ? `
    <div style="
      position:absolute;top:50%;left:50%;
      transform:translate(-50%,-50%);
      width:${size + 16}px;height:${size + 16}px;
      border-radius:50%;
      border:2.5px solid ${bg};
      opacity:0;
      animation:rmapPulse 1.8s ease-out infinite;
      pointer-events:none;
    "></div>
    <div style="
      position:absolute;top:50%;left:50%;
      transform:translate(-50%,-50%);
      width:${size + 28}px;height:${size + 28}px;
      border-radius:50%;
      border:1.5px solid ${bg};
      opacity:0;
      animation:rmapPulse 1.8s ease-out 0.6s infinite;
      pointer-events:none;
    "></div>` : '';

  return L.divIcon({
    className:   '',
    iconAnchor:  [size / 2, total],
    popupAnchor: [0, -(total + 4)],
    html: `<div style="position:relative;width:${size}px;height:${total}px;">
      ${pulseRing}
      <div style="
          width:${size}px;height:${size}px;
          background:${bg};
          border-radius:50%;
          border:3px solid ${borderColor};
          ${glowStyle}
          display:flex;align-items:center;justify-content:center;
          position:relative;">
        ${svgIcon}
        <div style="
            position:absolute;bottom:-${stem}px;left:50%;
            transform:translateX(-50%);
            width:0;height:0;
            border-left:${Math.round(size*0.22)}px solid transparent;
            border-right:${Math.round(size*0.22)}px solid transparent;
            border-top:${stem}px solid ${bg};"></div>
      </div>
    </div>`,
  });
}

// SVG icons used in pins — white strokes, no fill
const SVG = {
  rider:      `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 0 0 0-2h-1l-5 8H4"/><path d="m6 17 3.5-7 3 5 2-4h4.5"/></svg>`,
  restaurant: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h1"/><path d="M18 22V15"/></svg>`,
  customer:   `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
};

// ─── OSRM route ───────────────────────────────────────────────────────────────
async function fetchRoute(from, to, signal) {
  if (!from || !to) return null;
  try {
    const url = `${OSRM_BASE}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal });
    const d   = await res.json();
    if (d?.code === 'Ok' && d.routes?.[0]) {
      const r = d.routes[0];
      return {
        coords: r.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
        distKm: (r.distance / 1000).toFixed(1),
        durMin: Math.ceil(r.duration / 60),
      };
    }
  } catch (_) { /* timeout / network error — silently ignore */ }
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function RiderMap({ orders = [], isOnline = false }) {
  const { position: riderPos, loading: gpsLoading, error: gpsError, usingFallback } = useRiderLocation();

  const containerRef  = useRef(null);
  const mapRef        = useRef(null);
  const layersRef     = useRef([]);
  const routeRef      = useRef(null);
  const abortRef      = useRef(null);
  const userZoomedRef = useRef(false);
  const prevOrderIds  = useRef('');      

  const [leafletReady, setLeafletReady] = useState(!!window.L);
  const [routeInfo,    setRouteInfo]    = useState(null);
  const [selectedId,   setSelectedId]   = useState(null);

  // Sorted: picked_up first (most urgent delivery), then ongoing
  const pickedUp  = orders.filter(o => o.status === 'picked_up');
  const ongoing   = orders.filter(o => o.status === 'ongoing');
  const allActive = [...pickedUp, ...ongoing];
  const primary   = allActive.find(o => o.id === selectedId) ?? allActive[0] ?? null;

  // ── 1. Load Leaflet JS + CSS ───────────────────────────────────────────────
  useEffect(() => {
    if (window.L) { setLeafletReady(true); return; }
    loadLeaflet()
      .then(() => setLeafletReady(true))
      .catch(err => console.error('Leaflet load error:', err));
  }, []);

  // ── 2. Auto-select first order ────────────────────────────────────────────
  useEffect(() => {
    if (allActive.length && !allActive.find(o => o.id === selectedId)) {
      setSelectedId(allActive[0].id);
    }
  }, [orders]); // eslint-disable-line

  useEffect(() => {
    if (!leafletReady || mapRef.current) return;
    const container = containerRef.current;
    if (!container) return;

    const L      = window.L;
    const center = riderPos ?? DHAKA;

    const map = L.map(container, {
      center:         [center.lat, center.lng],
      zoom:           14,
      zoomControl:    true,
      attributionControl: true,
    });

    L.tileLayer(TILE_URL, {
      attribution: TILE_ATTR,
      maxZoom:     19,
    }).addTo(map);

    mapRef.current = map;

    setTimeout(() => map.invalidateSize(), 100);
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(container);
    const onUserInteract = () => { userZoomedRef.current = true; };
    map.on('zoomstart', onUserInteract);
    map.on('dragstart', onUserInteract);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [leafletReady, gpsLoading]);

  // ── 4. Clear layers helper ────────────────────────────────────────────────
  const clearLayers = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    layersRef.current.forEach(l => { try { map.removeLayer(l); } catch (_) {} });
    layersRef.current = [];
    routeRef.current  = null;
  }, []);

  // ── 5. Draw markers + route whenever data changes ─────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const L = window.L;
    abortRef.current?.abort();
    clearLayers();
    setRouteInfo(null);

    const bounds = [];

    // Rider pin
    const rp = riderPos ?? DHAKA;
    const riderM = L.marker([rp.lat, rp.lng], {
      icon: makePin(L, SVG.rider, '#d70f64', 46, 'rgba(255,255,255,0.95)', true),
      zIndexOffset: 2000,
    }).addTo(map).bindPopup('<b>🛵 You</b>');
    layersRef.current.push(riderM);
    bounds.push([rp.lat, rp.lng]);

    // Per-order pins
    orders.forEach(order => {
      const isPrimary  = order.id === primary?.id;
      const isPickedUp = order.status === 'picked_up';
      const bigSz = 36, smSz = 28;

      // Restaurant pin — only while rider hasn't picked up yet
      const rLat = order.restaurant?.lat;
      const rLng = order.restaurant?.lng;
      if (!isPickedUp && rLat && rLng) {
        const m = L.marker([rLat, rLng], {
          icon: makePin(L, SVG.restaurant, isPrimary ? '#f97316' : '#fdba74', isPrimary ? bigSz : smSz, 'rgba(255,255,255,0.95)', isPrimary),
          zIndexOffset: isPrimary ? 1000 : 500,
        }).addTo(map).bindPopup(
          `<b>🍴 ${order.restaurant.name || 'Restaurant'}</b><br/><small>${order.id}</small>`
        );
        layersRef.current.push(m);
        bounds.push([rLat, rLng]);
      }

      // Delivery / customer pin — always shown
      const dLat = order.delivery?.lat;
      const dLng = order.delivery?.lng;
      if (dLat && dLng) {
        const m = L.marker([dLat, dLng], {
          icon: makePin(L, SVG.customer, isPrimary ? '#10b981' : '#6ee7b7', isPrimary ? bigSz : smSz, 'rgba(255,255,255,0.95)', isPrimary),
          zIndexOffset: isPrimary ? 900 : 400,
        }).addTo(map).bindPopup(
          `<b>🏠 ${order.customer?.name || 'Customer'}</b><br/>` +
          `<small>${order.delivery?.address || ''}</small>`
        );
        layersRef.current.push(m);
        bounds.push([dLat, dLng]);
      }
    });

    const orderKey = allActive.map(o => o.id).join(',');
    const orderListChanged = orderKey !== prevOrderIds.current;
    if (orderListChanged) prevOrderIds.current = orderKey;

    if (!userZoomedRef.current && orderListChanged && bounds.length > 1) {
      try { map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 }); }
      catch (_) {}
    } else if (!userZoomedRef.current && bounds.length <= 1) {
      map.setView([rp.lat, rp.lng], 14);
    }

    // ── Route for the primary/selected order ─────────────────────────────
    if (!primary) return;

    const isPickedUp = primary.status === 'picked_up';
    const from = riderPos ?? DHAKA;

    const toLat = isPickedUp ? primary.delivery?.lat  : primary.restaurant?.lat;
    const toLng = isPickedUp ? primary.delivery?.lng  : primary.restaurant?.lng;
    if (!toLat || !toLng) return;

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    fetchRoute(from, { lat: toLat, lng: toLng }, ctrl.signal).then(info => {
      if (ctrl.signal.aborted || !mapRef.current) return;

      if (routeRef.current) {
        try {
          routeRef.current.forEach(l => mapRef.current.removeLayer(l));
        } catch (_) {}
      }
      if (!info) return;

      const color = isPickedUp ? '#10b981' : '#d70f64';

      const glowLine = L.polyline(info.coords, {
        color,
        weight:  12,
        opacity: 0.18,
        lineJoin: 'round',
        lineCap:  'round',
      }).addTo(mapRef.current);

      // Layer 2: medium soft halo
      const haloLine = L.polyline(info.coords, {
        color,
        weight:  7,
        opacity: 0.35,
        lineJoin: 'round',
        lineCap:  'round',
      }).addTo(mapRef.current);

      // Layer 3: crisp animated dashed line on top
      const dashLine = L.polyline(info.coords, {
        color,
        weight:    4,
        opacity:   0.95,
        dashArray: '14,9',
        lineJoin:  'round',
        lineCap:   'round',
        className: isPickedUp ? 'rmap-route-anim-green' : 'rmap-route-anim-pink',
      }).addTo(mapRef.current);

      routeRef.current = [glowLine, haloLine, dashLine];
      layersRef.current.push(glowLine, haloLine, dashLine);
      setRouteInfo({ distKm: info.distKm, durMin: info.durMin });
    });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapRef.current, orders, riderPos, primary?.id]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const legDist = (order) => {
    const dest = order.status === 'picked_up'
      ? (order.delivery?.lat ? { lat: order.delivery.lat, lng: order.delivery.lng } : null)
      : (order.restaurant?.lat ? { lat: order.restaurant.lat, lng: order.restaurant.lng } : null);
    return haversineKm(riderPos, dest);
  };

  const gpsWarning = usingFallback
    ? (gpsError?.includes('denied')
        ? '⚠️ GPS denied — enable in browser settings'
        : '📍 Approx. location — GPS unavailable')
    : null;

  const mapLabel = !isOnline ? '🔴 Offline'
    : primary
      ? primary.status === 'picked_up'
        ? `🚴 Delivering → ${primary.customer?.name || 'Customer'}`
        : `🍳 Pickup → ${primary.restaurant?.name || 'Restaurant'}`
      : '🟢 Online — waiting for orders';

  return (
    <div className="rmap-container">
      <div className="rmap-label-chip">{mapLabel}</div>

      <div className="rmap-map-wrap">
        {/* Show spinner while GPS is loading, then mount the real map div */}
        {gpsLoading ? (
          <div className="rmap-loading">
            <div className="rmap-spinner" />
            <span>Getting your location…</span>
          </div>
        ) : !leafletReady ? (
          <div className="rmap-loading">
            <div className="rmap-spinner" />
            <span>Loading map…</span>
          </div>
        ) : (
          <div
            ref={containerRef}
            style={{ width: '100%', height: '100%' }}
          />
        )}

        {gpsWarning && (
          <div className="rmap-gps-warn" style={{
            background: gpsError?.includes('denied') ? '#fee2e2' : '#fef3c7',
            color:      gpsError?.includes('denied') ? '#991b1b' : '#92400e',
          }}>
            {gpsWarning}
          </div>
        )}
      </div>

      {/* Info strip */}
      {isOnline && (
        <div className="rmap-info-strip">
          {allActive.length === 0 ? (
            <div className="rmap-idle">🛵 You are online. Waiting for the next order…</div>
          ) : (
            <>
              {/* Order switcher — only when >1 active */}
              {allActive.length > 1 && (
                <div className="rmap-order-tabs">
                  {allActive.map(o => (
                    <button
                      key={o.id}
                      className={`rmap-order-tab${o.id === primary?.id ? ' active' : ''}`}
                      onClick={() => setSelectedId(o.id)}
                    >
                      {o.status === 'picked_up' ? '🚴' : '🍳'} {o.id}
                    </button>
                  ))}
                </div>
              )}

              {/* One row per active order */}
              {allActive.map(order => {
                const isPickedUp = order.status === 'picked_up';
                const isPrimary  = order.id === primary?.id;
                const dist       = legDist(order);
                return (
                  <div
                    key={order.id}
                    className={`rmap-leg${isPrimary ? ' primary' : ''}`}
                    onClick={() => allActive.length > 1 && setSelectedId(order.id)}
                    style={{ cursor: allActive.length > 1 ? 'pointer' : 'default' }}
                  >
                    <div className="rmap-leg-dot"
                      style={{ background: isPickedUp ? '#10b981' : '#f97316' }} />
                    <div className="rmap-leg-text">
                      <span className="rmap-leg-label">
                        {isPickedUp ? '🚴 Delivering to' : '🍳 Pickup from'}
                      </span>
                      <span className="rmap-leg-name">
                        {isPickedUp
                          ? (order.customer?.name || 'Customer')
                          : (order.restaurant?.name || 'Restaurant')}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--c-gray-400)', marginTop: 1 }}>
                        {isPickedUp ? (order.delivery?.address || '') : order.id}
                      </span>
                    </div>
                    <div className="rmap-leg-stats">
                      <span className="rmap-leg-dist">{formatDistance(dist)}</span>
                      <span className="rmap-leg-eta">{etaMinutes(dist)}</span>
                    </div>
                  </div>
                );
              })}

              {/* OSRM route summary */}
              {routeInfo && primary && (
                <div className="rmap-route-total">
                  <span>Route to {primary.status === 'picked_up' ? 'customer' : 'restaurant'}</span>
                  <span><b>{routeInfo.distKm} km</b> · ~{routeInfo.durMin} min</span>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}