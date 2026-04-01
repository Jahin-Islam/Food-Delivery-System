import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle, Bike, MapPin, Clock, DollarSign, History,
  Wallet, User, Package, ChevronRight,
  ChevronLeft, LogOut, Calendar, Upload, AlertCircle, Check,
  Phone, Mail, Lock, CreditCard, FileText, Shield, Edit2,
  Utensils, Sun, Moon, HelpCircle, Navigation, RefreshCw,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { COLORS, BRAND } from '../constants.js';
import './Riderdashboard.css';
import './RiderDashboardExtra.css';
import RiderMap from './RiderMap.jsx';
import authService from '../Authservice.js';

// ─── STATUS HELPERS ───────────────────────────────────────────────────────────
/**
 * Maps the raw backend status string to the UI status string used by card
 * components.  The backend keeps the real status; we only translate for
 * display / routing.
 *
 *  PENDING   → 'ongoing'   (rider is heading to the restaurant)
 *  PREPARING → 'ongoing'   (restaurant is cooking; rider still heading there)
 *  PICKED_UP → 'picked_up' (rider has the food, en route to customer)
 *  DELIVERED → 'completed'
 */
function backendToUIStatus(backendStatus) {
  switch ((backendStatus || '').toUpperCase()) {
    case 'PENDING':
    case 'PREPARING': return 'ongoing';
    case 'PICKED_UP': return 'picked_up';
    case 'DELIVERED': return 'completed';
    default:          return 'ongoing';
  }
}

/**
 * Normalise a raw backend order object (from /me/orders/ or /nearby/) into
 * the shape expected by every UI card component.
 */
function normaliseOrder(raw) {
  return {
    id:            `#${raw.order_id}`,
    orderId:       String(raw.order_id),
    backendId:     raw.order_id,
    backendStatus: (raw.status || '').toUpperCase(),  // keep the real status
    status:        backendToUIStatus(raw.status),
    customer: {
      name:  `${raw.customer_first_name || ''} ${raw.customer_last_name || ''}`.trim() || 'Customer',
      phone: raw.customer_phone || '',
    },
    restaurant: {
      name:    raw.restaurant_name    || 'Restaurant',
      address: raw.restaurant_address || '',
      pickup:  '~5 mins',
      // FIX: include restaurant coords so RiderMap can pin the restaurant
      lat: raw.restaurant_lat  ?? null,
      lng: raw.restaurant_lng  ?? null,
    },
    delivery: {
      address: [raw.street_number, raw.apartment_number, raw.address_description]
                  .filter(Boolean).join(', ') || 'Delivery address',
      time: '~10 mins',
      lat: raw.delivery_lat  ?? null,
      lng: raw.delivery_lng  ?? null,
    },
    items:       (raw.items || []).map(i => ({ name: i.item_name, qty: i.quantity })),
    amount:      parseFloat(raw.total_amount || 0),
    payment:     'Online',
    timer:       90,
    distance_km: raw.distance_km ?? null,
  };
}

// ─── API HELPERS ──────────────────────────────────────────────────────────────

/**
 * FIX: Load the rider's own orders from the backend on mount.
 * This restores ongoing / picked-up orders after a page refresh.
 */
async function fetchMyOrders() {
  try {
    const data = await authService.authenticatedFetch(
      'http://127.0.0.1:8000/api/riders/me/orders/'
    );
    return data?.orders ?? [];
  } catch (e) { console.error('fetchMyOrders:', e); return []; }
}

async function fetchRiderStats() {
  try {
    return await authService.authenticatedFetch(
      'http://127.0.0.1:8000/api/riders/me/stats/'
    );
  } catch (e) { console.error('fetchRiderStats:', e); return null; }
}

async function fetchRiderHistory(days = 30) {
  try {
    return await authService.authenticatedFetch(
      `http://127.0.0.1:8000/api/riders/me/history/?days=${days}`
    );
  } catch (e) { console.error('fetchRiderHistory:', e); return null; }
}

async function fetchNearbyOrders() {
  try {
    const data = await authService.authenticatedFetch(
      'http://127.0.0.1:8000/api/riders/orders/nearby/?radius=50'
    );
    return data?.orders ?? [];
  } catch (e) { console.error('fetchNearbyOrders:', e); return []; }
}

async function acceptOrderApi(orderId) {
  return authService.authenticatedFetch(
    `http://127.0.0.1:8000/api/riders/orders/accept/${orderId}/`,
    { method: 'POST' }
  );
}

async function updateOrderStatusApi(orderId, newStatus) {
  return authService.authenticatedFetch(
    `http://127.0.0.1:8000/api/riders/orders/update-status/${orderId}/`,
    { method: 'PATCH', body: JSON.stringify({ status: newStatus }) }
  );
}

