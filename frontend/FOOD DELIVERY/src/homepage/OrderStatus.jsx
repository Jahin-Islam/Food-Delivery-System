import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle, Utensils,
  Clock, ClipboardList, ChefHat, Bike, PackageCheck, Loader2,
} from 'lucide-react';
import Header from './Header.jsx';
import authService from '../Authservice.js';

export const LS_KEY = 'fp_current_orders';

// ─── Step definitions ────────────────────────────────────────────────────────
const STEPS = [
  {
    key: 'PENDING',
    label: 'Order Confirmation',
    desc: 'Waiting for the restaurant to accept',
    Icon: ClipboardList,
  },
  {
    key: 'PREPARING',
    label: 'Preparing',
    desc: 'Restaurant is preparing your food',
    Icon: ChefHat,
  },
  {
    key: 'PICKED_UP',
    label: 'Shipping',
    desc: 'Rider has picked up your order',
    Icon: Bike,
  },
  {
    key: 'DELIVERED',
    label: 'Completed',
    desc: 'Your order has been delivered!',
    Icon: PackageCheck,
  },
];

const STATUS_ORDER = ['PENDING', 'PREPARING', 'PICKED_UP', 'DELIVERED'];
const getStepIndex = (status) => {
  const idx = STATUS_ORDER.indexOf(status ?? 'PENDING');
  return idx === -1 ? 0 : idx;
};

// ─── Fetch all orders from backend ────────────────────────────────────────────
async function fetchOrdersFromBackend() {
  try {
    let token = authService.getAccessToken();
    if (!token) return null;

    const attempt = (t) =>
      fetch('http://127.0.0.1:8000/api/customers/me/orders/', {
        headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
      });

    let res = await attempt(token);

    if (res.status === 401) {
      try {
        token = await authService.refreshAccessToken();
        res = await attempt(token);
      } catch {
        return null;
      }
    }

    if (!res.ok) return null;

    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return null;
  }
}

