import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronLeft, Utensils, MapPin, Phone, Clock, ClipboardList, ChefHat, Bike, PackageCheck } from 'lucide-react';
import Header from './Header.jsx';

const LS_KEY = 'fp_current_orders'; // stores array of orders

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

const getStepIndex = (status) => STATUS_ORDER.indexOf(status ?? 'PENDING');

// ─── Single order card ────────────────────────────────────────────────────────
const OrderCard = ({ order }) => {
  const [status, setStatus] = useState(order.status || 'PENDING');
  const stepIdx = getStepIndex(status);

  // Persist status changes
  const advanceStatus = () => {
    const next = STATUS_ORDER[Math.min(stepIdx + 1, STATUS_ORDER.length - 1)];
    if (next === status) return;
    setStatus(next);
    try {
      const orders = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
      const updated = orders.map(o => o.orderId === order.orderId ? { ...o, status: next } : o);
      localStorage.setItem(LS_KEY, JSON.stringify(updated));
    } catch {}
  };

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
      {/* Order ID */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--c-gray-900)', margin: '0 0 4px' }}>
            Order ID: <span style={{ color: 'var(--c-primary)' }}>#{order.orderId}</span>
          </h2>
          <p style={{ fontSize: 13, color: 'var(--c-gray-400)', margin: 0 }}>
            {order.createdAt ? new Date(order.createdAt).toLocaleString() : ''}
          </p>
        </div>
        {/* Simulate advance button — remove in production */}
        {status !== 'DELIVERED' && (
          <button
            onClick={advanceStatus}
            style={{
              fontSize: 11, background: 'var(--c-primary-light)', color: 'var(--c-primary)',
              border: '1.5px solid var(--c-primary)', borderRadius: 8, padding: '5px 10px',
              cursor: 'pointer', fontWeight: 700, fontFamily: 'var(--font)',
            }}
          >
            Simulate next step →
          </button>
        )}
      </div>

      {/* ── Progress Steps ── */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-gray-700)', marginBottom: 14 }}>Order Progress</h3>
        <div style={{ display: 'flex', gap: 0, alignItems: 'stretch' }}>
          {STEPS.map((step, i) => {
            const done    = i < stepIdx;
            const active  = i === stepIdx;
            const pending = i > stepIdx;
            return (
              <div key={step.key} style={{ flex: 1, position: 'relative' }}>
                {/* Connector line */}
                {i > 0 && (
                  <div style={{
                    position: 'absolute', top: 20, left: 0, width: '50%', height: 3,
                    background: done || active ? (done ? '#10b981' : 'var(--c-primary)') : 'var(--c-gray-200)',
                    zIndex: 0,
                  }} />
                )}
                {i < STEPS.length - 1 && (
                  <div style={{
                    position: 'absolute', top: 20, right: 0, width: '50%', height: 3,
                    background: done ? '#10b981' : 'var(--c-gray-200)',
                    zIndex: 0,
                  }} />
                )}

                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '0 4px', position: 'relative', zIndex: 1,
                }}>
                  {/* Circle */}
                  <motion.div
                    animate={{ scale: active ? [1, 1.12, 1] : 1 }}
                    transition={{ duration: 0.4, repeat: active ? Infinity : 0, repeatDelay: 1.5 }}
                    style={{
                      width: 42, height: 42, borderRadius: '50%',
                      background: done ? '#10b981' : active ? 'var(--c-primary)' : 'var(--c-gray-100)',
                      border: `3px solid ${done ? '#10b981' : active ? 'var(--c-primary)' : 'var(--c-gray-200)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, flexShrink: 0,
                      boxShadow: active ? '0 0 0 4px var(--c-primary-light)' : done ? '0 0 0 4px #d1fae5' : 'none',
                    }}
                  >
                    {done ? (
                      <Check size={20} color="white" strokeWidth={3} />
                    ) : active ? (
                      <step.Icon size={18} color="white" strokeWidth={2} />
                    ) : (
                      <step.Icon size={18} color="var(--c-gray-400)" strokeWidth={1.8} />
                    )}
                  </motion.div>

                  {/* Label */}
                  <p style={{
                    fontSize: 11, fontWeight: active || done ? 700 : 500, marginTop: 8,
                    color: active ? 'var(--c-gray-900)' : done ? 'var(--c-gray-500)' : 'var(--c-gray-400)',
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
      {order.restaurant && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 0', borderTop: '1.5px solid var(--c-gray-100)', marginBottom: 14,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 10, overflow: 'hidden', flexShrink: 0,
            background: 'var(--c-gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {order.restaurant.image_url ? (
              <img src={order.restaurant.image_url} alt={order.restaurant.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => { e.target.style.display = 'none'; }} />
            ) : (
              <Utensils size={22} color="var(--c-primary)" />
            )}
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: 'var(--c-gray-900)' }}>{order.restaurant.name}</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--c-gray-400)' }}>Your order from</p>
          </div>
        </div>
      )}

      {/* ── Order Items ── */}
      {order.items && order.items.length > 0 && (
        <div style={{ borderTop: '1.5px solid var(--c-gray-100)', paddingTop: 14, marginBottom: 14 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-gray-700)', marginBottom: 12 }}>Order Items</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {order.items.map((item, idx) => (
              <div key={idx} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: 12, background: 'var(--c-gray-50)', borderRadius: 10,
                border: '1.5px solid var(--c-gray-100)',
              }}>
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
                  ৳{item.price * item.quantity}
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
            { label: `Sub Total (${order.items?.length ?? 0} items)`, value: `৳${order.subtotal ?? 0}` },
            { label: 'Delivery', value: order.deliveryFee === 0 ? 'Free' : `৳${order.deliveryFee ?? 0}` },
            ...(order.discountAmount > 0 ? [{ label: 'Discount', value: `-৳${order.discountAmount}`, green: true }] : []),
            ...(order.tip > 0 ? [{ label: "Rider's Tip", value: `৳${order.tip}` }] : []),
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
            <span style={{ color: 'var(--c-primary)' }}>৳{order.total ?? 0}</span>
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
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
      // Most recent first
      setOrders(stored.slice().reverse());
    } catch { setOrders([]); }
  }, []);

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

        {orders.length === 0 ? (
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
            <p style={{ fontSize: 14, color: 'var(--c-gray-400)', margin: 0 }}>Your order history will appear here after you place an order.</p>
          </motion.div>
        ) : (
          orders.map(order => <OrderCard key={order.orderId} order={order} />)
        )}
      </div>
    </div>
  );
};

export { LS_KEY };
export default OrderStatus;