async function updateRiderLocation(lat, lng) {
  try {
    await authService.authenticatedFetch('http://127.0.0.1:8000/api/riders/location/', {
      method: 'PATCH',
      body: JSON.stringify({ current_latitude: lat, current_longitude: lng }),
    });
  } catch (e) { console.warn('Location update failed:', e); }
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const RiderDashboard = ({ rider = {}, onLogout }) => {
  const riderData = {
    name:    rider.first_name ? `${rider.first_name} ${rider.last_name || ''}`.trim() : rider.name || 'Rider',
    id:      rider.id      || 'RD-0000',
    vehicle: rider.vehicle || 'Motorbike',
    phone:   rider.phone_number || rider.phone || '',
    email:   rider.email   || '',
    city:    rider.city    || 'Dhaka',
  };

  const [activeTab,     setActiveTab]     = useState('status');
  const [isOnline,      setIsOnline]      = useState(false);
  const [isDark,        setIsDark]        = useState(() => localStorage.getItem('theme') === 'dark');
  const [showProfile,   setShowProfile]   = useState(false);

  const [nearbyOrders,  setNearbyOrders]  = useState([]);
  const [myOrders,      setMyOrders]      = useState([]);
  const [orderTab,      setOrderTab]      = useState('nearby');
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [walletBalance, setWalletBalance] = useState(0);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [ordersToday,   setOrdersToday]   = useState(0);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const pushLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => updateRiderLocation(coords.latitude, coords.longitude),
      () => {},
      { enableHighAccuracy: true }
    );
  }, []);

  // ── Load live stats from backend (header bar numbers) ────────────────────
  const loadStats = useCallback(async () => {
    const stats = await fetchRiderStats();
    if (stats) {
      setOrdersToday(stats.orders_today);
      setTodayEarnings(stats.today_earnings);
      setWalletBalance(stats.wallet_balance);
    }
  }, []);

  // ── FIX: Restore ongoing orders from backend on every mount / refresh ──────
  const loadMyOrders = useCallback(async () => {
    try {
      const raw        = await fetchMyOrders();
      const normalised = raw.map(normaliseOrder);
      setMyOrders(normalised);
    } catch (e) {
      console.error('loadMyOrders:', e);
    }
  }, []);

  // Run once on mount so a page refresh always restores in-progress orders + stats
  useEffect(() => { loadMyOrders(); loadStats(); }, [loadMyOrders, loadStats]);

  // ── Load nearby orders (only while online) ────────────────────────────────
  const loadNearbyOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const raw        = await fetchNearbyOrders();
      // Force UI status to 'new' for nearby cards (they haven't been accepted yet)
      const normalised = raw.map(o => ({ ...normaliseOrder(o), status: 'new' }));
      setNearbyOrders(normalised);
    } catch (e) {
      console.error('loadNearbyOrders error:', e);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  // Auto-refresh every 30 s while online
  useEffect(() => {
    if (!isOnline) return;
    loadNearbyOrders();
    const id = setInterval(loadNearbyOrders, 30000);
    return () => clearInterval(id);
  }, [isOnline, loadNearbyOrders]);

  const handleToggleOnline = () => {
    const next = !isOnline;
    setIsOnline(next);
    if (next) {
      pushLocation();
      toast.success('You are now online! Waiting for orders...');
      loadNearbyOrders();
    } else {
      toast('You are now offline', { icon: '🔴' });
    }
  };

  // Accept a nearby order
  const handleAcceptOrder = async (orderId, backendId) => {
    try {
      await acceptOrderApi(backendId);
      // Re-fetch myOrders from DB so we get the true backend status + coords
      await loadMyOrders();
      setNearbyOrders(prev => prev.filter(o => o.id !== orderId));
      setOrderTab('ongoing');
      toast.success('Order accepted! Head to the restaurant.');
    } catch (e) { toast.error(e.message || 'Failed to accept order'); }
  };

  const handlePickedUp = async (orderId, backendId) => {
    try {
      await updateOrderStatusApi(backendId, 'PICKED_UP');
      setMyOrders(prev =>
        prev.map(o =>
          o.id === orderId
            ? { ...o, status: 'picked_up', backendStatus: 'PICKED_UP' }
            : o
        )
      );
      toast.success('Order picked up! Delivering now.');
    } catch (e) { toast.error(e.message || 'Failed to update status'); }
  };

  const handleDelivered = async (orderId, backendId) => {
    try {
      await updateOrderStatusApi(backendId, 'DELIVERED');
      const order = myOrders.find(o => o.id === orderId);
      if (order) {
        setMyOrders(prev =>
          prev.map(o =>
            o.id === orderId
              ? { ...o, status: 'completed', backendStatus: 'DELIVERED', completedAt: new Date() }
              : o
          )
        );
        setOrderTab('completed');
        toast.success(`✅ Delivered! ৳${order.amount} earned`);
        // Refresh live stats from backend (earnings, orders today, wallet)
        loadStats();
      }
    } catch (e) { toast.error(e.message || 'Failed to update status'); }
  };

  const ongoingOrders   = myOrders.filter(o => o.status === 'ongoing' || o.status === 'picked_up');
  const completedOrders = myOrders.filter(o => o.status === 'completed');
  const activeOrder     = ongoingOrders[0] || null;

  const initials = riderData.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'RD';

  const TABS = [
    { id: 'status',     Icon: CheckCircle, label: 'Status'     },
    { id: 'deliveries', Icon: Bike,        label: 'Deliveries', badge: nearbyOrders.length + ongoingOrders.length },
    { id: 'history',    Icon: History,     label: 'History'    },
    { id: 'wallet',     Icon: Wallet,      label: 'Wallet'     },
    { id: 'profile',    Icon: User,        label: 'Profile'    },
  ];

  return (
    <div className="rdb-container">
      <Toaster position="top-center" toastOptions={{
        style: { borderRadius: '10px', fontFamily: 'Segoe UI,sans-serif', fontSize: '14px' },
        success: { iconTheme: { primary: COLORS.primary, secondary: '#fff' } },
      }} />

      {/* Profile dropdown */}
      <AnimatePresence>
        {showProfile && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 999 }} onClick={() => setShowProfile(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.97 }} transition={{ duration: 0.18 }}
              style={{ position: 'fixed', top: 72, right: 20, width: 280, zIndex: 1000,
                background: 'var(--white)', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
                border: '1.5px solid var(--gray-200)', overflow: 'hidden' }}
              onClick={e => e.stopPropagation()}>
              <div style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12, background: 'linear-gradient(135deg, var(--primary-light), #fed7aa)' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--gradient-primary)', color: 'white', fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{initials}</div>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--gray-900)', margin: 0 }}>{riderData.name}</p>
                  <p style={{ fontSize: 12, color: 'var(--gray-500)', margin: 0 }}>{riderData.email}</p>
                </div>
              </div>
              <div style={{ height: 1, background: 'var(--gray-200)' }} />
              <div style={{ padding: '8px 0' }}>
                {[
                  { Icon: User,       label: 'Profile',      action: () => { setActiveTab('profile'); setShowProfile(false); } },
                  { Icon: MapPin,     label: riderData.city,  noAction: true },
                  { Icon: HelpCircle, label: 'Help Center',   action: () => { window.open('https://www.foodpanda.com.bd/contents/help-center', '_blank'); setShowProfile(false); } },
                ].map(({ Icon, label, action, noAction }, i) => (
                  <button key={i} onClick={noAction ? undefined : action}
                    style={{ width: '100%', padding: '12px 16px', background: 'none', border: 'none',
                      display: 'flex', alignItems: 'center', gap: 12, cursor: noAction ? 'default' : 'pointer',
                      fontFamily: 'var(--font)', textAlign: 'left' }}
                    onMouseEnter={e => { if (!noAction) e.currentTarget.style.background = 'var(--gray-50)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}>
                    <Icon size={17} style={{ color: 'var(--gray-500)' }} />
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--gray-700)' }}>{label}</span>
                  </button>
                ))}
                <div style={{ height: 1, background: 'var(--gray-200)', margin: '4px 0' }} />
                <button onClick={() => { setShowProfile(false); onLogout?.(); }}
                  style={{ width: '100%', padding: '12px 16px', background: 'none', border: 'none',
                    display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', fontFamily: 'var(--font)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}>
                  <LogOut size={17} style={{ color: '#dc2626' }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#dc2626' }}>Logout</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="rdb-header">
        <div className="rdb-header-top">
          <div className="rdb-logo-section">
            <div className="rdb-logo-icon"><Bike size={18} color={COLORS.primary} strokeWidth={2.5} /></div>
            <span className="rdb-logo-main">panda</span>
            <span className="rdb-logo-sub">rider</span>
          </div>
          <div className="rdb-header-right">
            <div className="rdb-status-pill" style={{ background: isOnline ? 'rgba(16,185,129,0.15)' : 'rgba(0,0,0,0.05)' }}>
              <div className={`rdb-status-dot ${isOnline ? 'online' : ''}`} />
              <span className="rdb-status-text">{isOnline ? 'Online' : 'Offline'}</span>
            </div>
            <motion.button className="rdb-icon-btn" onClick={() => setIsDark(p => !p)} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}>
              <AnimatePresence mode="wait">
                {isDark
                  ? <motion.span key="sun"  initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }} style={{ display: 'flex' }}><Sun size={16} /></motion.span>
                  : <motion.span key="moon" initial={{ rotate:  90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate:-90, opacity: 0 }} transition={{ duration: 0.15 }} style={{ display: 'flex' }}><Moon size={16} /></motion.span>
                }
              </AnimatePresence>
            </motion.button>
            <button className="rdb-profile-btn" onClick={() => setShowProfile(true)}>
              <div className="rdb-header-avatar">{initials}</div>
              <div className="rdb-profile-btn-info">
                <span className="rdb-profile-btn-name">{riderData.name.split(' ')[0]}</span>
                <span className="rdb-profile-btn-role">Rider</span>
              </div>
              <ChevronRight size={13} style={{ color: 'var(--gray-400)' }} />
            </button>
          </div>
        </div>
        <nav className="rdb-nav-tabs">
          <div className="rdb-nav-tabs-inner">
            {TABS.map(({ id, Icon, label, badge }) => (
              <button key={id} className={`rdb-nav-tab ${activeTab === id ? 'active' : ''}`} onClick={() => setActiveTab(id)}>
                <Icon size={16} strokeWidth={activeTab === id ? 2.5 : 1.8} />
                <span>{label}</span>
                {badge > 0 && <span className="rdb-tab-badge">{badge}</span>}
              </button>
            ))}
          </div>
        </nav>
      </header>

      {/* Stats bar */}
      <div className="rdb-stats-bar">
        <div className="rdb-stat"><span className="rdb-stat-label">Today's Earnings</span><span className="rdb-stat-val" style={{ color: COLORS.success }}>৳{todayEarnings}</span></div>
        <div className="rdb-stat"><span className="rdb-stat-label">Orders Today</span><span className="rdb-stat-val" style={{ color: COLORS.primary }}>{ordersToday}</span></div>
        <div className="rdb-stat"><span className="rdb-stat-label">Status</span><span className="rdb-stat-val" style={{ color: isOnline ? '#10b981' : '#6b7280' }}>{isOnline ? '🟢 Online' : '🔴 Offline'}</span></div>
      </div>

      {/* Tab content */}
      <div className="rdb-content">
        <AnimatePresence mode="wait">
          {activeTab === 'status'     && <StatusTab     key="status"     isOnline={isOnline} ongoingOrders={ongoingOrders} onToggleOnline={handleToggleOnline} />}
          {activeTab === 'deliveries' && <DeliveriesTab key="deliveries"
            nearbyOrders={nearbyOrders} ongoingOrders={ongoingOrders} completedOrders={completedOrders}
            orderTab={orderTab} setOrderTab={setOrderTab}
            isOnline={isOnline} loadingOrders={loadingOrders}
            onAccept={handleAcceptOrder}
            onPickedUp={handlePickedUp} onDelivered={handleDelivered} onRefresh={loadNearbyOrders}
          />}
          {activeTab === 'history'  && <HistoryTab  key="history"  />}
          {activeTab === 'wallet'   && <WalletTab   key="wallet"   balance={walletBalance} onRefreshStats={loadStats} />}
          {activeTab === 'profile'  && <ProfileTab  key="profile"  rider={riderData} />}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ─── STATUS TAB ───────────────────────────────────────────────────────────────
