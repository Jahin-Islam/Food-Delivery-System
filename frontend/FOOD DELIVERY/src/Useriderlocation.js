
import { useState, useEffect, useRef } from 'react';

const DEFAULT_POS = { lat: 23.7808, lng: 90.4206 }; // Dhaka city centre fallback

export function useRiderLocation() {
  const [position,       setPosition]       = useState(null);
  const [accuracy,       setAccuracy]       = useState(null);
  const [error,          setError]          = useState(null);
  const [loading,        setLoading]        = useState(true);
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

    const onHighAccuracyError = (err) => {
      console.warn('[GPS] High-accuracy failed, trying low-accuracy:', err.message);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setAccuracy(pos.coords.accuracy);
          setLoading(false);
          setError(null); 
          setUsingFallback(false);
        },
        (err2) => {
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

    navigator.geolocation.getCurrentPosition(onSuccess, onHighAccuracyError, highAccuracyOptions);

    watchIdRef.current = navigator.geolocation.watchPosition(
      onSuccess,
      (err) => {
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
  }, []); 

  return { position, accuracy, error, loading, usingFallback };
}
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

export function formatDistance(km) {
  if (km === null) return '—';
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

export function etaMinutes(km, speedKmh = 25) {
  if (km === null) return '—';
  return `${Math.max(1, Math.round((km / speedKmh) * 60))} min`;
}