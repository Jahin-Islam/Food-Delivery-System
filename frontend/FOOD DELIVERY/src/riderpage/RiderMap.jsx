// RiderMap.jsx
// Drop-in replacement for the map placeholder in RiderDashboard's StatusTab.
//
// Usage inside StatusTab:
//   import RiderMap from './RiderMap.jsx';
//   <RiderMap order={activeOrder} />
//
// Props:
//   order  — the active order object (from MOCK_ORDERS shape), or null if idle
//   isOnline — bool

import { useState, useCallback } from 'react';
import MapComponent from '../Mapcomponent.jsx';
import { useRiderLocation, haversineKm, formatDistance, etaMinutes } from '../Useriderlocation.js';
import './RiderMap.css';

export default function RiderMap({ order = null, isOnline = false }) {
  const { position: riderPos, loading, error } = useRiderLocation();
  const [routeInfo, setRouteInfo] = useState(null);

  // Extract positions from order (your backend returns lat/lng nested in address)
  const restaurantPos = order?.restaurant?.lat
    ? { lat: order.restaurant.lat, lng: order.restaurant.lng }
    : null;

  const customerPos = order?.delivery?.lat
    ? { lat: order.delivery.lat, lng: order.delivery.lng }
    : null;

  // Which waypoints exist right now
  const hasRoute      = !!(riderPos && (restaurantPos || customerPos));
  const distToPickup  = haversineKm(riderPos, restaurantPos);
  const distToDropoff = haversineKm(restaurantPos || riderPos, customerPos);

  const handleRouteInfo = useCallback((info) => setRouteInfo(info), []);

  // ── Status label for the map badge ──
  const mapLabel = !isOnline
    ? '🔴 Offline — Waiting'
    : order
      ? order.status === 'ongoing'   ? '🍳 Heading to Restaurant'
      : order.status === 'picked_up' ? '🚴 Delivering to Customer'
      : '📦 New Order'
    : '🟢 Online — No active order';

  return (
    <div className="rmap-container">
      {/* Map */}
      <div className="rmap-map-wrap">
        {loading ? (
          <div className="rmap-loading">
            <div className="rmap-spinner" />
            <span>Getting your location…</span>
          </div>
        ) : (
          <MapComponent
            riderPos={riderPos}
            restaurantPos={restaurantPos}
            customerPos={order?.status === 'picked_up' ? customerPos : null}
            showRoute={hasRoute}
            mode="delivery"
            height="100%"
            label={mapLabel}
            onRouteInfo={handleRouteInfo}
            zoom={14}
          />
        )}
        {error && (
          <div className="rmap-gps-warn">
            ⚠️ GPS unavailable — showing approximate location
          </div>
        )}
      </div>

      {/* Info strip below map */}
      {isOnline && (
        <div className="rmap-info-strip">
          {order ? (
            <>
              {/* Pickup leg */}
              {restaurantPos && (
                <div className="rmap-leg">
                  <div className="rmap-leg-dot" style={{ background: '#f97316' }} />
                  <div className="rmap-leg-text">
                    <span className="rmap-leg-label">Pickup</span>
                    <span className="rmap-leg-name">{order.restaurant.name}</span>
                  </div>
                  <div className="rmap-leg-stats">
                    <span className="rmap-leg-dist">{formatDistance(distToPickup)}</span>
                    <span className="rmap-leg-eta">{etaMinutes(distToPickup)}</span>
                  </div>
                </div>
              )}

              {/* Dropoff leg */}
              {customerPos && (
                <div className="rmap-leg">
                  <div className="rmap-leg-dot" style={{ background: '#10b981' }} />
                  <div className="rmap-leg-text">
                    <span className="rmap-leg-label">Drop-off</span>
                    <span className="rmap-leg-name">{order.customer.name}</span>
                  </div>
                  <div className="rmap-leg-stats">
                    <span className="rmap-leg-dist">{formatDistance(distToDropoff)}</span>
                    <span className="rmap-leg-eta">{etaMinutes(distToDropoff)}</span>
                  </div>
                </div>
              )}

              {/* OSRM route total */}
              {routeInfo && (
                <div className="rmap-route-total">
                  <span>Total route</span>
                  <span><b>{routeInfo.distKm} km</b> · ~{routeInfo.durMin} min</span>
                </div>
              )}
            </>
          ) : (
            <div className="rmap-idle">
              <span>🛵 You are online. Waiting for the next order…</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}