const StatusTab = ({ isOnline, ongoingOrders, onToggleOnline }) => {
  const activeOrder = ongoingOrders[0] || null;
  return (
    <motion.div className="rdb-tab-pane"
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>

      {/*
        Pass the FULL ongoingOrders array so RiderMap can:
        - pin ALL restaurants and delivery addresses
        - draw route from rider's current location to the correct next waypoint
          for each order (restaurant if ongoing, customer if picked_up)
      */}
      <RiderMap orders={ongoingOrders} isOnline={isOnline} />

      <div style={{ background: 'var(--white)', borderRadius: 14, padding: '20px 22px',
        border: '1.5px solid var(--gray-200)', boxShadow: 'var(--shadow-sm)', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--gray-900)', marginBottom: 4 }}>
              {isOnline ? '🟢 You are Online' : '🔴 You are Offline'}
            </p>
            <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>
              {isOnline ? 'You are visible to customers and can receive orders.' : 'Toggle to go online and start receiving orders.'}
            </p>
          </div>
          <button onClick={onToggleOnline}
            style={{ padding: '10px 22px', borderRadius: 999, border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 14, fontFamily: 'var(--font)', color: 'white',
              background: isOnline ? 'linear-gradient(135deg,#dc2626,#b91c1c)' : 'linear-gradient(135deg,#10b981,#059669)',
              boxShadow: isOnline ? '0 4px 12px rgba(220,38,38,0.3)' : '0 4px 12px rgba(16,185,129,0.3)' }}>
            {isOnline ? 'Go Offline' : 'Go Online'}
          </button>
        </div>
      </div>

      {ongoingOrders.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {ongoingOrders.map(order => (
            <div key={order.id} style={{ background: 'var(--primary-bg)', borderRadius: 12,
              padding: '14px 16px', border: '1.5px solid var(--primary-light)' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', marginBottom: 6 }}>
                {order.status === 'picked_up' ? '🚴 Delivering' : '📦 Active Order'}
              </p>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-900)' }}>
                {order.id} — {order.customer?.name}
              </p>
              <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 3 }}>
                {order.status === 'picked_up'
                  ? `🏠 En route to ${order.delivery?.address || 'customer'}`
                  : order.backendStatus === 'PENDING'
                    ? '⏳ Waiting for restaurant to start preparing'
                    : '🍳 Restaurant is preparing — head to pick up'}
              </p>
            </div>
          ))}
        </div>
      ) : isOnline ? (
        <div style={{ textAlign: 'center', padding: '28px 20px', background: 'var(--gray-50)',
          borderRadius: 12, border: '1.5px dashed var(--gray-200)' }}>
          <Bike size={48} color={COLORS.primary} opacity={0.4} strokeWidth={1} style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--gray-600)' }}>Waiting for orders…</p>
          <p style={{ fontSize: 13, color: 'var(--gray-400)', marginTop: 6 }}>Check the Deliveries tab for orders near you.</p>
        </div>
      ) : null}
    </motion.div>
  );
};

