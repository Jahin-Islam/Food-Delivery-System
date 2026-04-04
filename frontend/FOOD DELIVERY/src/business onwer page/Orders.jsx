import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, CheckCircle, Clock, ShoppingBag,
  RefreshCw, WifiOff, Loader2, User, Phone, ChefHat,
  Sparkles, Timer, TrendingUp, Zap,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { COLORS } from '../constants.js';
import BusinessHeader from './BusinessHeader.jsx';
import authService from '../Authservice.js';
import './Orders.css';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const API_BASE      = 'http://127.0.0.1:8000/api/v1/restaurants';
const POLL_INTERVAL = 10_000;

const STATUS_PENDING   = 'PENDING';
const STATUS_PREPARING = 'PREPARING';

async function fetchOrders(statusFilter) {
  const qs   = statusFilter ? `?status=${statusFilter}` : '';
  const url  = `${API_BASE}/orders/${qs}`;
  const data = await authService.authenticatedFetch(url);
  return Array.isArray(data) ? data : [];
}

async function patchOrderStatus(orderId, newStatus) {
  return authService.authenticatedFetch(`${API_BASE}/orders/${orderId}/`, {
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
  if (diffMins < 60) return `${diffMins}m ago`;
  const hrs = Math.floor(diffMins / 60);
  return `${hrs}h ago`;
}

function normalise(order) {
  const customerName =
    [order.first_name, order.last_name].filter(Boolean).join(' ') || 'Customer';

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
const OrderCard = ({ order, type, onAccept, onDeny, actionLoading }) => {
  const busy = actionLoading === order.orderId;
  const initials = order.customerName
    .split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -32, scale: 0.95 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={`oc-card ${type === 'new' ? 'oc-card--new' : 'oc-card--preparing'}`}
    >
      {/* Glow accent */}
      <div className={`oc-card-glow ${type === 'new' ? 'oc-glow--new' : 'oc-glow--prep'}`} />

      {/* ── Header ── */}
      <div className="oc-header">
        <div className="oc-header-left">
          <div className={`oc-avatar ${type === 'new' ? 'oc-avatar--new' : 'oc-avatar--prep'}`}>
            {initials}
          </div>
          <div className="oc-title-block">
            <div className="oc-order-id">{order.displayId}</div>
            <div className="oc-customer-name">{order.customerName}</div>
          </div>
        </div>
        <div className={`oc-time-pill ${type === 'new' ? 'oc-time--new' : 'oc-time--prep'}`}>
          <Timer size={11} />
          {timeAgo(order.createdAt)}
        </div>
      </div>

      {/* ── Meta pills ── */}
      <div className="oc-meta">
        {order.phone && (
          <div className="oc-meta-pill">
            <Phone size={12} className="oc-meta-icon" />
            <span>{order.phone}</span>
          </div>
        )}
        {type === 'preparing' && order.riderName && (
          <div className="oc-meta-pill oc-meta-pill--rider">
            <Zap size={12} className="oc-meta-icon" />
            <span>{order.riderName} · on the way</span>
          </div>
        )}
      </div>

      {/* ── Items ── */}
      <div className="oc-items">
        <div className="oc-items-label">
          <ShoppingBag size={12} />
          <span>{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="oc-items-list">
          {order.items.map((item, i) => (
            <div key={i} className="oc-item-row">
              <span className="oc-item-qty">{item.quantity}×</span>
              <span className="oc-item-name">{item.name}</span>
              <span className="oc-item-price">{fmt(item.price)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Totals ── */}
      <div className="oc-totals">
        {order.deliveryFee > 0 && (
          <div className="oc-total-row">
            <span>Delivery</span><span>{fmt(order.deliveryFee)}</span>
          </div>
        )}
        {order.discountAmt > 0 && (
          <div className="oc-total-row oc-total-row--green">
            <span>Discount</span><span>−{fmt(order.discountAmt)}</span>
          </div>
        )}
        <div className="oc-total-final">
          <span>Total</span>
          <span className="oc-total-amount">{fmt(order.total)}</span>
        </div>
      </div>

      {/* ── Actions ── */}
      {type === 'new' && (
        <div className="oc-actions">
          <button
            className="oc-btn oc-btn--deny"
            onClick={() => onDeny(order)}
            disabled={busy}
          >
            Decline
          </button>
          <button
            className="oc-btn oc-btn--accept"
            onClick={() => onAccept(order)}
            disabled={busy}
          >
            {busy
              ? <Loader2 size={15} className="oc-spin" />
              : <CheckCircle size={15} />
            }
            Accept
          </button>
        </div>
      )}

      {type === 'preparing' && (
        <div className="oc-preparing-badge">
          <ChefHat size={14} />
          Preparing now
        </div>
      )}
    </motion.div>
  );
};

// ─── COLUMN HEADER ────────────────────────────────────────────────────────────
const ColumnHeader = ({ title, count, type, icon: Icon, iconColor }) => (
  <div className={`oc-col-header oc-col-header--${type}`}>
    <div className="oc-col-header-left">
      <div className={`oc-col-icon oc-col-icon--${type}`}>
        <Icon size={16} />
      </div>
      <div>
        <div className="oc-col-title">{title}</div>
        <div className="oc-col-sub">{count} order{count !== 1 ? 's' : ''}</div>
      </div>
    </div>
    <div className={`oc-col-count oc-col-count--${type}`}>{count}</div>
  </div>
);

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────
const EmptyState = ({ icon: Icon, text, sub, iconColor }) => (
  <div className="oc-empty">
    <div className="oc-empty-icon" style={{ color: iconColor }}>
      <Icon size={40} strokeWidth={1} />
    </div>
    <p className="oc-empty-title">{text}</p>
    {sub && <p className="oc-empty-sub">{sub}</p>}
  </div>
);

// ─── LOADING SKELETON ─────────────────────────────────────────────────────────
const LoadingSkeleton = () => (
  <div className="oc-skeleton-wrap">
    {[1, 2].map(i => (
      <div key={i} className="oc-skeleton-card">
        <div className="oc-sk oc-sk-header" />
        <div className="oc-sk oc-sk-line" />
        <div className="oc-sk oc-sk-line oc-sk-short" />
        <div className="oc-sk oc-sk-items" />
        <div className="oc-sk oc-sk-actions" />
      </div>
    ))}
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
  isDark = false,
  onToggleTheme,
}) => {
  const [pendingOrders,   setPendingOrders]   = useState([]);
  const [preparingOrders, setPreparingOrders] = useState([]);

  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [denyTarget,    setDenyTarget]    = useState(null);
  const [lastRefresh,   setLastRefresh]   = useState(null);

  const pollRef = useRef(null);

  // ── Fetch orders ─────────────────────────────────────────────────────────
  const loadOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
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

  useEffect(() => { loadOrders(); }, [loadOrders]);

  useEffect(() => {
    pollRef.current = setInterval(() => loadOrders(true), POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [loadOrders]);

  // ── Accept ────────────────────────────────────────────────────────────────
  const handleAccept = async (order) => {
    setActionLoading(order.orderId);
    try {
      await patchOrderStatus(order.orderId, STATUS_PREPARING);
      setPendingOrders(p => p.filter(o => o.orderId !== order.orderId));
      setPreparingOrders(p => [{ ...order, status: STATUS_PREPARING }, ...p]);
      toast.success(`Order ${order.displayId} accepted!`);
    } catch (e) {
      toast.error(e.message);
      loadOrders(true);
    } finally {
      setActionLoading(null);
    }
  };

  // ── Deny ──────────────────────────────────────────────────────────────────
  const handleDenyOpen    = (order) => setDenyTarget(order);

  const handleDenyConfirm = async () => {
    if (!denyTarget) return;
    const order = denyTarget;
    setDenyTarget(null);
    setActionLoading(order.orderId);
    try {
      await patchOrderStatus(order.orderId, 'CANCELLED');
      setPendingOrders(p => p.filter(o => o.orderId !== order.orderId));
      toast(`Order ${order.displayId} declined`, { icon: '🚫' });
    } catch (e) {
      toast.error(e.message);
      loadOrders(true);
    } finally {
      setActionLoading(null);
    }
  };

  const totalActive = pendingOrders.length + preparingOrders.length;

  return (
    <div className="orders-page">
      <Toaster
        position="top-center"
        toastOptions={{
          style:   { borderRadius: 12, fontFamily: 'var(--font)', fontSize: 14, fontWeight: 600 },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
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
        isDark={isDark}
        onToggleTheme={onToggleTheme}
      />

      {/* ── Page Hero Bar ── */}
      <div className="oc-page-hero">
        <div className="oc-page-hero-inner">
          <div className="oc-page-hero-left">
            <div className="oc-page-title-wrap">
              <div className="oc-page-icon">
                <ShoppingBag size={22} />
              </div>
              <div>
                <h1 className="oc-page-title">Live Orders</h1>
                <p className="oc-page-sub">
                  {totalActive > 0
                    ? `${totalActive} active order${totalActive !== 1 ? 's' : ''} right now`
                    : 'All quiet — no active orders'}
                </p>
              </div>
            </div>
          </div>

          <div className="oc-page-hero-right">
            {/* Quick stats */}
            <div className="oc-hero-stats">
              <div className="oc-hero-stat">
                <div className="oc-hero-stat-val oc-hstat--new">{pendingOrders.length}</div>
                <div className="oc-hero-stat-label">Awaiting</div>
              </div>
              <div className="oc-hero-stat-divider" />
              <div className="oc-hero-stat">
                <div className="oc-hero-stat-val oc-hstat--prep">{preparingOrders.length}</div>
                <div className="oc-hero-stat-label">Preparing</div>
              </div>
            </div>

            {/* Refresh */}
            <button
              className="oc-refresh-btn"
              onClick={() => loadOrders()}
              disabled={loading}
              title="Refresh orders"
            >
              <RefreshCw size={14} className={loading ? 'oc-spin' : ''} />
              {lastRefresh && (
                <span className="oc-refresh-time">
                  {timeAgo(lastRefresh)}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Error banner */}
        {error && !loading && (
          <div className="oc-error-bar">
            <WifiOff size={15} />
            <span>{error}</span>
            <button className="oc-error-retry" onClick={() => loadOrders()}>Retry</button>
          </div>
        )}
      </div>

      {/* ── Columns ── */}
      <div className="oc-columns">

        {/* ── NEW ORDERS ── */}
        <div className="oc-column oc-column--new">
          <ColumnHeader
            title="New Orders"
            count={pendingOrders.length}
            type="new"
            icon={Sparkles}
          />

          <div className="oc-column-body">
            {loading ? (
              <LoadingSkeleton />
            ) : (
              <AnimatePresence mode="popLayout">
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
                  : (
                    <EmptyState
                      icon={ShoppingBag}
                      text="No new orders"
                      sub="New orders will appear here"
                      iconColor="var(--primary)"
                    />
                  )
                }
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* ── PREPARING ── */}
        <div className="oc-column oc-column--preparing">
          <ColumnHeader
            title="Preparing"
            count={preparingOrders.length}
            type="preparing"
            icon={ChefHat}
          />

          <div className="oc-column-body">
            {loading ? (
              <LoadingSkeleton />
            ) : (
              <AnimatePresence mode="popLayout">
                {preparingOrders.length > 0
                  ? preparingOrders.map(o => (
                      <OrderCard
                        key={o.orderId}
                        order={o}
                        type="preparing"
                        actionLoading={actionLoading}
                      />
                    ))
                  : (
                    <EmptyState
                      icon={ChefHat}
                      text="Nothing cooking yet"
                      sub="Accepted orders show up here"
                      iconColor="#10b981"
                    />
                  )
                }
              </AnimatePresence>
            )}
          </div>
        </div>

      </div>

      {/* ── Deny Confirmation Modal ── */}
      <AnimatePresence>
        {denyTarget && (
          <motion.div
            className="oc-modal-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setDenyTarget(null)}
          >
            <motion.div
              className="oc-deny-modal"
              initial={{ opacity: 0, y: 32, scale: 0.95 }}
              animate={{ opacity: 1, y: 0,  scale: 1    }}
              exit={{    opacity: 0, y: 16, scale: 0.96 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              onClick={e => e.stopPropagation()}
            >
              <div className="oc-deny-icon-wrap">
                <AlertTriangle size={32} color="#f59e0b" />
              </div>
              <h3 className="oc-deny-title">Decline Order?</h3>
              <p className="oc-deny-msg">
                Are you sure you want to decline order{' '}
                <strong>{denyTarget?.displayId}</strong>?{' '}
                This cannot be undone.
              </p>
              <div className="oc-deny-actions">
                <button className="oc-deny-cancel" onClick={() => setDenyTarget(null)}>
                  Cancel
                </button>
                <button className="oc-deny-confirm" onClick={handleDenyConfirm}>
                  Decline Order
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default Orders;