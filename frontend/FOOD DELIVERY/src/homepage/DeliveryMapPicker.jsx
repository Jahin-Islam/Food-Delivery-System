// DeliveryMapPicker.jsx
// Interactive Leaflet map that lets the user drag a pin to choose their delivery address.
// Used inside Checkout.jsx in the "Delivery address" section.
//
// Props:
//   onLocationSelect({ lat, lng, address }) — called whenever the pin moves
//   initialLat / initialLng               — optional starting position

import { useEffect, useRef, useState } from 'react';
import './DeliveryMapPicker.css';

let L = null;

// Reverse-geocode with Nominatim (free, no key needed)
async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
    const res  = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    const data = await res.json();
    return data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

export default function DeliveryMapPicker({
  onLocationSelect,
  initialLat,
  initialLng,
}) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const markerRef    = useRef(null);

  const [address,     setAddress]     = useState('');
  const [loading,     setLoading]     = useState(false);
  const [gpsLoading,  setGpsLoading]  = useState(false);
  const [mapReady,    setMapReady]    = useState(false);
  const [error,       setError]       = useState(null);

  // Default: Dhaka city centre
  const DEFAULT = { lat: initialLat ?? 23.7808, lng: initialLng ?? 90.4206 };

  // ── 1. Load Leaflet once ──────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const load = async () => {
      try {
        if (!document.getElementById('leaflet-css')) {
          const link  = document.createElement('link');
          link.id     = 'leaflet-css';
          link.rel    = 'stylesheet';
          link.href   = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }
        if (!window.L) {
          await new Promise((resolve, reject) => {
            const s   = document.createElement('script');
            s.src     = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            s.onload  = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
          });
        }
        L = window.L;
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });
        setMapReady(true);
      } catch (e) {
        setError('Map failed to load. Check your connection.');
      }
    };
    load();
  }, []);

  // ── 2. Init map + draggable marker ───────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center:             [DEFAULT.lat, DEFAULT.lng],
      zoom:               15,
      zoomControl:        true,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 })
      .addTo(map);

    L.control.attribution({ prefix: false })
      .addAttribution('© <a href="https://openstreetmap.org">OSM</a>')
      .addTo(map);

    // Custom home-pin icon
    const homeIcon = L.divIcon({
      html: `<div class="dmp-pin">🏠</div>`,
      className: '',
      iconSize:   [40, 40],
      iconAnchor: [20, 40],
      popupAnchor:[0, -42],
    });

    const marker = L.marker([DEFAULT.lat, DEFAULT.lng], {
      icon:      homeIcon,
      draggable: true,
    })
      .addTo(map)
      .bindPopup('<b>Drag me to your door</b>', { offset: [0, -36] })
      .openPopup();

    // On drag end — reverse geocode and report back
    const handleMove = async (lat, lng) => {
      setLoading(true);
      const addr = await reverseGeocode(lat, lng);
      setAddress(addr);
      setLoading(false);
      onLocationSelect?.({ lat, lng, address: addr });
    };

    marker.on('dragend', (e) => {
      const { lat, lng } = e.target.getLatLng();
      handleMove(lat, lng);
    });

    // Also allow clicking the map to move the pin
    map.on('click', (e) => {
      marker.setLatLng(e.latlng);
      handleMove(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current    = map;
    markerRef.current = marker;

    // Initial reverse geocode
    handleMove(DEFAULT.lat, DEFAULT.lng);

    return () => {
      map.remove();
      mapRef.current    = null;
      markerRef.current = null;
    };
  }, [mapReady]); // eslint-disable-line

  // ── Use my GPS location ───────────────────────────────────────────────────
  const useMyLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (mapRef.current && markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
          mapRef.current.setView([lat, lng], 17);
          setLoading(true);
          const addr = await reverseGeocode(lat, lng);
          setAddress(addr);
          setLoading(false);
          onLocationSelect?.({ lat, lng, address: addr });
        }
        setGpsLoading(false);
      },
      (err) => {
        alert('Could not get your location: ' + err.message);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  if (error) {
    return <div className="dmp-error">🗺️ {error}</div>;
  }

  return (
    <div className="dmp-wrapper">
      <div className="dmp-hint">
        📍 <strong>Click the map or drag the pin</strong> to set your delivery address
      </div>

      {/* Map */}
      <div ref={containerRef} className="dmp-map" />

      {/* Bottom bar */}
      <div className="dmp-bottom">
        <button
          className="dmp-gps-btn"
          onClick={useMyLocation}
          disabled={gpsLoading}
          title="Use my GPS location"
        >
          {gpsLoading ? '⏳' : '🎯'} {gpsLoading ? 'Locating…' : 'Use my location'}
        </button>
        <div className="dmp-address">
          {loading
            ? <span className="dmp-addr-loading">Finding address…</span>
            : <span className="dmp-addr-text">{address || 'Move the pin to set your address'}</span>}
        </div>
      </div>
    </div>
  );
}