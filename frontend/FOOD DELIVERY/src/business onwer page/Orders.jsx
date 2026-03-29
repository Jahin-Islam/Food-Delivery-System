import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, CheckCircle, Clock, ShoppingBag,
  RefreshCw, WifiOff, Loader2, User, Phone,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { COLORS } from '../constants.js';
import BusinessHeader from './BusinessHeader.jsx';
import authService from '../Authservice.js';
import './Orders.css';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const API_BASE        = 'http://127.0.0.1:8000/api/v1/restaurants';
const POLL_INTERVAL   = 20_000; // re-fetch every 20 seconds

// Backend statuses the restaurant can see in this view
const STATUS_PENDING   = 'PENDING';
const STATUS_PREPARING = 'PREPARING';

// ─── API HELPERS ──────────────────────────────────────────────────────────────
// authService.authenticatedFetch returns PARSED JSON directly (not a Response).
// It automatically throws on non-2xx, so no .ok / .json() calls are needed.

async function fetchOrders(statusFilter) {
  const qs   = statusFilter ? `?status=${statusFilter}` : '';
  const url  = `${API_BASE}/orders/${qs}`;
  const data = await authService.authenticatedFetch(url);
  return Array.isArray(data) ? data : [];
}

async function patchOrderStatus(orderId, newStatus) {
  const url = `${API_BASE}/orders/${orderId}/`;
  return authService.authenticatedFetch(url, {
    method: 'PATCH',
    body:   JSON.stringify({ status: newStatus }),
  });
}

// ─── UTILITIES ────────────────────────────────────────────────────────────────
const fmt = n => `৳${Number(n || 0).toFixed(2)}`;

function timeAgo(createdAt) {
  if (!createdAt) return '—';
  const diffMs   = Date.now() - new Date(createdAt).getTime();
  const diffMins = Math.max(0, Math.floor(diffMs / 60_000));
  if (diffMins < 1)  return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
  const hrs = Math.floor(diffMins / 60);
  return `${hrs} hr${hrs !== 1 ? 's' : ''} ago`;
}

// Normalise a raw backend order into the shape the UI needs
function normalise(order) {
  const customerName =
    [order.first_name, order.last_name].filter(Boolean).join(' ') || 'Customer';

  // items from backend: { item_name, quantity, price_at_purchase, item_image }
  const items = (order.items ?? []).map(i => ({
    name:     i.item_name  ?? i.name ?? 'Item',
    quantity: i.quantity,
    price:    parseFloat(i.price_at_purchase ?? i.price ?? 0),
    image:    i.item_image ?? null,
  }));

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);

  return {
    orderId:      order.order_id,
    displayId:    `#${order.order_id}`,
    status:       order.status,
    customerName,
    phone:        order.phone_number ?? '',
    items,
    subtotal,
    deliveryFee:  parseFloat(order.delivery_charge  ?? 0),
    serviceFee:   parseFloat(order.service_charge   ?? 0),
    discountAmt:  parseFloat(order.discount_amount  ?? 0),
    tip:          parseFloat(order.rider_tip        ?? 0),
    total:        parseFloat(order.total_amount     ?? 0),
    createdAt:    order.created_at,
    riderName:    [order.rider_first_name, order.rider_last_name].filter(Boolean).join(' ') || null,
  };
}