// ─── DELIVERIES TAB ───────────────────────────────────────────────────────────
const DeliveriesTab = ({ nearbyOrders, ongoingOrders, completedOrders, orderTab, setOrderTab,
  isOnline, loadingOrders, onAccept, onPickedUp, onDelivered, onRefresh }) => {
  const tabs = [
    { id: 'nearby',    label: 'Nearby',    count: nearbyOrders.length   },
    { id: 'ongoing',   label: 'Ongoing',   count: ongoingOrders.length  },
    { id: 'completed', label: 'Completed', count: completedOrders.length },
  ];
  const current = orderTab === 'nearby' ? nearbyOrders : orderTab === 'ongoing' ? ongoingOrders : completedOrders;

  return (
    <motion.div className="rdb-tab-pane"
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div className="rdb-order-tabs" style={{ flex: 1 }}>
          {tabs.map(t => (
            <button key={t.id} className={`rdb-order-tab ${orderTab === t.id ? 'active' : ''}`} onClick={() => setOrderTab(t.id)}>
              {t.label}{t.count > 0 && <span className="rdb-order-tab-badge">{t.count}</span>}
            </button>
          ))}
        </div>
        {orderTab === 'nearby' && (
          <button onClick={onRefresh} disabled={loadingOrders}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px',
              background: 'var(--primary-bg)', border: '1.5px solid var(--primary-light)',
              borderRadius: 8, fontSize: 12, fontWeight: 600, color: 'var(--primary)',
              cursor: 'pointer', marginLeft: 8, fontFamily: 'var(--font)' }}>
            <RefreshCw size={13} style={{ animation: loadingOrders ? 'rdbSpin 0.8s linear infinite' : 'none' }} />
            Refresh
          </button>
        )}
      </div>

      {orderTab === 'nearby' && !isOnline && (
        <div style={{ background: '#fef3c7', border: '1.5px solid #f59e0b', borderRadius: 10,
          padding: '12px 16px', marginBottom: 12, fontSize: 13, fontWeight: 600, color: '#92400e',
          display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={16} />
          Go online in the Status tab to receive orders.
        </div>
      )}

      <div className="rdb-orders-list">
        {loadingOrders && orderTab === 'nearby' ? (
          <div className="rdb-empty">
            <div style={{ width: 36, height: 36, border: `3px solid var(--primary-light)`, borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'rdbSpin 0.8s linear infinite', marginBottom: 12 }} />
            <p>Finding nearby orders…</p>
          </div>
        ) : current.length === 0 ? (
          <div className="rdb-empty">
            <Bike size={56} color={COLORS.primary} opacity={0.3} strokeWidth={1} />
            <p>No {orderTab} orders</p>
            <span>{orderTab === 'nearby' ? (isOnline ? 'No orders within 50 km right now.' : 'Go online to see nearby orders.') : orderTab === 'ongoing' ? 'Accept an order to see it here' : 'Completed orders will appear here'}</span>
          </div>
        ) : (
          current.map(order =>
            order.status === 'new'       ? <NearbyOrderCard  key={order.id} order={order} onAccept={() => onAccept(order.id, order.backendId)} /> :
            order.status === 'ongoing'   ? <OngoingOrderCard key={order.id} order={order} onPickedUp={() => onPickedUp(order.id, order.backendId)} /> :
            order.status === 'picked_up' ? <PickedUpCard     key={order.id} order={order} onDelivered={() => onDelivered(order.id, order.backendId)} /> :
                                           <CompletedCard    key={order.id} order={order} />
          )
        )}
      </div>
      <style>{`@keyframes rdbSpin { to { transform: rotate(360deg); } }`}</style>
    </motion.div>
  );
};

