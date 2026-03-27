import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle, Clock, ShoppingBag, Package } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { COLORS } from '../constants.js';
import BusinessHeader from './BusinessHeader.jsx';
import './Orders.css';

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const INITIAL_NEW = [
  {
    id: '#3279', orderId: 'q0a2-1f64', customerName: 'Mrs Zaidi Haleem',
    items: [{ name: 'Chicken Haleem', quantity: 1, price: 410 }],
    subtotal: 410, vat: 0, deliveryFee: 0, serviceFee: 0, total: 410, timeElapsed: '7 mins',
  },
  {
    id: '#3280', orderId: 'a1b2-3c4d', customerName: 'Ahmed Khan',
    items: [
      { name: 'Chicken Cashewnut Salad', quantity: 2, price: 387 },
      { name: 'Coleslaw', quantity: 1, price: 135 },
    ],
    subtotal: 909, vat: 0, deliveryFee: 50, serviceFee: 10, total: 969, timeElapsed: '3 mins',
  },
];

const INITIAL_ACCEPTED = [
  {
    id: '#3278', orderId: 'x9y8-7z6w', customerName: 'Murtaza Akbar',
    riderName: 'Muhammad', riderStatus: 'is nearby',
    items: [{ name: 'Pan Polao with Gochujang Chicken', quantity: 1, price: 594 }],
    subtotal: 594, vat: 0, deliveryFee: 60, serviceFee: 12, total: 666, timeElapsed: '12 mins',
  },
];

const fmt = n => `৳${Number(n).toFixed(2)}`;

// ─── ORDER CARD ───────────────────────────────────────────────────────────────
const OrderCard = ({ order, type, onAccept, onDeny, onMarkReady }) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, x: -28, scale: 0.97 }}
    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
    className={`order-card ${type === 'new' ? 'new-order' : 'accepted-order'}`}
  >
    <div className="order-header">
      <div className="order-header-left">
        <div className="customer-avatar">{order.customerName.charAt(0)}</div>
        <div className="order-basic-info">
          <h3 className="order-number">{order.id}</h3>
          <p className="order-id">{order.orderId}</p>
        </div>
      </div>
      <div className="order-time">
        <Clock size={12} style={{ marginRight: 4 }} />{order.timeElapsed}
      </div>
    </div>

    <div className="order-details">
      <div className="order-meta-pill">
        <span className="meta-label">Customer</span>
        <span className="meta-value">{order.customerName}</span>
      </div>

      {type === 'accepted' && order.riderName && (
        <div className="order-meta-pill rider">
          <span className="meta-label">Rider</span>
          <span className="meta-value rider-status">{order.riderName} {order.riderStatus}</span>
        </div>
      )}

      <div className="order-items-list">
        {order.items.map((item, i) => (
          <div key={i} className="order-item">
            <span className="item-quantity">{item.quantity}×</span>
            <span className="item-name">{item.name}</span>
            <span className="item-price">{fmt(item.price)}</span>
          </div>
        ))}
      </div>

      <div className="order-totals">
        <div className="total-row"><span>Subtotal</span><span>{fmt(order.subtotal)}</span></div>
        {order.vat > 0       && <div className="total-row"><span>VAT</span><span>{fmt(order.vat)}</span></div>}
        {order.deliveryFee > 0 && <div className="total-row"><span>Delivery Fee</span><span>{fmt(order.deliveryFee)}</span></div>}
        {order.serviceFee > 0  && <div className="total-row"><span>Service Fee</span><span>{fmt(order.serviceFee)}</span></div>}
        <div className="total-row total-final"><span>Total</span><span>{fmt(order.total)}</span></div>
      </div>
    </div>

    <div className="order-actions">
      {type === 'new' && (
        <>
          <button className="order-action-btn deny-btn"   onClick={() => onDeny(order)}>Deny</button>
          <button className="order-action-btn accept-btn" onClick={() => onAccept(order)}>
            <CheckCircle size={14} style={{ marginRight: 5 }} />Accept Order
          </button>
        </>
      )}
      {type === 'accepted' && (
        <button className="order-action-btn mark-ready-btn" onClick={() => onMarkReady(order)}>
          <Package size={14} style={{ marginRight: 5 }} />Mark as Ready
        </button>
      )}
    </div>
  </motion.div>
);