// ─── ORDER CARD ───────────────────────────────────────────────────────────────
const OrderCard = ({ order, type, onAccept, onDeny, onMarkReady, actionLoading }) => {
  const busy = actionLoading === order.orderId;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -28, scale: 0.97 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className={`order-card ${type === 'new' ? 'new-order' : 'accepted-order'}`}
    >
      {/* ── Header ── */}
      <div className="order-header">
        <div className="order-header-left">
          <div className="customer-avatar">
            {order.customerName.charAt(0).toUpperCase()}
          </div>
          <div className="order-basic-info">
            <h3 className="order-number">{order.displayId}</h3>
            <p className="order-id" style={{ fontSize: 11, color: '#9ca3af' }}>
              {order.orderId}
            </p>
          </div>
        </div>
        <div className="order-time">
          <Clock size={12} style={{ marginRight: 4 }} />
          {timeAgo(order.createdAt)}
        </div>
      </div>

      {/* ── Details ── */}
      <div className="order-details">
        <div className="order-meta-pill">
          <span className="meta-label"><User size={11} style={{ marginRight: 3 }} />Customer</span>
          <span className="meta-value">{order.customerName}</span>
        </div>

        {order.phone && (
          <div className="order-meta-pill">
            <span className="meta-label"><Phone size={11} style={{ marginRight: 3 }} />Phone</span>
            <span className="meta-value">{order.phone}</span>
          </div>
        )}

        {type === 'accepted' && order.riderName && (
          <div className="order-meta-pill rider">
            <span className="meta-label">Rider</span>
            <span className="meta-value rider-status">{order.riderName} · on the way</span>
          </div>
        )}

        {/* Items list */}
        <div className="order-items-list">
          {order.items.map((item, i) => (
            <div key={i} className="order-item">
              <span className="item-quantity">{item.quantity}×</span>
              <span className="item-name">{item.name}</span>
              <span className="item-price">{fmt(item.price)}</span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="order-totals">
          <div className="total-row">
            <span>Subtotal</span><span>{fmt(order.subtotal)}</span>
          </div>
          {order.deliveryFee > 0 && (
            <div className="total-row">
              <span>Delivery Fee</span><span>{fmt(order.deliveryFee)}</span>
            </div>
          )}
          {order.serviceFee > 0 && (
            <div className="total-row">
              <span>Service Fee</span><span>{fmt(order.serviceFee)}</span>
            </div>
          )}
          {order.discountAmt > 0 && (
            <div className="total-row" style={{ color: '#10b981' }}>
              <span>Discount</span><span>−{fmt(order.discountAmt)}</span>
            </div>
          )}
          {order.tip > 0 && (
            <div className="total-row">
              <span>Rider Tip</span><span>{fmt(order.tip)}</span>
            </div>
          )}
          <div className="total-row total-final">
            <span>Total</span><span>{fmt(order.total)}</span>
          </div>
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="order-actions">
        {type === 'new' && (
          <>
            <button
              className="order-action-btn deny-btn"
              onClick={() => onDeny(order)}
              disabled={busy}
            >
              Deny
            </button>
            <button
              className="order-action-btn accept-btn"
              onClick={() => onAccept(order)}
              disabled={busy}
            >
              {busy
                ? <Loader2 size={14} className="spin" style={{ marginRight: 5 }} />
                : <CheckCircle size={14} style={{ marginRight: 5 }} />
              }
              Accept Order
            </button>
          </>
        )}

      </div>
    </motion.div>
  );
};

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────
const EmptyState = ({ icon: Icon, iconColor = COLORS.primary, text }) => (
  <div className="empty-state">
    <Icon size={52} color={iconColor} strokeWidth={1} opacity={0.3} />
    <p className="empty-text">{text}</p>
  </div>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const Orders = ({
  user,
  restaurant,
  onLogout,
  onNavigateToMenu,
  onNavigateToHistory,
  onNavigateToProfile,
}) => {

  // Split into two lists by status
  const [pendingOrders,   setPendingOrders]   = useState([]);
  const [preparingOrders, setPreparingOrders] = useState([]);

  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [actionLoading, setActionLoading] = useState(null); // orderId being acted on
  const [denyTarget,    setDenyTarget]    = useState(null);
  const [lastRefresh,   setLastRefresh]   = useState(null);

  const pollRef = useRef(null);

  // ── Fetch & split orders ──────────────────────────────────────────────────
  const loadOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      // Fetch PENDING and PREPARING in parallel
      const [pendingRaw, preparingRaw] = await Promise.all([
        fetchOrders(STATUS_PENDING),
        fetchOrders(STATUS_PREPARING),
      ]);
      setPendingOrders(pendingRaw.map(normalise));
      setPreparingOrders(preparingRaw.map(normalise));
      setLastRefresh(new Date());
    } catch (e) {
      console.error('loadOrders error:', e);
      if (!silent) setError(e.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Background poll every 20 seconds
  useEffect(() => {
    pollRef.current = setInterval(() => loadOrders(true), POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [loadOrders]);

  // ── Accept (PENDING → PREPARING) ─────────────────────────────────────────
  const handleAccept = async (order) => {
    setActionLoading(order.orderId);
    try {
      await patchOrderStatus(order.orderId, STATUS_PREPARING);
      // Optimistic update
      setPendingOrders(p => p.filter(o => o.orderId !== order.orderId));
      setPreparingOrders(p => [{ ...order, status: STATUS_PREPARING }, ...p]);
      toast.success(`Order ${order.displayId} accepted!`);
    } catch (e) {
      toast.error(e.message);
      loadOrders(true); // re-sync from server
    } finally {
      setActionLoading(null);
    }
  };

  // ── Open deny confirmation ────────────────────────────────────────────────
  const handleDenyOpen = (order) => setDenyTarget(order);

  // ── Confirm deny (PENDING → CANCELLED) ───────────────────────────────────
  const handleDenyConfirm = async () => {
    if (!denyTarget) return;
    const order = denyTarget;
    setDenyTarget(null);
    setActionLoading(order.orderId);
    try {
      await patchOrderStatus(order.orderId, 'CANCELLED');
      setPendingOrders(p => p.filter(o => o.orderId !== order.orderId));
      toast(`Order ${order.displayId} denied`, { icon: '❌' });
    } catch (e) {
      toast.error(e.message);
      loadOrders(true);
    } finally {
      setActionLoading(null);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="orders-page">
      <Toaster
        position="top-center"
        toastOptions={{
          style:   { borderRadius: 10, fontFamily: 'var(--font)', fontSize: 14 },
          success: { iconTheme: { primary: COLORS.primary, secondary: '#fff' } },
        }}
      />

      <BusinessHeader
        activePage="orders"
        user={user}
        restaurant={restaurant}
        onLogout={onLogout}
        onNavigateToMenu={onNavigateToMenu}
        onNavigateToOrders={() => loadOrders()}
        onNavigateToHistory={onNavigateToHistory}
        onNavigateToProfile={onNavigateToProfile}
        newOrderCount={pendingOrders.length}
      />

      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '14px 24px 0', justifyContent: 'flex-end',
      }}>
        {lastRefresh && (
          <span style={{ fontSize: 12, color: '#9ca3af' }}>
            Last updated {timeAgo(lastRefresh)}
          </span>
        )}
        <button
          onClick={() => loadOrders()}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: '1px solid #e5e7eb',
            borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
            fontSize: 13, color: '#374151',
          }}
        >
          <RefreshCw size={13} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
          Refresh
        </button>
      </div>

      {/* ── Error banner ── */}
      {error && !loading && (
        <div style={{
          margin: '16px 24px 0', padding: '12px 16px',
          background: '#fef2f2', border: '1px solid #fca5a5',
          borderRadius: 10, color: '#dc2626', fontSize: 13,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <WifiOff size={15} />
          {error}
          <button
            onClick={() => loadOrders()}
            style={{
              marginLeft: 'auto', background: 'none', border: 'none',
              color: '#dc2626', cursor: 'pointer', fontWeight: 600, fontSize: 13,
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Main columns ── */}
      <div className="orders-content">

        {/* New / Pending */}
        <div className="orders-section">
          <div className="orders-section-header">
            <h2 className="orders-section-title">New</h2>
            <span className="orders-count-badge">{pendingOrders.length}</span>
          </div>

          <div className="orders-list">
            {loading ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                color: '#9ca3af', padding: '32px 0', justifyContent: 'center',
              }}>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                Loading orders…
              </div>
            ) : (
              <AnimatePresence>
                {pendingOrders.length > 0
                  ? pendingOrders.map(o => (
                      <OrderCard
                        key={o.orderId}
                        order={o}
                        type="new"
                        onAccept={handleAccept}
                        onDeny={handleDenyOpen}
                        actionLoading={actionLoading}
                      />
                    ))
                  : <EmptyState icon={ShoppingBag} text="No new orders" />
                }
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Accepted / Preparing */}
        <div className="orders-section">
          <div className="orders-section-header">
            <h2 className="orders-section-title">Accepted</h2>
            <span className="orders-count-badge accepted">{preparingOrders.length}</span>
          </div>

          <div className="orders-list">
            {loading ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                color: '#9ca3af', padding: '32px 0', justifyContent: 'center',
              }}>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                Loading orders…
              </div>
            ) : (
              <AnimatePresence>
                {preparingOrders.length > 0
                  ? preparingOrders.map(o => (
                      <OrderCard
                        key={o.orderId}
                        order={o}
                        type="accepted"
                        actionLoading={actionLoading}
                      />
                    ))
                  : <EmptyState icon={CheckCircle} iconColor="#10b981" text="No accepted orders" />
                }
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>

      {/* ── Deny confirmation modal ── */}
      <AnimatePresence>
        {denyTarget && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setDenyTarget(null)}
          >
            <motion.div
              className="deny-modal"
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0,  scale: 1    }}
              exit={{    opacity: 0, y: 16, scale: 0.97 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              onClick={e => e.stopPropagation()}
            >
              <div className="deny-modal-content">
                <AlertTriangle
                  size={50}
                  color="#f59e0b"
                  style={{ display: 'block', margin: '0 auto 16px' }}
                />
                <h3 className="deny-title">Deny Order?</h3>
                <p className="deny-message">
                  Are you sure you want to deny order{' '}
                  <strong>{denyTarget?.displayId}</strong>?
                  This cannot be undone.
                </p>
                <div className="deny-modal-actions">
                  <button
                    className="deny-cancel-btn"
                    onClick={() => setDenyTarget(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className="deny-confirm-btn"
                    onClick={handleDenyConfirm}
                  >
                    Deny Order
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Orders;