// ─── ORDER CARDS ──────────────────────────────────────────────────────────────
const NearbyOrderCard = ({ order, onAccept }) => {
  const [timer, setTimer] = useState(order.timer || 90);
  useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer(p => p - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);
  const mm = String(Math.floor(timer / 60)).padStart(2, '0');
  const ss = String(timer % 60).padStart(2, '0');

  const distKm = order.distance_km;
  const distColor = distKm == null ? '#6b7280'
    : distKm < 2  ? '#10b981'
    : distKm < 5  ? '#f59e0b'
    : '#ef4444';

  return (
    <div className="rdb-new-order-card">
      <div className="rdb-noc-header">
        <div><p className="rdb-noc-id">{order.id}</p><p className="rdb-noc-customer">{order.customer.name}</p></div>
        <div className="rdb-noc-right">
          <span className="rdb-noc-amount">৳{order.amount}</span>
          <span className={`rdb-noc-timer ${timer < 20 ? 'urgent' : ''}`}>⏱ {mm}:{ss}</span>
        </div>
      </div>

      {distKm != null && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          marginBottom: 10, padding: '4px 10px', borderRadius: 999,
          background: `${distColor}18`, border: `1.5px solid ${distColor}40`,
          fontSize: 12, fontWeight: 700, color: distColor,
        }}>
          <Navigation size={12} />
          {distKm.toFixed(1)} km to restaurant
          <span style={{ fontWeight: 400, color: distColor, opacity: 0.8 }}>
            · {distKm < 2 ? 'Very close' : distKm < 5 ? 'Nearby' : 'Far'}
          </span>
        </div>
      )}

      <div className="rdb-noc-locations">
        <div className="rdb-noc-loc-row">
          <div className="rdb-noc-loc-dot pickup" />
          <div>
            <p className="rdb-noc-loc-label">Pickup</p>
            <p className="rdb-noc-loc-name">{order.restaurant.name}</p>
            <p className="rdb-noc-loc-addr">{order.restaurant.address}</p>
          </div>
        </div>
        <div className="rdb-noc-loc-line" />
        <div className="rdb-noc-loc-row">
          <div className="rdb-noc-loc-dot dropoff" />
          <div>
            <p className="rdb-noc-loc-label">Drop-off</p>
            <p className="rdb-noc-loc-addr">{order.delivery.address}</p>
          </div>
        </div>
      </div>

      <div className="rdb-noc-items">
        {order.items.map((item, i) => (
          <span key={i} className="rdb-noc-item">{item.qty}× {item.name}</span>
        ))}
      </div>

      <div className="rdb-noc-footer">
        <span className="rdb-noc-payment">{order.payment}</span>
        <div className="rdb-noc-actions">
          <button className="rdb-btn-accept" onClick={onAccept}>Accept Order</button>
        </div>
      </div>
    </div>
  );
};

