// StaticMap.jsx
// A lightweight static map pin — used in Restaurant Detail and Checkout.
// Shows a single location with no routing, no GPS tracking.
//
// Usage in RestaurantDetail:
//   import StaticMap from './StaticMap.jsx';
//   <StaticMap
//     lat={restaurant.address?.latitude}
//     lng={restaurant.address?.longitude}
//     label={restaurant.name}
//     pinEmoji="🍽️"
//     pinColor="#f97316"
//     height="220px"
//   />
//
// Usage in Checkout (delivery address):
//   <StaticMap
//     lat={deliveryAddress?.latitude}
//     lng={deliveryAddress?.longitude}
//     label="Delivery address"
//     pinEmoji="🏠"
//     pinColor="#10b981"
//     height="180px"
//   />

import MapComponent from '../Mapcomponent.jsx';
import './StaticMap.css';

// Resolve lat/lng from whatever shape is passed in
// Supports: flat lat/lng props, or pass the whole restaurant and it reads address.latitude
function resolveCoord(val) {
  if (val == null) return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

export default function StaticMap({
  lat,
  lng,
  label      = 'Location',
  pinEmoji   = '📍',
  pinColor   = '#4f46e5',
  height     = '220px',
  className  = '',
  address    = '',
}) {
  const resolvedLat = resolveCoord(lat);
  const resolvedLng = resolveCoord(lng);

  if (!resolvedLat || !resolvedLng) {
    return (
      <div className={`smap-placeholder ${className}`} style={{ height }}>
        <span className="smap-placeholder-icon">🗺️</span>
        <span className="smap-placeholder-text">Location not available</span>
        {address && <span className="smap-placeholder-addr">{address}</span>}
      </div>
    );
  }

  const pos = { lat: resolvedLat, lng: resolvedLng };

  return (
    <div className={`smap-wrapper ${className}`}>
      <MapComponent
        restaurantPos={pinEmoji === '🍽️' ? pos : undefined}
        customerPos={pinEmoji !== '🍽️'   ? pos : undefined}
        showRoute={false}
        mode="static"
        height={height}
        label={label}
        zoom={15}
      />
      {address && (
        <div className="smap-address-bar">
          <span className="smap-addr-icon">{pinEmoji}</span>
          <span className="smap-addr-text">{address}</span>
        </div>
      )}
    </div>
  );
}