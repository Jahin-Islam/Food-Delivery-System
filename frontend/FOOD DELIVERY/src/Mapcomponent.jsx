// MapComponent.jsx
// Reusable Leaflet map used across Rider Dashboard, Homepage, Restaurant Detail, Checkout
//
// Props:
//   riderPos       {lat, lng}  — live rider location (blue dot)
//   restaurantPos  {lat, lng}  — restaurant pin (orange)
//   customerPos    {lat, lng}  — customer/delivery pin (green)
//   restaurants    Array       — for Homepage "near me" mode: [{id, name, lat, lng, ...}]
//   showRoute      bool        — draw OSRM route line between points
//   mode           'delivery'|'nearme'|'static'
//   height         string      — CSS height, default '400px'
//   onRouteInfo    fn({distance, duration}) — callback with route data
//   zoom           number      — initial zoom
//   label          string      — map title shown in corner

import { useEffect, useRef, useState } from 'react';
import './MapComponent.css';

// We load Leaflet dynamically so SSR / Vite don't complain about window
let L = null;

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';

// ─── Custom SVG icons ─────────────────────────────────────────────────────────

// SVG icon bodies — white strokes, no fill, matching RiderMap
const SVG_ICONS = {
  restaurant: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h1"/><path d="M18 22V15"/></svg>`,
  customer:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
  nearme:     `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h1"/><path d="M18 22V15"/></svg>`,
};

// Branded circle-badge pin with triangular stem — matches RiderMap's makePin exactly.
// glow=true adds double pulse rings (used for primary/active pins).
const makePin = (color, iconKey = 'restaurant', size = 38, glow = false) => {
  if (!L) return null;
  const stem  = Math.round(size * 0.30);
  const total = size + stem;
  const svgIcon = SVG_ICONS[iconKey] || SVG_ICONS.restaurant;

  const glowStyle = glow
    ? `box-shadow:0 0 0 4px ${color}33,0 0 18px 6px ${color}55,0 4px 14px rgba(0,0,0,0.28);`
    : `box-shadow:0 4px 14px rgba(0,0,0,0.28),0 1px 3px rgba(0,0,0,0.16);`;

  const pulseRings = glow ? `
    <div style="
      position:absolute;top:${size/2}px;left:${size/2}px;
      transform:translate(-50%,-50%);
      width:${size+16}px;height:${size+16}px;
      border-radius:50%;border:2.5px solid ${color};opacity:0;
      animation:mcPulse 1.8s ease-out infinite;pointer-events:none;"></div>
    <div style="
      position:absolute;top:${size/2}px;left:${size/2}px;
      transform:translate(-50%,-50%);
      width:${size+28}px;height:${size+28}px;
      border-radius:50%;border:1.5px solid ${color};opacity:0;
      animation:mcPulse 1.8s ease-out 0.6s infinite;pointer-events:none;"></div>` : '';

  return L.divIcon({
    className:   '',
    iconAnchor:  [size / 2, total],
    popupAnchor: [0, -(total + 4)],
    html: `<div style="position:relative;width:${size}px;height:${total}px;">
      ${pulseRings}
      <div style="
          width:${size}px;height:${size}px;
          background:${color};
          border-radius:50%;
          border:3px solid rgba(255,255,255,0.95);
          ${glowStyle}
          display:flex;align-items:center;justify-content:center;
          position:absolute;top:0;left:0;">
        ${svgIcon}
        <div style="
            position:absolute;bottom:-${stem}px;left:50%;
            transform:translateX(-50%);
            width:0;height:0;
            border-left:${Math.round(size*0.22)}px solid transparent;
            border-right:${Math.round(size*0.22)}px solid transparent;
            border-top:${stem}px solid ${color};"></div>
      </div>
    </div>`,
  });
};

// Rider dot — upgraded to branded pink pin with pulse glow
const makeRiderPin = (size = 44) => {
  if (!L) return null;
  const riderSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 0 0 0-2h-1l-5 8H4"/><path d="m6 17 3.5-7 3 5 2-4h4.5"/></svg>`;
  const stem  = Math.round(size * 0.30);
  const total = size + stem;
  const color = '#d70f64';

  return L.divIcon({
    className:   '',
    iconAnchor:  [size / 2, total],
    popupAnchor: [0, -(total + 4)],
    html: `<div style="position:relative;width:${size}px;height:${total}px;">
      <div style="
        position:absolute;top:${size/2}px;left:${size/2}px;
        transform:translate(-50%,-50%);
        width:${size+16}px;height:${size+16}px;
        border-radius:50%;border:2.5px solid ${color};opacity:0;
        animation:mcPulse 1.8s ease-out infinite;pointer-events:none;"></div>
      <div style="
        position:absolute;top:${size/2}px;left:${size/2}px;
        transform:translate(-50%,-50%);
        width:${size+28}px;height:${size+28}px;
        border-radius:50%;border:1.5px solid ${color};opacity:0;
        animation:mcPulse 1.8s ease-out 0.6s infinite;pointer-events:none;"></div>
      <div style="
          width:${size}px;height:${size}px;
          background:${color};
          border-radius:50%;
          border:3px solid rgba(255,255,255,0.95);
          box-shadow:0 0 0 4px ${color}33,0 0 18px 6px ${color}55,0 4px 14px rgba(0,0,0,0.28);
          display:flex;align-items:center;justify-content:center;
          position:absolute;top:0;left:0;">
        ${riderSvg}
        <div style="
            position:absolute;bottom:-${stem}px;left:50%;
            transform:translateX(-50%);
            width:0;height:0;
            border-left:${Math.round(size*0.22)}px solid transparent;
            border-right:${Math.round(size*0.22)}px solid transparent;
            border-top:${stem}px solid ${color};"></div>
      </div>
    </div>`,
  });
};