const OngoingOrderCard = ({ order, onPickedUp }) => (
  <div className="rdb-ongoing-card">
    <div className="rdb-ongoing-header">
      <p className="rdb-ongoing-id">{order.id}</p>
      {/* FIX: show real backend status so rider knows if restaurant started yet */}
      <span className={`rdb-ongoing-badge ${order.backendStatus === 'PENDING' ? 'pending' : 'preparing'}`}>
        {order.backendStatus === 'PENDING' ? '⏳ Waiting' : '🍳 Preparing'}
      </span>
    </div>
    <p className="rdb-ongoing-restaurant">{order.restaurant?.name}</p>
    <p className="rdb-ongoing-addr">{order.restaurant?.address}</p>
    <div className="rdb-ongoing-status-bar">
      <div className="rdb-status-step done"><Check size={12} /> Order Placed</div>
      <div className={`rdb-status-step ${order.backendStatus === 'PREPARING' ? 'active pulse' : 'active'}`}>
        <Utensils size={12} /> {order.backendStatus === 'PENDING' ? 'Waiting' : 'Preparing'}
      </div>
      <div className="rdb-status-step"><Bike size={12} /> Picked Up</div>
      <div className="rdb-status-step"><MapPin size={12} /> Delivered</div>
    </div>
    <button className="rdb-pickup-btn" onClick={onPickedUp}><Package size={16} /> Picked Up — Head to Customer</button>
  </div>
);

const PickedUpCard = ({ order, onDelivered }) => (
  <div className="rdb-ongoing-card delivering">
    <div className="rdb-ongoing-header"><p className="rdb-ongoing-id">{order.id}</p><span className="rdb-ongoing-badge delivering">🚴 Delivering</span></div>
    <p className="rdb-ongoing-restaurant">{order.customer?.name}</p>
    <p className="rdb-ongoing-addr">{order.delivery?.address}</p>
    <div className="rdb-ongoing-status-bar">
      <div className="rdb-status-step done"><Check size={12} /> Order Placed</div>
      <div className="rdb-status-step done"><Check size={12} /> Preparing</div>
      <div className="rdb-status-step done"><Check size={12} /> Picked Up</div>
      <div className="rdb-status-step active pulse"><MapPin size={12} /> Delivering</div>
    </div>
    <button className="rdb-deliver-btn" onClick={onDelivered}><CheckCircle size={16} /> Dropped Off — Order Complete</button>
  </div>
);

const CompletedCard = ({ order }) => (
  <div className="rdb-completed-card">
    <div className="rdb-completed-left"><Check size={16} color={COLORS.success} /><div><p className="rdb-completed-id">{order.id}</p><p className="rdb-completed-customer">{order.customer?.name} · Just now</p></div></div>
    <span className="rdb-completed-amt">৳{order.amount}</span>
  </div>
);

