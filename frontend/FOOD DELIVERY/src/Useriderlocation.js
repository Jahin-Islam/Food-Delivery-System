// useRiderLocation.js
// FIX #5: Live GPS tracking hook with proper fallback and meaningful error messages.
// - Tries high-accuracy GPS first
// - Falls back to network/coarse location on failure
// - Shows clear error state vs fallback state
// - Passes coordinates to backend when online

import { useState, useEffect, useRef } from 'react';

const DEFAULT_POS = { lat: 23.7808, lng: 90.4206 }; // Dhaka city centre fallback

export function useRiderLocation() {
  const [position,       setPosition]       = useState(null);
  const [accuracy,       setAccuracy]       = useState(null);
  const [error,          setError]          = useState(null);
  const [loading,        setLoading]        = useState(true);
  // FIX #5: distinguish between "GPS failed, using fallback" vs "using real GPS"
  const [usingFallback,  setUsingFallback]  = useState(false);
  const watchIdRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.');
      setPosition(DEFAULT_POS);
      setUsingFallback(true);
      setLoading(false);
      return;
    }

    const highAccuracyOptions = {
      enableHighAccuracy: true,
      maximumAge:         3000,
      timeout:            10000,
    };

    // FIX #5: low-accuracy fallback options (uses network/WiFi-based location)
    const lowAccuracyOptions = {
      enableHighAccuracy: false,
      maximumAge:         10000,
      timeout:            8000,
    };

    const onSuccess = (pos) => {
      setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setAccuracy(pos.coords.accuracy);
      setLoading(false);
      setError(null);
      setUsingFallback(false);
    };

    // FIX #5: two-stage fallback — first try high accuracy, then low accuracy, then Dhaka default
    const onHighAccuracyError = (err) => {
      console.warn('[GPS] High-accuracy failed, trying low-accuracy:', err.message);
      // Try low-accuracy (network/WiFi) as second attempt
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setAccuracy(pos.coords.accuracy);
          setLoading(false);
          setError(null); // No error — low-accuracy worked
          setUsingFallback(false);
        },
        (err2) => {
          // Both GPS and network failed — use Dhaka default but show a soft warning
          console.warn('[GPS] Low-accuracy also failed:', err2.message);
          const friendlyMsg = err2.code === 1
            ? 'Location access denied. Enable location permission for accurate positioning.'
            : err2.code === 2
              ? 'Could not determine your location. Showing approximate Dhaka area.'
              : 'Location request timed out. Showing approximate Dhaka area.';
          setError(friendlyMsg);
          setPosition(DEFAULT_POS);
          setUsingFallback(true);
          setLoading(false);
        },
        lowAccuracyOptions
      );
    };

    // One-shot first to show map fast
    navigator.geolocation.getCurrentPosition(onSuccess, onHighAccuracyError, highAccuracyOptions);

    // Then watch for live updates (uses high accuracy for live tracking)
    watchIdRef.current = navigator.geolocation.watchPosition(
      onSuccess,
      (err) => {
        // Watch errors are non-fatal — don't reset position
        console.warn('[GPS] Watch error (non-fatal):', err.message);
        if (!position) {
          setError('Location updates unavailable.');
          setPosition(DEFAULT_POS);
          setUsingFallback(true);
          setLoading(false);
        }
      },
      highAccuracyOptions
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { position, accuracy, error, loading, usingFallback };
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