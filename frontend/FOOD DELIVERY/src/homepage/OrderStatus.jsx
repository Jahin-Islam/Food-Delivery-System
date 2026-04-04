import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle, Utensils,
  Clock, ClipboardList, ChefHat, Bike, PackageCheck, Loader2,
  Star, X, Edit2, XCircle,
} from 'lucide-react';
import Header from './Header.jsx';
import authService from '../Authservice.js';

export const LS_KEY = 'fp_current_orders';

const BASE_URL = 'http://127.0.0.1:8000';

const STEPS = [
  { key: 'PENDING',   label: 'Order Confirmation', desc: 'Waiting for the restaurant to accept', Icon: ClipboardList },
  { key: 'PREPARING', label: 'Preparing',           desc: 'Restaurant is preparing your food',   Icon: ChefHat },
  { key: 'PICKED_UP', label: 'Shipping',            desc: 'Rider has picked up your order',      Icon: Bike },
  { key: 'DELIVERED', label: 'Completed',           desc: 'Your order has been delivered!',       Icon: PackageCheck },
];

const STATUS_ORDER = ['PENDING', 'PREPARING', 'PICKED_UP', 'DELIVERED'];
const getStepIndex = (status) => {
  const idx = STATUS_ORDER.indexOf(status ?? 'PENDING');
  return idx === -1 ? 0 : idx;
};

