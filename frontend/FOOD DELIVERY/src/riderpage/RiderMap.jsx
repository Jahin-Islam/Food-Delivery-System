// RiderMap.jsx
//
// ROOT CAUSE FIX for blank map:
//   1. Dynamically injects Leaflet CSS + JS if not already present in the page.
//      Previously Leaflet was assumed to be in index.html — if it wasn't,
//      window.L was undefined and the map silently never initialised.
//   2. Init runs AFTER Leaflet loads AND after the container div is in the DOM.
//      The old useEffect([]) ran too early when gpsLoading=true hid the div.
//   3. Uses a ResizeObserver / invalidateSize call so Leaflet recalculates
//      the tile grid whenever the container becomes visible.
//
// OTHER FIXES (carried forward):
//   - Accepts `orders` array → pins every restaurant + delivery address
//   - Picked-up route: rider current location → customer (not restaurant → customer)
//   - Ongoing route:   rider current location → restaurant
//   - Order-switcher tabs in info strip when >1 active order

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
      // Script tag exists but hasn't fired onload yet — poll
      const poll = setInterval(() => {
        if (window.L) { clearInterval(poll); resolve(window.L); }
      }, 50);
    }
  });
}

// ─── Teardrop SVG pin ─────────────────────────────────────────────────────────
function makePin(L, emoji, bg, size = 36) {
  return L.divIcon({
    className:   '',
    iconAnchor:  [size / 2, size],
    popupAnchor: [0, -size],
    html: `<div style="width:${size}px;height:${size}px;background:${bg};
      border-radius:50% 50% 50% 0;transform:rotate(-45deg);
      border:2.5px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,.3);
      display:flex;align-items:center;justify-content:center;">
      <span style="transform:rotate(45deg);font-size:${Math.round(size*.44)}px;line-height:1">${emoji}</span>
    </div>`,
  });
}

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

  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const layersRef    = useRef([]);
  const routeRef     = useRef(null);
  const abortRef     = useRef(null);

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

  // ── 3. Init map — runs when Leaflet is ready AND the container exists ──────
  //     We depend on `leafletReady` AND `gpsLoading` so the effect re-fires
  //     once the loading spinner is replaced by the real container div.
  useEffect(() => {
    if (!leafletReady || mapRef.current) return;        // already inited
    // Wait for the container div to exist in the DOM
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

    // Invalidate size after a short delay so Leaflet measures the container
    // correctly (it might be 0×0 if the parent was just rendered).
    setTimeout(() => map.invalidateSize(), 100);

    // Also invalidate whenever the container is resized
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(container);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  // Re-run when leafletReady changes or gpsLoading switches (container swaps)
  }, [leafletReady, gpsLoading]); // eslint-disable-line

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
      icon: makePin(L, '🛵', '#d70f64', 42),
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
          icon: makePin(L, '🍴', isPrimary ? '#f97316' : '#fdba74', isPrimary ? bigSz : smSz),
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
          icon: makePin(L, '🏠', isPrimary ? '#10b981' : '#6ee7b7', isPrimary ? bigSz : smSz),
          zIndexOffset: isPrimary ? 900 : 400,
        }).addTo(map).bindPopup(
          `<b>🏠 ${order.customer?.name || 'Customer'}</b><br/>` +
          `<small>${order.delivery?.address || ''}</small>`
        );
        layersRef.current.push(m);
        bounds.push([dLat, dLng]);
      }
    });

    // Fit all pins in view
    if (bounds.length > 1) {
      try { map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 }); }
      catch (_) {}
    } else {
      map.setView([rp.lat, rp.lng], 14);
    }

    // ── Route for the primary/selected order ─────────────────────────────
    if (!primary) return;

    const isPickedUp = primary.status === 'picked_up';

    // FIX: both legs start from the rider's CURRENT location
    const from = riderPos ?? DHAKA;

    const toLat = isPickedUp ? primary.delivery?.lat  : primary.restaurant?.lat;
    const toLng = isPickedUp ? primary.delivery?.lng  : primary.restaurant?.lng;
    if (!toLat || !toLng) return;

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    fetchRoute(from, { lat: toLat, lng: toLng }, ctrl.signal).then(info => {
      if (ctrl.signal.aborted || !mapRef.current) return;

      if (routeRef.current) {
        try { mapRef.current.removeLayer(routeRef.current); } catch (_) {}
      }
      if (!info) return;

      const line = L.polyline(info.coords, {
        color:     isPickedUp ? '#10b981' : '#d70f64',
        weight:    5,
        opacity:   0.85,
        dashArray: isPickedUp ? null : '12,7',
        lineJoin:  'round',
      }).addTo(mapRef.current);

      routeRef.current = line;
      layersRef.current.push(line);
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