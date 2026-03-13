// useRiderLocation.js
// Live GPS tracking hook — call once, get live rider position + accuracy

import { useState, useEffect, useRef } from 'react';

const DEFAULT_POS = { lat: 23.7808, lng: 90.4206 }; // Dhaka fallback

export function useRiderLocation() {
  const [position,    setPosition]    = useState(null);   // { lat, lng }
  const [accuracy,    setAccuracy]    = useState(null);   // metres
  const [error,       setError]       = useState(null);
  const [loading,     setLoading]     = useState(true);
  const watchIdRef = useRef(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported by this browser.');
      setPosition(DEFAULT_POS);
      setLoading(false);
      return;
    }

    const onSuccess = (pos) => {
      setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setAccuracy(pos.coords.accuracy);
      setLoading(false);
      setError(null);
    };

    const onError = (err) => {
      setError(err.message);
      setPosition(DEFAULT_POS); // fallback so map still renders
      setLoading(false);
    };

    const options = {
      enableHighAccuracy: true,
      maximumAge: 5000,       // cache up to 5s
      timeout: 10000,
    };

    // One-shot first to show map fast, then watch for live updates
    navigator.geolocation.getCurrentPosition(onSuccess, onError, options);
    watchIdRef.current = navigator.geolocation.watchPosition(onSuccess, onError, options);

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return { position, accuracy, error, loading };
}

// ─── Distance helpers ─────────────────────────────────────────────────────────

// Haversine formula → distance in km between two {lat,lng} points
export function haversineKm(a, b) {
  if (!a || !b) return null;
  const R  = 6371;
  const dL = toRad(b.lat - a.lat);
  const dG = toRad(b.lng - a.lng);
  const x  = Math.sin(dL / 2) ** 2 +
              Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dG / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function toRad(deg) { return (deg * Math.PI) / 180; }

// Format km nicely
export function formatDistance(km) {
  if (km === null) return '—';
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

// Rough ETA string (assume ~25 km/h average city speed for a rider)
export function etaMinutes(km, speedKmh = 25) {
  if (km === null) return '—';
  return `${Math.max(1, Math.round((km / speedKmh) * 60))} min`;
}