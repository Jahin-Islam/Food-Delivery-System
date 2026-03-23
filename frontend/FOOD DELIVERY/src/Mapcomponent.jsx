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

const makeIcon = (color, emoji, size = 36) => {
  if (!L) return null;
  const svg = `
    <svg width="${size}" height="${size + 8}" viewBox="0 0 ${size} ${size + 8}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="${color}" stroke="white" stroke-width="3"/>
      <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-size="${size * 0.42}px">${emoji}</text>
      <polygon points="${size / 2 - 5},${size - 1} ${size / 2 + 5},${size - 1} ${size / 2},${size + 7}" fill="${color}"/>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize:   [size, size + 8],
    iconAnchor: [size / 2, size + 8],
    popupAnchor:[0, -(size + 8)],
  });
};

const makePulseIcon = (color) => {
  if (!L) return null;
  return L.divIcon({
    html: `<div class="map-pulse-outer" style="--pulse-color:${color}">
             <div class="map-pulse-inner" style="background:${color}"></div>
           </div>`,
    className: '',
    iconSize:   [24, 24],
    iconAnchor: [12, 12],
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

    // ── Rider dot (pulsing blue) ──
    if (riderPos) {
      if (M.rider) {
        M.rider.setLatLng([riderPos.lat, riderPos.lng]);
      } else {
        M.rider = L.marker([riderPos.lat, riderPos.lng], {
          icon:      makePulseIcon('#4f46e5'),
          zIndexOffset: 1000,
        }).addTo(map).bindPopup('<b>📍 You (Rider)</b>');
      }
    }

    // ── Restaurant pin ──
    if (restaurantPos) {
      if (M.restaurant) {
        M.restaurant.setLatLng([restaurantPos.lat, restaurantPos.lng]);
      } else {
        M.restaurant = L.marker([restaurantPos.lat, restaurantPos.lng], {
          icon: makeIcon('#f97316', '🍽️'),
        }).addTo(map).bindPopup('<b>🍽️ Restaurant (Pickup)</b>');
      }
    }

    // ── Customer pin ──
    if (customerPos) {
      if (M.customer) {
        M.customer.setLatLng([customerPos.lat, customerPos.lng]);
      } else {
        M.customer = L.marker([customerPos.lat, customerPos.lng], {
          icon: makeIcon('#10b981', '🏠'),
        }).addTo(map).bindPopup('<b>🏠 Customer (Drop-off)</b>');
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
          icon: makeIcon('#4f46e5', '🍴', 32),
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