// ─── Auth-aware fetch helper ──────────────────────────────────────────────────
async function authFetch(path, options = {}) {
  let token = authService.getAccessToken();
  if (!token) return null;

  const attempt = (t) =>
    fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${t}`,
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
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

  return res;
}

async function fetchOrdersFromBackend() {
  try {
    const res = await authFetch('/api/customers/me/orders/');
    if (!res || !res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch { return null; }
}

async function fetchOrderDetail(orderId) {
  try {
    const res = await authFetch(`/api/customers/me/orders/${orderId}/`);
    if (!res || !res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function fetchReview(orderId) {
  try {
    const res = await authFetch(`/api/reviews/orders/${orderId}/`);
    if (!res) return null;
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function submitReview(orderId, rating, comment, isEdit) {
  const method = isEdit ? 'PUT' : 'POST';
  const res = await authFetch(`/api/reviews/orders/${orderId}/`, {
    method,
    body: JSON.stringify({ rating, comment }),
  });
  if (!res) throw new Error('Network error');
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail ?? 'Failed to submit review');
  return data;
}

function mapBackendOrder(backendOrder, detailData) {
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
    // FIX: preserve CANCELLED status — don't normalise it away
    status:         backendOrder.status ?? 'PENDING',
    restaurant: {
      name:      backendOrder.restaurant_name ?? detailData?.restaurant_name ?? '',
      image_url: backendOrder.restaurant_image ?? '',
    },
    items,
    subtotal:       parseFloat(subtotal),
    deliveryFee:    parseFloat(detailData?.delivery_charge ?? 0),
    discountAmount: parseFloat(detailData?.discount_amount ?? 0),
    tip:            parseFloat(detailData?.rider_tip ?? 0),
    total:          parseFloat(backendOrder.total_amount ?? 0),
  };
}

const StarRating = ({ value, onChange, readonly = false, size = 28 }) => {
  const [hovered, setHovered] = useState(0);
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= (readonly ? value : (hovered || value));
        return (
          <Star
            key={n}
            size={size}
            fill={filled ? '#f59e0b' : 'none'}
            color={filled ? '#f59e0b' : '#d1d5db'}
            style={{ cursor: readonly ? 'default' : 'pointer', transition: 'transform 0.1s' }}
            onMouseEnter={() => !readonly && setHovered(n)}
            onMouseLeave={() => !readonly && setHovered(0)}
            onClick={() => !readonly && onChange && onChange(n)}
          />
        );
      })}
    </div>
  );
};

// ─── Review Modal ─────────────────────────────────────────────────────────────
const ReviewModal = ({ order, existingReview, onClose, onSaved }) => {
  const [rating,  setRating]  = useState(existingReview?.rating  ?? 0);
  const [comment, setComment] = useState(existingReview?.comment ?? '');
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState(null);
  const isEdit = Boolean(existingReview);

  const handleSubmit = async () => {
    if (!rating)        { setError('Please select a star rating.'); return; }
    if (!comment.trim()) { setError('Please write a comment.');      return; }
    setSaving(true);
    setError(null);
    try {
      const saved = await submitReview(order.orderId, rating, comment.trim(), isEdit);
      onSaved(saved);
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}
      >
        <motion.div
          initial={{ scale: 0.93, opacity: 0, y: 20 }}
          animate={{ scale: 1,    opacity: 1, y: 0  }}
          exit={{ scale: 0.93, opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'var(--c-white)', borderRadius: 20,
            padding: '28px 28px 24px', width: '100%', maxWidth: 460,
            boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--c-gray-900)' }}>
                {isEdit ? 'Edit Your Review' : 'Rate Your Order'}
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--c-gray-400)' }}>
                {order.restaurant?.name} · Order #{order.orderId}
              </p>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 8, color: 'var(--c-gray-400)' }}>
              <X size={22} />
            </button>
          </div>

          <div style={{ marginBottom: 20 }}>
            <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600, color: 'var(--c-gray-700)' }}>How would you rate this order?</p>
            <StarRating value={rating} onChange={setRating} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--c-gray-700)', marginBottom: 8 }}>Your feedback</label>
            <textarea
              value={comment} onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us about your experience…" rows={4}
              style={{
                width: '100%', boxSizing: 'border-box', padding: '10px 12px', fontSize: 14,
                border: '1.5px solid var(--c-gray-200)', borderRadius: 10, resize: 'vertical',
                fontFamily: 'inherit', color: 'var(--c-gray-900)', outline: 'none', background: 'var(--c-gray-50)',
              }}
            />
          </div>

          {error && <p style={{ margin: '0 0 14px', fontSize: 13, color: '#ef4444', fontWeight: 500 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} disabled={saving} style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: '1.5px solid var(--c-gray-200)', background: 'var(--c-white)', fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', color: 'var(--c-gray-700)' }}>
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={saving} style={{ flex: 2, padding: '11px 0', borderRadius: 10, border: 'none', background: saving ? 'var(--c-gray-200)' : 'var(--c-primary)', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', color: saving ? 'var(--c-gray-400)' : 'var(--c-white)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {saving ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : isEdit ? 'Update Review' : 'Submit Review'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ─── FIX: Cancelled Order Banner ──────────────────────────────────────────────
// Shows a clear red "Order Cancelled" UI instead of a frozen progress bar.
const CancelledBanner = ({ order }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    style={{
      background: 'var(--c-white)', borderRadius: 16,
      boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
      padding: 24, marginBottom: 20,
      border: '2px solid #fca5a5',  // red border for cancelled
    }}
  >
    {/* Order ID row */}
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--c-gray-900)', margin: '0 0 4px' }}>
        Order ID: <span style={{ color: '#ef4444' }}>#{order.orderId}</span>
      </h2>
      <p style={{ fontSize: 13, color: 'var(--c-gray-400)', margin: 0 }}>
        {order.createdAt ? new Date(order.createdAt).toLocaleString() : ''}
      </p>
    </div>

    {/* Big cancelled indicator */}
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '28px 20px', background: '#fef2f2', borderRadius: 12,
      border: '1.5px solid #fca5a5', marginBottom: 20,
    }}>
      <motion.div
        initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.15 }}
        style={{
          width: 64, height: 64, borderRadius: '50%',
          background: '#fee2e2', border: '3px solid #ef4444',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 12,
        }}
      >
        <XCircle size={36} color="#ef4444" />
      </motion.div>
      <h3 style={{ fontSize: 20, fontWeight: 800, color: '#dc2626', margin: '0 0 6px' }}>
        Order Cancelled
      </h3>
      <p style={{ fontSize: 14, color: '#ef4444', margin: 0, textAlign: 'center', opacity: 0.8 }}>
        This order was cancelled by the restaurant.
        {/* If you have a refund system, add: "Your refund will be processed within 3–5 business days." */}
      </p>
    </div>

    {/* Progress bar — frozen at step 1, all steps greyed out to show nothing happened */}
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-gray-700)', marginBottom: 14 }}>Order Progress</h3>
      <div style={{ display: 'flex', gap: 0, alignItems: 'stretch' }}>
        {STEPS.map((step, i) => {
          const { Icon } = step;
          // Only the first step (PENDING) is "done" (order was placed), rest are greyed
          const reached = i === 0;
          return (
            <div key={step.key} style={{ flex: 1, position: 'relative' }}>
              {i > 0 && (
                <div style={{
                  position: 'absolute', top: 20, left: 0, width: '50%', height: 3,
                  background: '#fca5a5', zIndex: 0,
                }} />
              )}
              {i < STEPS.length - 1 && (
                <div style={{
                  position: 'absolute', top: 20, right: 0, width: '50%', height: 3,
                  background: '#fca5a5', zIndex: 0,
                }} />
              )}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 4px', position: 'relative', zIndex: 1 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: '50%',
                  background: '#fee2e2',
                  border: `3px solid #ef4444`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  opacity: i === 0 ? 1 : 0.35,
                }}>
                  <X size={20} color="#ef4444" strokeWidth={2.5} />
                </div>
                <p style={{ margin: '6px 0 2px', fontSize: 11, fontWeight: 700, textAlign: 'center', color: '#ef4444', opacity: i === 0 ? 1 : 0.4 }}>
                  {step.label}
                </p>
                <p style={{ margin: 0, fontSize: 10, textAlign: 'center', color: '#ef4444', lineHeight: 1.3, opacity: i === 0 ? 0.8 : 0.3 }}>
                  {i === 0 ? 'Cancelled' : 'Not reached'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>

    {/* Items still shown so customer knows what was ordered */}
    {order.items?.length > 0 && (
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-gray-500)', marginBottom: 10 }}>Items (not fulfilled)</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {order.items.map((item, idx) => (
            <div key={item.id ?? idx} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: 12, background: 'var(--c-gray-50)', borderRadius: 10,
              border: '1.5px solid var(--c-gray-100)', opacity: 0.7,
            }}>
              <div style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'var(--c-gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Utensils size={18} color="var(--c-gray-400)" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: 'var(--c-gray-600)', textDecoration: 'line-through' }}>{item.name}</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--c-gray-400)' }}>Qty: {item.quantity}</p>
              </div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: 'var(--c-gray-400)', textDecoration: 'line-through' }}>
                ৳{(item.price * item.quantity).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* FIX: NO review button for cancelled orders — only show for DELIVERED */}
    <div style={{
      padding: '12px 16px', background: '#fef2f2', borderRadius: 10,
      border: '1.5px solid #fca5a5', fontSize: 13, color: '#dc2626', fontWeight: 500,
    }}>
      Reviews are only available for delivered orders.
    </div>
  </motion.div>
);