// ─── MAIN ─────────────────────────────────────────────────────────────────────
// FIX #3: All navigation props renamed to match what BusinessHeader expects
const Orders = ({
  isLoggedIn, user, restaurant, onLogout,
  // FIX #3: accept both naming conventions (App passes onNavigateToHistory)
  onNavigateToMenu,
  onNavigateToHistory,
  onNavigateToProfile,
}) => {
  const [newOrders,      setNewOrders]      = useState(INITIAL_NEW);
  const [acceptedOrders, setAcceptedOrders] = useState(INITIAL_ACCEPTED);
  const [denyTarget,     setDenyTarget]     = useState(null);

  const handleAccept = order => {
    setNewOrders(p => p.filter(o => o.id !== order.id));
    setAcceptedOrders(p => [{ ...order, riderName: 'Muhammad', riderStatus: 'on the way' }, ...p]);
    toast.success(`Order ${order.id} accepted!`);
  };

  const handleDenyConfirm = () => {
    if (!denyTarget) return;
    setNewOrders(p => p.filter(o => o.id !== denyTarget.id));
    toast(`Order ${denyTarget.id} denied`, { icon: '❌' });
    setDenyTarget(null);
  };

  const handleMarkReady = order => {
    setAcceptedOrders(p => p.filter(o => o.id !== order.id));
    toast.success(`Order ${order.id} ready! Moved to history.`);
  };

  return (
    <div className="orders-page">
      <Toaster position="top-center" toastOptions={{
        style: { borderRadius: 10, fontFamily: 'var(--font)', fontSize: 14 },
        success: { iconTheme: { primary: COLORS.primary, secondary: '#fff' } },
      }} />

      {/* FIX #3: All nav props passed to BusinessHeader */}
      <BusinessHeader
        activePage="orders"
        user={user}
        restaurant={restaurant}
        onLogout={onLogout}
        onNavigateToMenu={onNavigateToMenu}
        onNavigateToOrders={() => {/* already here */}}
        onNavigateToHistory={onNavigateToHistory}
        onNavigateToProfile={onNavigateToProfile}
        newOrderCount={newOrders.length}
      />

      <div className="orders-content">
        {/* New Orders */}
        <div className="orders-section">
          <div className="orders-section-header">
            <h2 className="orders-section-title">New</h2>
            <span className="orders-count-badge">{newOrders.length}</span>
          </div>
          <div className="orders-list">
            <AnimatePresence>
              {newOrders.length > 0
                ? newOrders.map(o => (
                    <OrderCard
                      key={o.id} order={o} type="new"
                      onAccept={handleAccept}
                      onDeny={setDenyTarget}
                    />
                  ))
                : (
                  <div className="empty-state">
                    <ShoppingBag size={52} color={COLORS.primary} strokeWidth={1} opacity={0.3} />
                    <p className="empty-text">No new orders</p>
                  </div>
                )
              }
            </AnimatePresence>
          </div>
        </div>

        {/* Accepted Orders */}
        <div className="orders-section">
          <div className="orders-section-header">
            <h2 className="orders-section-title">Accepted</h2>
            <span className="orders-count-badge accepted">{acceptedOrders.length}</span>
          </div>
          <div className="orders-list">
            <AnimatePresence>
              {acceptedOrders.length > 0
                ? acceptedOrders.map(o => (
                    <OrderCard
                      key={o.id} order={o} type="accepted"
                      onMarkReady={handleMarkReady}
                    />
                  ))
                : (
                  <div className="empty-state">
                    <CheckCircle size={52} color="#10b981" strokeWidth={1} opacity={0.3} />
                    <p className="empty-text">No accepted orders</p>
                  </div>
                )
              }
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Deny modal */}
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
                <AlertTriangle size={50} color="#f59e0b" style={{ display: 'block', margin: '0 auto 16px' }} />
                <h3 className="deny-title">Deny Order?</h3>
                <p className="deny-message">
                  Are you sure you want to deny order <strong>{denyTarget?.id}</strong>? This cannot be undone.
                </p>
                <div className="deny-modal-actions">
                  <button className="deny-cancel-btn"  onClick={() => setDenyTarget(null)}>Cancel</button>
                  <button className="deny-confirm-btn" onClick={handleDenyConfirm}>Deny Order</button>
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