// ─── Fetch full detail for a single order (includes items) ───────────────────
async function fetchOrderDetail(orderId) {
  try {
    let token = authService.getAccessToken();
    if (!token) return null;

    const attempt = (t) =>
      fetch(`http://127.0.0.1:8000/api/customers/me/orders/${orderId}/`, {
        headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
      });

    let res = await attempt(token);

    if (res.status === 401) {
      try {
        token = await authService.refreshAccessToken();
        res = await attempt(token);
      } catch {
        return null;
      }
    }

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ─── Map backend order → local display shape ──────────────────────────────────
function mapBackendOrder(backendOrder, detailData) {
  // Items come from the detail endpoint
  const rawItems = detailData?.items ?? [];
  const items = rawItems.map((oi) => ({
    id:       oi.id,
    name:     oi.item_name ?? oi.name ?? 'Item',
    price:    parseFloat(oi.price_at_purchase ?? 0),
    quantity: oi.quantity,
    image:    oi.item_image ?? '',
  }));

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);

  return {
    orderId:        backendOrder.order_id,
    createdAt:      backendOrder.created_at,
    status:         backendOrder.status ?? 'PENDING',
    restaurant: {
      name:      backendOrder.restaurant_name ?? detailData?.restaurant_name ?? '',
      image_url: backendOrder.restaurant_image ?? '',
    },
    items,
    subtotal:       parseFloat(detailData?.delivery_charge != null ? subtotal : (backendOrder.total_amount ?? subtotal)),
    deliveryFee:    parseFloat(detailData?.delivery_charge ?? 0),
    discountAmount: parseFloat(detailData?.discount_amount ?? 0),
    tip:            parseFloat(detailData?.rider_tip ?? 0),
    total:          parseFloat(backendOrder.total_amount ?? 0),
  };
}

// ─── Single order card ────────────────────────────────────────────────────────
const OrderCard = ({ order }) => {
  const stepIdx = getStepIndex(order.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        background: 'var(--c-white)',
        borderRadius: 16,
        boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
        padding: 24,
        marginBottom: 20,
        border: '1.5px solid var(--c-gray-100)',
      }}
    >
      {/* Order ID + timestamp */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--c-gray-900)', margin: '0 0 4px' }}>
          Order ID: <span style={{ color: 'var(--c-primary)' }}>#{order.orderId}</span>
        </h2>
        <p style={{ fontSize: 13, color: 'var(--c-gray-400)', margin: 0 }}>
          {order.createdAt ? new Date(order.createdAt).toLocaleString() : ''}
        </p>
      </div>

      {/* ── Progress Steps ── */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-gray-700)', marginBottom: 14 }}>Order Progress</h3>
        <div style={{ display: 'flex', gap: 0, alignItems: 'stretch' }}>
          {STEPS.map((step, i) => {
            const done    = i < stepIdx;
            const active  = i === stepIdx;
            return (
              <div key={step.key} style={{ flex: 1, position: 'relative' }}>
                {/* Connector line left half */}
                {i > 0 && (
                  <div style={{
                    position: 'absolute', top: 20, left: 0, width: '50%', height: 3,
                    background: done || active ? 'var(--c-primary)' : 'var(--c-gray-200)',
                    zIndex: 0,
                  }} />
                )}
                {/* Connector line right half */}
                {i < STEPS.length - 1 && (
                  <div style={{
                    position: 'absolute', top: 20, right: 0, width: '50%', height: 3,
                    background: done ? 'var(--c-primary)' : 'var(--c-gray-200)',
                    zIndex: 0,
                  }} />
                )}

                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '0 4px', position: 'relative', zIndex: 1,
                }}>
                  <motion.div
                    animate={{ scale: active ? [1, 1.12, 1] : 1 }}
                    transition={{ duration: 0.4, repeat: active ? Infinity : 0, repeatDelay: 1.5 }}
                    style={{
                      width: 42, height: 42, borderRadius: '50%',
                      background: done || active ? 'var(--c-primary)' : 'var(--c-gray-100)',
                      border: `3px solid ${done || active ? 'var(--c-primary)' : 'var(--c-gray-200)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, flexShrink: 0,
                      boxShadow: active ? '0 0 0 4px var(--c-primary-light)' : 'none',
                    }}
                  >
                    {done ? (
                      <CheckCircle size={20} color="white" fill="white" strokeWidth={2.5} />
                    ) : active ? (
                      <step.Icon size={18} color="white" strokeWidth={2} />
                    ) : (
                      <step.Icon size={18} color="var(--c-gray-400)" strokeWidth={1.8} />
                    )}
                  </motion.div>

                  <p style={{
                    fontSize: 11, fontWeight: active || done ? 700 : 500, marginTop: 8,
                    color: active || done ? 'var(--c-gray-900)' : 'var(--c-gray-400)',
                    textAlign: 'center', lineHeight: 1.3,
                  }}>
                    {step.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Current status description */}
        <div style={{
          marginTop: 16, padding: '10px 14px', background: 'var(--c-primary-light)',
          borderRadius: 10, borderLeft: '3px solid var(--c-primary)',
        }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--c-primary)' }}>
            {STEPS[stepIdx]?.desc}
          </p>
        </div>
      </div>

      {/* ── Restaurant info ── */}
      {order.restaurant?.name && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 0', borderTop: '1.5px solid var(--c-gray-100)', marginBottom: 14,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 10, overflow: 'hidden', flexShrink: 0,
            background: 'var(--c-gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {order.restaurant.image_url ? (
              <img
                src={order.restaurant.image_url}
                alt={order.restaurant.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => { e.target.style.display = 'none'; }}
              />
            ) : (
              <Utensils size={22} color="var(--c-gray-400)" />
            )}
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: 'var(--c-gray-900)' }}>
              {order.restaurant.name}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--c-gray-400)' }}>Restaurant</p>
          </div>
        </div>
      )}

      {/* ── Items list ── */}
      {order.items && order.items.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-gray-700)', marginBottom: 10 }}>Items</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {order.items.map((item, idx) => (
              <div
                key={item.id ?? idx}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: 12, background: 'var(--c-gray-50)', borderRadius: 10,
                  border: '1.5px solid var(--c-gray-100)',
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 8, overflow: 'hidden', flexShrink: 0,
                  background: 'var(--c-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {item.image && item.image.startsWith('http') ? (
                    <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={e => { e.target.style.display = 'none'; }} />
                  ) : (
                    <Utensils size={18} color="var(--c-primary)" />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: 'var(--c-gray-900)' }}>{item.name}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--c-gray-400)' }}>Qty: {item.quantity}</p>
                </div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: 'var(--c-gray-800)' }}>
                  ৳{(item.price * item.quantity).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Order Summary totals ── */}
      <div style={{ borderTop: '1.5px solid var(--c-gray-100)', paddingTop: 14 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-gray-700)', marginBottom: 10 }}>Order Summary</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { label: `Sub Total (${order.items?.length ?? 0} items)`, value: `৳${order.subtotal?.toFixed(2) ?? '0.00'}` },
            { label: 'Delivery', value: order.deliveryFee === 0 ? 'Free' : `৳${order.deliveryFee?.toFixed(2) ?? '0.00'}` },
            ...(order.discountAmount > 0 ? [{ label: 'Discount', value: `-৳${order.discountAmount?.toFixed(2)}`, green: true }] : []),
            ...(order.tip > 0 ? [{ label: "Rider's Tip", value: `৳${order.tip?.toFixed(2)}` }] : []),
          ].map(({ label, value, green }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--c-gray-500)' }}>{label}</span>
              <span style={{ fontWeight: 600, color: green ? '#10b981' : 'var(--c-gray-800)' }}>{value}</span>
            </div>
          ))}
          <div style={{
            display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800,
            marginTop: 8, paddingTop: 10, borderTop: '2px solid var(--c-gray-100)',
          }}>
            <span style={{ color: 'var(--c-gray-900)' }}>Total Amount</span>
            <span style={{ color: 'var(--c-primary)' }}>৳{order.total?.toFixed(2) ?? '0.00'}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
const OrderStatus = ({
  isLoggedIn, user, cartItems = [],
  onLoginClick, onSignUpClick, onLogout, onLogoClick,
  onProfileClick, onOrdersClick, onNearMeClick,
  onDeliveryClick, onPickupClick,
  onFavouritesClick,
  currentAddress, onAddressChange,
  onCartClick,
}) => {
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      if (!isLoggedIn) {
        // Not logged in — nothing to show
        setOrders([]);
        setLoading(false);
        return;
      }

      try {
        // 1. Fetch the summary list of all customer orders
        const summaryList = await fetchOrdersFromBackend();

        if (!summaryList || summaryList.length === 0) {
          setOrders([]);
          setLoading(false);
          return;
        }

        // 2. Fetch full detail for each order (to get items + charges)
        //    Run in parallel for speed
        const detailResults = await Promise.all(
          summaryList.map((o) => fetchOrderDetail(o.order_id))
        );

        // 3. Map to display shape
        const mapped = summaryList.map((summary, i) =>
          mapBackendOrder(summary, detailResults[i])
        );

        setOrders(mapped);
      } catch (e) {
        console.error('Failed to load orders:', e);
        setError('Could not load your orders. Please try again.');
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isLoggedIn]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-gray-50)' }}>
      <Header
        isLoggedIn={isLoggedIn} user={user} cartItems={cartItems}
        onLoginClick={onLoginClick} onSignUpClick={onSignUpClick}
        onCartClick={onCartClick} onLogout={onLogout}
        onLogoClick={onLogoClick} onProfileClick={onProfileClick}
        onOrdersClick={onOrdersClick} showBanner={false}
        activeTab="orders"
        onNearMeClick={onNearMeClick}
        onDeliveryClick={onDeliveryClick}
        onPickupClick={onPickupClick}
        onFavouritesClick={onFavouritesClick}
        currentAddress={currentAddress}
        onAddressChange={onAddressChange}
      />

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 16px' }}>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 24 }}
        >
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--c-gray-900)', margin: '0 0 4px' }}>My Orders</h1>
          <p style={{ fontSize: 14, color: 'var(--c-gray-400)', margin: 0 }}>Track the status of your recent orders</p>
        </motion.div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center',
                        padding: '60px 0', gap: 12, color: 'var(--c-gray-400)' }}>
            <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 15 }}>Loading your orders…</span>
          </div>

        ) : error ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: 'var(--c-white)', borderRadius: 16, padding: '40px 20px',
              textAlign: 'center', border: '1.5px solid #fca5a5',
            }}
          >
            <p style={{ fontSize: 15, color: '#ef4444', fontWeight: 600, margin: 0 }}>{error}</p>
          </motion.div>

        ) : !isLoggedIn ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: 'var(--c-white)', borderRadius: 16, padding: '60px 20px',
              textAlign: 'center', border: '1.5px solid var(--c-gray-100)',
            }}
          >
            <ClipboardList size={56} color="var(--c-gray-300)" strokeWidth={1.5} style={{ marginBottom: 12 }} />
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--c-gray-700)', margin: '0 0 8px' }}>Please log in</h2>
            <p style={{ fontSize: 14, color: 'var(--c-gray-400)', margin: 0 }}>
              Log in to see your order history.
            </p>
          </motion.div>

        ) : orders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: 'var(--c-white)', borderRadius: 16, padding: '60px 20px',
              textAlign: 'center', border: '1.5px solid var(--c-gray-100)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <ClipboardList size={56} color="var(--c-gray-300)" strokeWidth={1.5} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--c-gray-700)', margin: '0 0 8px' }}>No orders yet</h2>
            <p style={{ fontSize: 14, color: 'var(--c-gray-400)', margin: 0 }}>
              Your order history will appear here after you place an order.
            </p>
          </motion.div>

        ) : (
          orders.map(order => <OrderCard key={order.orderId} order={order} />)
        )}
      </div>
    </div>
  );
};

export default OrderStatus;