// ─── HISTORY TAB ──────────────────────────────────────────────────────────────
const HistoryTab = () => {
  const [dateFilter,  setDateFilter]  = useState('30');
  const [expandedId,  setExpandedId]  = useState(null);
  const [historyData, setHistoryData] = useState(null);   // raw API response
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);

  const dateFilters = [
    { id: 'today',     label: 'Today',     days: 1   },
    { id: 'yesterday', label: 'Yesterday', days: 2   },
    { id: '7',         label: '7 Days',    days: 7   },
    { id: '30',        label: '30 Days',   days: 30  },
  ];

  const loadHistory = useCallback(async (days) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRiderHistory(days);
      if (data) setHistoryData(data);
      else setError('Failed to load history.');
    } catch (e) {
      setError('Failed to load history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const filter = dateFilters.find(f => f.id === dateFilter);
    loadHistory(filter ? filter.days : 30);
  }, [dateFilter]);

  // For "today" / "yesterday" filters, trim groups client-side after fetch
  const getVisibleGroups = () => {
    if (!historyData?.groups) return [];
    const groups = historyData.groups;
    if (dateFilter === 'today')     return groups.filter(g => g.label === 'Today');
    if (dateFilter === 'yesterday') return groups.filter(g => g.label === 'Yesterday');
    return groups;
  };

  const visible        = getVisibleGroups();
  const totalOrders    = visible.reduce((s, g) => s + g.order_count,    0);
  const totalEarnings  = visible.reduce((s, g) => s + g.total_earnings, 0);

  return (
    <motion.div className="rdb-tab-pane" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>
      <h2 className="rdb-section-title">Order History</h2>

      {/* Summary strip */}
      <div className="rdb-hist-summary">
        <div className="rdb-hist-stat">
          <Calendar size={18} color={COLORS.primary} />
          <span className="rdb-hist-stat-num">{loading ? '—' : totalOrders}</span>
          <span className="rdb-hist-stat-label">Orders</span>
        </div>
        <div className="rdb-hist-stat">
          <DollarSign size={18} color={COLORS.success} />
          <span className="rdb-hist-stat-num">{loading ? '—' : `৳${totalEarnings.toFixed(2)}`}</span>
          <span className="rdb-hist-stat-label">Earnings</span>
        </div>
      </div>

      {/* Date filter pills */}
      <div className="rdb-date-filters">
        {dateFilters.map(f => (
          <button key={f.id} className={`rdb-date-filter-btn ${dateFilter === f.id ? 'active' : ''}`}
            onClick={() => setDateFilter(f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="rdb-empty" style={{ paddingTop: 32 }}>
          <div style={{ width: 36, height: 36, border: `3px solid var(--primary-light)`,
            borderTopColor: 'var(--primary)', borderRadius: '50%',
            animation: 'rdbSpin 0.8s linear infinite', marginBottom: 12 }} />
          <p>Loading history…</p>
        </div>
      ) : error ? (
        <div className="rdb-empty" style={{ paddingTop: 32 }}>
          <AlertCircle size={40} color="#ef4444" opacity={0.5} />
          <p style={{ color: '#ef4444' }}>{error}</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="rdb-empty" style={{ paddingTop: 32 }}>
          <History size={48} color={COLORS.primary} opacity={0.3} strokeWidth={1} />
          <p>No deliveries in this period</p>
          <span>Completed orders will appear here once delivered.</span>
        </div>
      ) : (
        visible.map(group => (
          <div key={group.date} className="rdb-hist-group">
            <h3 className="rdb-hist-date">
              {group.label}
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--gray-400)', marginLeft: 8 }}>
                {group.order_count} order{group.order_count !== 1 ? 's' : ''} · ৳{group.total_earnings.toFixed(2)}
              </span>
            </h3>
            {group.orders.map(order => {
              const cardId = `${group.date}-${order.order_id}`;
              const isOpen = expandedId === cardId;
              // Format completed_at as HH:MM
              const timeStr = order.completed_at
                ? new Date(order.completed_at).toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit', hour12: true })
                : '';
              return (
                <div key={order.order_id} className="rdb-shift-history-card">
                  <div className="rdb-shc-header" onClick={() => setExpandedId(isOpen ? null : cardId)}>
                    <div>
                      <p className="rdb-shc-time">#{order.order_id} · {timeStr}</p>
                      <p className="rdb-shc-zone">{order.restaurant_name}</p>
                    </div>
                    <div className="rdb-shc-right">
                      <span className="rdb-shc-total">৳{order.earnings.toFixed(2)}</span>
                      <ChevronRight size={16} style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: '0.2s' }} />
                    </div>
                  </div>
                  {isOpen && (
                    <div className="rdb-shc-breakdown">
                      <div className="rdb-pay-row header">
                        <span>Your Earnings:</span>
                        <span>৳{order.earnings.toFixed(2)}</span>
                      </div>
                      <div className="rdb-pay-row sub">
                        <span>Order Total</span>
                        <span>৳{order.total_amount.toFixed(2)}</span>
                      </div>
                      <div className="rdb-pay-row sub">
                        <span>Delivery Charge (50%)</span>
                        <span>৳{(order.delivery_charge * 0.5).toFixed(2)}</span>
                      </div>
                      {order.rider_tip > 0 && (
                        <div className="rdb-pay-row sub tips">
                          <span>Tip (50%)</span>
                          <span>৳{(order.rider_tip * 0.5).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="rdb-pay-order-row" style={{ marginTop: 6 }}>
                        <span className="rdb-pay-order-icon">👤</span>
                        <span className="rdb-pay-order-id">{order.customer_name}</span>
                        <span className="rdb-pay-order-time">{timeStr}</span>
                        <span className="rdb-pay-order-amt">৳{order.earnings.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))
      )}
      <style>{`@keyframes rdbSpin { to { transform: rotate(360deg); } }`}</style>
    </motion.div>
  );
};

// ─── WALLET TAB ───────────────────────────────────────────────────────────────
const WalletTab = ({ balance, onRefreshStats }) => {
  const [showPayout, setShowPayout] = useState(false);
  return (
    <motion.div className="rdb-tab-pane" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>
      <h2 className="rdb-section-title">Wallet</h2>
      <div className="rdb-wallet-card">
        <p className="rdb-wallet-label">Current balance</p>
        <p className="rdb-wallet-balance">৳{parseFloat(balance || 0).toFixed(2)}</p>
        <button className="rdb-payout-btn" onClick={() => setShowPayout(true)}>💸 Payout</button>
      </div>
      {showPayout && (
        <div className="rdb-modal-overlay" onClick={() => setShowPayout(false)}>
          <div className="rdb-modal" onClick={e => e.stopPropagation()}>
            <h3>Request Payout</h3>
            <p>Available: <strong>৳{parseFloat(balance || 0).toFixed(2)}</strong></p>
            <p className="rdb-modal-sub">Funds transferred within 1–2 business days.</p>
            <div className="rdb-modal-actions">
              <button className="rdb-modal-cancel" onClick={() => setShowPayout(false)}>Cancel</button>
              <button className="rdb-modal-confirm" onClick={() => {
                setShowPayout(false);
                toast.success('Payout request submitted!');
                onRefreshStats?.();
              }}>Confirm Payout</button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

// ─── PROFILE TAB ──────────────────────────────────────────────────────────────
const ProfileTab = ({ rider }) => {
  const [section, setSection] = useState('main');
  const [bankTab, setBankTab] = useState('info');
  const [bankData, setBankData] = useState({ bankName: '', bic: '', iban: '' });
  const [bankDocs, setBankDocs] = useState({ front: null, back: null });
  const [editField, setEditField] = useState(null);
  const [profileData, setProfileData] = useState({ email: rider.email, phone: rider.phone, password: '••••••••••' });
  const initials = rider.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'RD';

  if (section === 'bank') return (
    <motion.div className="rdb-tab-pane" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <button className="rdb-back-btn" onClick={() => setSection('main')}><ChevronLeft size={18} /> My Profile</button>
      <h2 className="rdb-section-title">Edit bank details</h2>
      <div className="rdb-bank-tabs">
        <button className={`rdb-bank-tab ${bankTab === 'info' ? 'active' : ''}`} onClick={() => setBankTab('info')}>Information</button>
        <button className={`rdb-bank-tab ${bankTab === 'documents' ? 'active' : ''}`} onClick={() => setBankTab('documents')}>Documents</button>
      </div>
      {bankTab === 'info' ? (
        <div className="rdb-bank-form">
          {[{ key: 'bankName', label: 'Bank Name' }, { key: 'bic', label: 'BIC' }, { key: 'iban', label: 'IBAN' }].map(f => (
            <div key={f.key} className="rdb-bank-field"><label>{f.label} <span className="rdb-required">Required</span></label><input value={bankData[f.key]} onChange={e => setBankData(p => ({ ...p, [f.key]: e.target.value }))} placeholder={`Enter ${f.label}`} /></div>
          ))}
          <button className="rdb-continue-btn" onClick={() => setBankTab('documents')}>Continue</button>
          <button className="rdb-go-back-link" onClick={() => setSection('main')}>Go back</button>
        </div>
      ) : (
        <div className="rdb-bank-form">
          <h4 className="rdb-docs-title">Documents</h4>
          {[{ key: 'front', label: 'Bank Receipt Front' }, { key: 'back', label: 'Bank Receipt Back' }].map(doc => (
            <div key={doc.key} className="rdb-doc-upload">
              <div className="rdb-doc-header"><span className="rdb-doc-num">{doc.key === 'front' ? '1' : '2'}</span><span>{doc.label}</span><span className="rdb-required">Required</span></div>
              <label className="rdb-upload-area">
                <Upload size={24} color={COLORS.primary} /><span className="rdb-upload-label">Upload documents</span><span className="rdb-upload-hint">Accepted: png, pdf, jpg</span>
                {bankDocs[doc.key] && <span className="rdb-upload-done">✓ {bankDocs[doc.key].name}</span>}
                <input type="file" accept=".png,.pdf,.jpg,.jpeg" style={{ display: 'none' }} onChange={e => setBankDocs(p => ({ ...p, [doc.key]: e.target.files[0] }))} />
              </label>
            </div>
          ))}
          <button className="rdb-continue-btn" onClick={() => { setSection('main'); toast.success('Bank details submitted for review!'); }}>Continue</button>
          <button className="rdb-go-back-link" onClick={() => setBankTab('info')}>Go back</button>
        </div>
      )}
    </motion.div>
  );

  return (
    <motion.div className="rdb-tab-pane" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>
      <h2 className="rdb-section-title">My Profile</h2>
      <div className="rdb-profile-hero"><div className="rdb-profile-avatar">{initials}</div><div><p className="rdb-profile-name">{rider.name}</p><p className="rdb-profile-id">ID {rider.id}</p></div></div>
      <div className="rdb-profile-sections">
        {[{ key: 'license', label: 'Driver license', Icon: CreditCard }, { key: 'bank', label: 'Bank details', Icon: DollarSign }, { key: 'id', label: 'Id card', Icon: FileText }].map(({ key, label, Icon }) => (
          <button key={key} className="rdb-profile-section-btn" onClick={() => setSection(key)}><Icon size={18} color={COLORS.primary} /><span>{label}</span><span className="rdb-profile-view">View</span><ChevronRight size={16} color="var(--gray-400)" /></button>
        ))}
      </div>
      <div className="rdb-profile-info">
        <h3>Other information</h3>
        {[{ label: 'Email', key: 'email', Icon: Mail, editable: false }, { label: 'Password', key: 'password', Icon: Lock, editable: true }, { label: 'Phone number', key: 'phone', Icon: Phone, editable: false }].map(f => (
          <div key={f.key} className="rdb-info-row">
            <div className="rdb-info-field">
              <label>{f.label}</label>
              {editField === f.key ? <input autoFocus value={profileData[f.key]} onChange={e => setProfileData(p => ({ ...p, [f.key]: e.target.value }))} onBlur={() => setEditField(null)} /> : <p className={f.key === 'email' || f.key === 'phone' ? 'rdb-info-obscured' : ''}>{profileData[f.key]}</p>}
            </div>
            {f.editable && <button className="rdb-edit-btn" onClick={() => setEditField(f.key)}><Edit2 size={14} /> Edit</button>}
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default RiderDashboard;