// ─── Fetch OSRM route ─────────────────────────────────────────────────────────

async function fetchRoute(waypoints) {
  // waypoints: [{lat,lng}, ...]
  const coords = waypoints.map(p => `${p.lng},${p.lat}`).join(';');
  const url    = `${OSRM_BASE}/${coords}?overview=full&geometries=geojson&steps=false`;
  try {
    const res  = await fetch(url);
    const data = await res.json();
    if (data.code !== 'Ok') return null;
    const route = data.routes[0];
    return {
      coords:   route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      distance: route.legs.reduce((s, l) => s + l.distance, 0), // metres
      duration: route.legs.reduce((s, l) => s + l.duration, 0), // seconds
    };
  } catch {
    return null;
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MapComponent({
  riderPos,
  restaurantPos,
  customerPos,
  restaurants = [],
  showRoute   = false,
  mode        = 'static',      // 'delivery' | 'nearme' | 'static'
  height      = '400px',
  onRouteInfo,
  zoom        = 14,
  label,
  className   = '',
}) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const markersRef   = useRef({});
  const routeRef     = useRef(null);
  const [routeInfo,  setRouteInfo]  = useState(null);
  const [mapReady,   setMapReady]   = useState(false);
  const [loadError,  setLoadError]  = useState(false);

  // ── 1. Bootstrap Leaflet (CSS + JS) once ──────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadLeaflet = async () => {
      try {
        // Inject Leaflet CSS if not already present
        if (!document.getElementById('leaflet-css')) {
          const link  = document.createElement('link');
          link.id     = 'leaflet-css';
          link.rel    = 'stylesheet';
          link.href   = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }

        // Load Leaflet JS
        if (!window.L) {
          await new Promise((resolve, reject) => {
            const script   = document.createElement('script');
            script.src     = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload  = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }

        L = window.L;

        // Fix default marker icon path broken by Vite/webpack
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });

        // Inject branded pin pulse keyframe once
        if (!document.getElementById('mc-pulse-style')) {
          const s = document.createElement('style');
          s.id = 'mc-pulse-style';
          s.textContent = `@keyframes mcPulse{0%{opacity:.7;transform:translate(-50%,-50%) scale(.85)}100%{opacity:0;transform:translate(-50%,-50%) scale(1.65)}}`;
          document.head.appendChild(s);
        }

        setMapReady(true);
      } catch (e) {
        console.error('Leaflet load error:', e);
        setLoadError(true);
      }
    };

    loadLeaflet();
  }, []);

  // ── 2. Initialise map once Leaflet + DOM are ready ────────────────────────
  useEffect(() => {
    if (!mapReady || !containerRef.current) return;

    // Destroy any existing map on this container (StrictMode double-invoke guard)
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
    // Clear Leaflet's internal container registry so it doesn't throw "already initialized"
    if (containerRef.current._leaflet_id) {
      delete containerRef.current._leaflet_id;
    }

    const center = riderPos || restaurantPos || customerPos ||
                   (restaurants[0] ? { lat: restaurants[0].lat, lng: restaurants[0].lng } : null) ||
                   { lat: 23.7808, lng: 90.4206 };

    mapRef.current = L.map(containerRef.current, {
      center:          [center.lat, center.lng],
      zoom,
      zoomControl:     true,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(mapRef.current);

    // Subtle attribution
    L.control.attribution({ prefix: false })
      .addAttribution('© <a href="https://openstreetmap.org">OSM</a>')
      .addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      if (containerRef.current && containerRef.current._leaflet_id) {
        delete containerRef.current._leaflet_id;
      }
    };
  }, [mapReady]); // eslint-disable-line

  // ── 3. Update markers whenever positions change ───────────────────────────
  useEffect(() => {
    if (!mapRef.current || !L) return;
    const map = mapRef.current;
    const M   = markersRef.current;

    // ── Rider dot (branded pink pin with pulse) ──
    if (riderPos) {
      if (M.rider) {
        M.rider.setLatLng([riderPos.lat, riderPos.lng]);
      } else {
        M.rider = L.marker([riderPos.lat, riderPos.lng], {
          icon:      makeRiderPin(44),
          zIndexOffset: 2000,
        }).addTo(map).bindPopup('<b>🛵 You (Rider)</b>');
      }
    }

    // ── Restaurant pin (orange, glowing) ──
    if (restaurantPos) {
      if (M.restaurant) {
        M.restaurant.setLatLng([restaurantPos.lat, restaurantPos.lng]);
      } else {
        M.restaurant = L.marker([restaurantPos.lat, restaurantPos.lng], {
          icon: makePin('#f97316', 'restaurant', 38, true),
          zIndexOffset: 1000,
        }).addTo(map).bindPopup('<b>🍴 Restaurant (Pickup)</b>');
      }
    }

    // ── Customer / delivery pin (green, glowing) ──
    if (customerPos) {
      if (M.customer) {
        M.customer.setLatLng([customerPos.lat, customerPos.lng]);
      } else {
        M.customer = L.marker([customerPos.lat, customerPos.lng], {
          icon: makePin('#10b981', 'customer', 38, true),
          zIndexOffset: 900,
        }).addTo(map).bindPopup('<b>📍 Customer (Drop-off)</b>');
      }
    }

    // ── Homepage restaurant pins ──
    if (mode === 'nearme' && restaurants.length) {
      // Clear old restaurant markers
      Object.keys(M).filter(k => k.startsWith('r_')).forEach(k => {
        map.removeLayer(M[k]); delete M[k];
      });
      restaurants.forEach(r => {
        if (!r.lat || !r.lng) return;
        M[`r_${r.id}`] = L.marker([r.lat, r.lng], {
          icon: makePin('#f97316', 'nearme', 32, false),
        }).addTo(map).bindPopup(
          `<div style="min-width:130px">
            <b>${r.name}</b><br>
            <span style="font-size:12px;color:#6b7280">${r.address || ''}</span><br>
            ${r.rating ? `⭐ ${r.rating}` : ''}
          </div>`
        );
      });

      // Fit map to all pins
      const allPins = restaurants.filter(r => r.lat && r.lng).map(r => [r.lat, r.lng]);
      if (riderPos) allPins.push([riderPos.lat, riderPos.lng]);
      if (allPins.length > 1) map.fitBounds(allPins, { padding: [40, 40] });
    }

    // ── Auto-fit bounds to all active markers ──
    if (mode === 'delivery') {
      const pts = [riderPos, restaurantPos, customerPos]
        .filter(Boolean)
        .map(p => [p.lat, p.lng]);
      if (pts.length > 1) map.fitBounds(pts, { padding: [50, 50] });
      else if (pts.length === 1) map.setView(pts[0], zoom);
    }

  }, [mapReady, riderPos, restaurantPos, customerPos, restaurants, mode]); // eslint-disable-line

  // ── 4. Draw / update route ────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !L || !showRoute) return;

    const waypoints = [riderPos, restaurantPos, customerPos].filter(Boolean);
    if (waypoints.length < 2) return;

    let cancelled = false;
    fetchRoute(waypoints).then(info => {
      if (cancelled || !mapRef.current || !info) return;

      // Remove old polyline
      if (routeRef.current) mapRef.current.removeLayer(routeRef.current);

      // Draw new one
      routeRef.current = L.polyline(info.coords, {
        color:  '#4f46e5',
        weight: 5,
        opacity: 0.8,
        lineJoin: 'round',
        lineCap: 'round',
        dashArray: null,
      }).addTo(mapRef.current);

      const distKm  = (info.distance / 1000).toFixed(1);
      const durMin  = Math.ceil(info.duration / 60);
      const summary = { distKm, durMin };
      setRouteInfo(summary);
      onRouteInfo && onRouteInfo(summary);
    });

    return () => { cancelled = true; };
  }, [mapReady, showRoute, riderPos, restaurantPos, customerPos]); // eslint-disable-line

  // ── 5. Remove route when showRoute turns off ──────────────────────────────
  useEffect(() => {
    if (!showRoute && routeRef.current && mapRef.current) {
      mapRef.current.removeLayer(routeRef.current);
      routeRef.current = null;
      setRouteInfo(null);
    }
  }, [showRoute]);

  if (loadError) return (
    <div className="map-error" style={{ height }}>
      <span>🗺️ Map failed to load. Check your connection.</span>
    </div>
  );

  return (
    <div className={`map-wrapper ${className}`} style={{ height }}>
      {/* Map container */}
      <div ref={containerRef} className="map-leaflet-container" />

      {/* Label badge */}
      {label && <div className="map-label-badge">{label}</div>}

      {/* Route info overlay */}
      {routeInfo && (
        <div className="map-route-info">
          <span className="map-route-dist">📍 {routeInfo.distKm} km</span>
          <span className="map-route-sep">·</span>
          <span className="map-route-eta">⏱ ~{routeInfo.durMin} min</span>
        </div>
      )}
    </div>
  );
}