// ─── Single order card ────────────────────────────────────────────────────────
const OrderCard = ({ order }) => {
  // FIX: render cancelled orders with dedicated UI — not a broken progress bar
  if (order.status === 'CANCELLED') {
    return <CancelledBanner order={order} />;
  }

  const stepIdx    = getStepIndex(order.status);
  const isDelivered = order.status === 'DELIVERED';

  const [review,       setReview]       = useState(null);
  const [reviewLoaded, setReviewLoaded] = useState(false);
  const [showModal,    setShowModal]    = useState(false);

  useEffect(() => {
    if (!isDelivered || reviewLoaded) return;
    fetchReview(order.orderId).then((r) => {
      setReview(r);
      setReviewLoaded(true);
    });
  }, [isDelivered, order.orderId, reviewLoaded]);

  const handleReviewSaved = useCallback((saved) => setReview(saved), []);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
        style={{
          background: 'var(--c-white)', borderRadius: 16,
          boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
          padding: 24, marginBottom: 20,
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

        {/* Progress Steps */}
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-gray-700)', marginBottom: 14 }}>Order Progress</h3>
          <div style={{ display: 'flex', gap: 0, alignItems: 'stretch' }}>
            {STEPS.map((step, i) => {
              const done   = i < stepIdx;
              const active = i === stepIdx;
              const { Icon } = step;
              return (
                <div key={step.key} style={{ flex: 1, position: 'relative' }}>
                  {i > 0 && (
                    <div style={{ position: 'absolute', top: 20, left: 0, width: '50%', height: 3, background: done || active ? 'var(--c-primary)' : 'var(--c-gray-200)', zIndex: 0 }} />
                  )}
                  {i < STEPS.length - 1 && (
                    <div style={{ position: 'absolute', top: 20, right: 0, width: '50%', height: 3, background: done ? 'var(--c-primary)' : 'var(--c-gray-200)', zIndex: 0 }} />
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 4px', position: 'relative', zIndex: 1 }}>
                    <motion.div
                      animate={{ scale: active ? [1, 1.12, 1] : 1 }}
                      transition={{ duration: 0.4, repeat: active ? Infinity : 0, repeatDelay: 1.5 }}
                      style={{
                        width: 42, height: 42, borderRadius: '50%',
                        background: done || active ? 'var(--c-primary)' : 'var(--c-gray-100)',
                        border: `3px solid ${done || active ? 'var(--c-primary)' : 'var(--c-gray-200)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
                        boxShadow: active ? '0 0 0 4px var(--c-primary-light)' : 'none',
                      }}
                    >
                      {done ? <CheckCircle size={22} color="#fff" /> : <Icon size={20} color={active ? '#fff' : 'var(--c-gray-400)'} />}
                    </motion.div>
                    <p style={{ margin: '6px 0 2px', fontSize: 11, fontWeight: 700, textAlign: 'center', color: done || active ? 'var(--c-primary)' : 'var(--c-gray-400)' }}>
                      {step.label}
                    </p>
                    <p style={{ margin: 0, fontSize: 10, textAlign: 'center', color: 'var(--c-gray-400)', lineHeight: 1.3 }}>
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Items */}
        {order.items?.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-gray-700)', marginBottom: 10 }}>Items Ordered</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {order.items.map((item, idx) => (
                <div key={item.id ?? idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, background: 'var(--c-gray-50)', borderRadius: 10, border: '1.5px solid var(--c-gray-100)' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'var(--c-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {item.image && item.image.startsWith('http') ? (
                      <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
                    ) : (
                      <Utensils size={18} color="var(--c-primary)" />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: 'var(--c-gray-900)' }}>{item.name}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--c-gray-400)' }}>Qty: {item.quantity}</p>
                  </div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: 'var(--c-gray-800)' }}>৳{(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Order Summary */}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800, marginTop: 8, paddingTop: 10, borderTop: '2px solid var(--c-gray-100)' }}>
              <span style={{ color: 'var(--c-gray-900)' }}>Total Amount</span>
              <span style={{ color: 'var(--c-primary)' }}>৳{order.total?.toFixed(2) ?? '0.00'}</span>
            </div>
          </div>
        </div>

        {/* FIX: Review section — only for DELIVERED, NOT for cancelled */}
        {isDelivered && (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1.5px solid var(--c-gray-100)' }}>
            {review ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--c-gray-700)' }}>Your Review</h3>
                  <button onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: '1.5px solid var(--c-primary)', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--c-primary)' }}>
                    <Edit2 size={13} /> Edit
                  </button>
                </div>
                <div style={{ background: 'var(--c-gray-50)', borderRadius: 10, padding: '12px 14px', border: '1.5px solid var(--c-gray-100)' }}>
                  <StarRating value={Number(review.rating)} readonly size={20} />
                  <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--c-gray-700)', lineHeight: 1.5 }}>{review.comment}</p>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowModal(true)}
                style={{
                  width: '100%', padding: '13px 0', borderRadius: 12,
                  border: '2px dashed var(--c-primary)', background: 'var(--c-primary-light)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  fontSize: 14, fontWeight: 700, color: 'var(--c-primary)', transition: 'background 0.15s',
                }}
              >
                <Star size={18} fill="var(--c-primary)" color="var(--c-primary)" />
                Leave a Review
              </button>
            )}
          </div>
        )}
      </motion.div>

      {showModal && (
        <ReviewModal
          order={order}
          existingReview={review}
          onClose={() => setShowModal(false)}
          onSaved={handleReviewSaved}
        />
      )}
    </>
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

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);

    if (!isLoggedIn) { setOrders([]); if (!silent) setLoading(false); return; }

    try {
      const summaryList = await fetchOrdersFromBackend();
      if (!summaryList || summaryList.length === 0) { setOrders([]); if (!silent) setLoading(false); return; }

      const detailResults = await Promise.all(
        summaryList.map((o) => fetchOrderDetail(o.order_id))
      );

      const mapped = summaryList.map((summary, i) =>
        mapBackendOrder(summary, detailResults[i])
      );

      // Sort: active orders first, then cancelled, then delivered
      const ORDER_PRIORITY = { PENDING: 0, PREPARING: 1, PICKED_UP: 2, DELIVERED: 3, CANCELLED: 4 };
      mapped.sort((a, b) => (ORDER_PRIORITY[a.status] ?? 99) - (ORDER_PRIORITY[b.status] ?? 99));

      setOrders(mapped);
    } catch (e) {
      console.error('Failed to load orders:', e);
      if (!silent) setError('Could not load your orders. Please try again.');
      if (!silent) setOrders([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [isLoggedIn]);

  // Initial load
  useEffect(() => { load(); }, [load]);

  // Poll every 10s while there are active (non-terminal) orders
  useEffect(() => {
    const hasActive = orders.some(o => o.status === 'PENDING' || o.status === 'PREPARING' || o.status === 'PICKED_UP');
    if (!hasActive || !isLoggedIn) return;
    const id = setInterval(() => load(true), 10_000);
    return () => clearInterval(id);
  }, [orders, isLoggedIn, load]);

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
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--c-gray-900)', margin: '0 0 4px' }}>My Orders</h1>
          <p style={{ fontSize: 14, color: 'var(--c-gray-400)', margin: 0 }}>Track the status of your recent orders</p>
        </motion.div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px 0', gap: 12, color: 'var(--c-gray-400)' }}>
            <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 15 }}>Loading your orders…</span>
          </div>
        ) : error ? (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ background: 'var(--c-white)', borderRadius: 16, padding: '40px 20px', textAlign: 'center', border: '1.5px solid #fca5a5' }}>
            <p style={{ fontSize: 15, color: '#ef4444', fontWeight: 600, margin: 0 }}>{error}</p>
          </motion.div>
        ) : !isLoggedIn ? (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ background: 'var(--c-white)', borderRadius: 16, padding: '60px 20px', textAlign: 'center', border: '1.5px solid var(--c-gray-100)' }}>
            <ClipboardList size={56} color="var(--c-gray-300)" strokeWidth={1.5} style={{ marginBottom: 12 }} />
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--c-gray-700)', margin: '0 0 8px' }}>Please log in</h2>
            <p style={{ fontSize: 14, color: 'var(--c-gray-400)', margin: 0 }}>Log in to see your order history.</p>
          </motion.div>
        ) : orders.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ background: 'var(--c-white)', borderRadius: 16, padding: '60px 20px', textAlign: 'center', border: '1.5px solid var(--c-gray-100)' }}>
            <ClipboardList size={56} color="var(--c-gray-300)" strokeWidth={1.5} style={{ marginBottom: 12 }} />
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--c-gray-700)', margin: '0 0 8px' }}>No orders yet</h2>
            <p style={{ fontSize: 14, color: 'var(--c-gray-400)', margin: 0 }}>Your order history will appear here after you place an order.</p>
          </motion.div>
        ) : (
          orders.map(order => <OrderCard key={order.orderId} order={order} />)
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default OrderStatus;