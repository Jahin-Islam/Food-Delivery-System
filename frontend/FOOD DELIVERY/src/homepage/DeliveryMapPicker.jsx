import { useEffect, useRef, useState, useCallback } from 'react';
import './DeliveryMapPicker.css';

let L = null;

async function reverseGeocode(lat, lng) {
  try {
    const res  = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    return data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

async function searchAddress(q) {
  if (q.trim().length < 3) return [];
  try {
    const res  = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&countrycodes=bd&format=json&limit=5&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    return data.map(r => ({
      label: r.display_name,
      lat:   parseFloat(r.lat),
      lng:   parseFloat(r.lon),
    }));
  } catch {
    return [];
  }
}

function makeDeliveryPin(L_ref) {
  const bg    = '#d70f64';
  const size  = 40;
  const stem  = Math.round(size * 0.30);
  const total = size + stem;

  const svgIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>`;

  return L_ref.divIcon({
    className:   '',
    iconAnchor:  [size / 2, total],
    popupAnchor: [0, -(total + 4)],
    html: `<div style="position:relative;width:${size}px;height:${total}px;">
      <div style="
        position:absolute;top:${size / 2}px;left:${size / 2}px;
        transform:translate(-50%,-50%);
        width:${size + 16}px;height:${size + 16}px;
        border-radius:50%;
        border:2.5px solid ${bg};
        opacity:0;
        animation:dmpPulse 1.8s ease-out infinite;
        pointer-events:none;
      "></div>
      <div style="
        position:absolute;top:${size / 2}px;left:${size / 2}px;
        transform:translate(-50%,-50%);
        width:${size + 28}px;height:${size + 28}px;
        border-radius:50%;
        border:1.5px solid ${bg};
        opacity:0;
        animation:dmpPulse 1.8s ease-out 0.6s infinite;
        pointer-events:none;
      "></div>
      <div style="
        width:${size}px;height:${size}px;
        background:${bg};
        border-radius:50%;
        border:3px solid rgba(255,255,255,0.95);
        box-shadow:0 0 0 4px ${bg}33, 0 0 18px 6px ${bg}55, 0 4px 14px rgba(0,0,0,0.30);
        display:flex;align-items:center;justify-content:center;
        position:relative;">
        ${svgIcon}
        <div style="
          position:absolute;bottom:-${stem}px;left:50%;
          transform:translateX(-50%);
          width:0;height:0;
          border-left:${Math.round(size * 0.22)}px solid transparent;
          border-right:${Math.round(size * 0.22)}px solid transparent;
          border-top:${stem}px solid ${bg};"></div>
      </div>
    </div>`,
  });
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function DeliveryMapPicker({ onLocationSelect, initialLat, initialLng }) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const markerRef    = useRef(null);
  const debounceRef  = useRef(null);
  const searchRef    = useRef(null);

  const [address,      setAddress]      = useState('');
  const [loading,      setLoading]      = useState(false);
  const [gpsLoading,   setGpsLoading]   = useState(false);
  const [mapReady,     setMapReady]     = useState(false);
  const [error,        setError]        = useState(null);
  const [query,        setQuery]        = useState('');
  const [suggestions,  setSuggestions]  = useState([]);
  const [suggestLoad,  setSuggestLoad]  = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const DEFAULT = { lat: initialLat ?? 23.7808, lng: initialLng ?? 90.4206 };

  // ── Close suggestions on outside click ───────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Load Leaflet ──────────────────────────────────────────────────────────
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
      } catch {
        setError('Map failed to load. Check your connection.');
      }
    };
    load();
  }, []);

  // ── Init map + marker ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !containerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current    = null;
      markerRef.current = null;
    }
    if (containerRef.current._leaflet_id) {
      delete containerRef.current._leaflet_id;
    }

    const map = L.map(containerRef.current, {
      center:             [DEFAULT.lat, DEFAULT.lng],
      zoom:               15,
      zoomControl:        true,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    L.control.attribution({ prefix: false })
      .addAttribution('© <a href="https://openstreetmap.org">OSM</a>')
      .addTo(map);

    const icon   = makeDeliveryPin(L);
    const marker = L.marker([DEFAULT.lat, DEFAULT.lng], { icon, draggable: true })
      .addTo(map)
      .bindPopup('<b>Drag me to your door</b>', { offset: [0, -36] })
      .openPopup();

    const handleMove = async (lat, lng) => {
      setLoading(true);
      const addr = await reverseGeocode(lat, lng);
      setAddress(addr);
      setQuery(addr);
      setLoading(false);
      onLocationSelect?.({ lat, lng, address: addr });
    };

    marker.on('dragend', (e) => {
      const { lat, lng } = e.target.getLatLng();
      handleMove(lat, lng);
    });

    map.on('click', (e) => {
      marker.setLatLng(e.latlng);
      handleMove(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current    = map;
    markerRef.current = marker;

    handleMove(DEFAULT.lat, DEFAULT.lng);

    return () => {
      map.remove();
      mapRef.current    = null;
      markerRef.current = null;
      if (containerRef.current && containerRef.current._leaflet_id) {
        delete containerRef.current._leaflet_id;
      }
    };
  }, [mapReady]); 

  // ── Move pin & map to a new lat/lng ──────────────────────────────────────
  const movePin = useCallback(async (lat, lng, label) => { 
    if (mapRef.current && markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      mapRef.current.setView([lat, lng], 17);
    }
    setLoading(true);
    const addr = label ?? await reverseGeocode(lat, lng);
    setAddress(addr);
    setQuery(addr);
    setSuggestions([]);
    setShowDropdown(false);
    setLoading(false);
    onLocationSelect?.({ lat, lng, address: addr }); // eslint-disable-line react-hooks/exhaustive-deps
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Search input ──────────────────────────────────────────────────────────
  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setShowDropdown(true);
    clearTimeout(debounceRef.current);
    if (val.trim().length < 3) { setSuggestions([]); return; }
    setSuggestLoad(true);
    debounceRef.current = setTimeout(async () => {
      const results = await searchAddress(val);
      setSuggestions(results);
      setSuggestLoad(false);
    }, 380);
  };

  const handleSuggestionClick = (s) => movePin(s.lat, s.lng, s.label);

  const handleSearchSubmit = () => {
    if (suggestions.length > 0) movePin(suggestions[0].lat, suggestions[0].lng, suggestions[0].label);
  };
  const useMyLocation = () => {
    if (!navigator.geolocation) { alert('Geolocation is not supported by your browser.'); return; }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await movePin(pos.coords.latitude, pos.coords.longitude);
        setGpsLoading(false);
      },
      (err) => {
        alert('Could not get your location: ' + err.message);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  if (error) return <div className="dmp-error">🗺️ {error}</div>;

  return (
    <div className="dmp-wrapper">

      {/* ── Search bar ──────────────────────────────────────────── */}
      <div className="dmp-search-bar" ref={searchRef}>
        <div className="dmp-search-input-wrap">
          <svg className="dmp-search-icon" width="15" height="15" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.2"
            strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            className="dmp-search-input"
            placeholder="Search street, area, or landmark…"
            value={query}
            onChange={handleQueryChange}
            onFocus={() => query.length >= 3 && setShowDropdown(true)}
            onKeyDown={e => e.key === 'Enter' && handleSearchSubmit()}
          />
          {query && (
            <button
              className="dmp-search-clear"
              onClick={() => { setQuery(''); setSuggestions([]); setShowDropdown(false); }}
              title="Clear"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          )}
          <button className="dmp-search-btn" onClick={handleSearchSubmit} title="Search">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>

        {showDropdown && (suggestLoad || suggestions.length > 0) && (
          <div className="dmp-suggestions">
            {suggestLoad && <div className="dmp-suggest-loading">Searching…</div>}
            {!suggestLoad && suggestions.map((s, i) => (
              <button key={i} className="dmp-suggest-item" onMouseDown={() => handleSuggestionClick(s)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.2"
                  strokeLinecap="round" strokeLinejoin="round"
                  className="dmp-suggest-icon">
                  <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Hint ────────────────────────────────────────────────── */}
      <div className="dmp-hint">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.2"
          strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
        <strong>Click the map or drag the pin</strong> to set your delivery address
      </div>

      {/* ── Map ─────────────────────────────────────────────────── */}
      <div ref={containerRef} className="dmp-map" />

      {/* ── Bottom bar ──────────────────────────────────────────── */}
      <div className="dmp-bottom">
        <button className="dmp-gps-btn" onClick={useMyLocation} disabled={gpsLoading} title="Use my GPS location">
          {gpsLoading
            ? <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.2"
                  strokeLinecap="round" strokeLinejoin="round"
                  style={{ animation: 'dmpSpin 0.9s linear infinite' }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                Locating…
              </>
            : <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.2"
                  strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
                  <circle cx="12" cy="12" r="9" strokeDasharray="2 4"/>
                </svg>
                Use my location
              </>
          }
        </button>

        <div className="dmp-address">
          {loading
            ? <span className="dmp-addr-loading">Finding address…</span>
            : <span className="dmp-addr-text">{address || 'Move the pin to set your address'}</span>
          }
        </div>
      </div>

      <style>{`
        @keyframes dmpPulse {
          0%   { transform: translate(-50%,-50%) scale(0.85); opacity: 0.7; }
          100% { transform: translate(-50%,-50%) scale(1.6);  opacity: 0; }
        }
        @keyframes dmpSpin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}