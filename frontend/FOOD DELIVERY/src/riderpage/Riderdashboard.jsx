import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle, Bike, MapPin, Clock, DollarSign, History,
  Wallet, User, Star, Package, ChevronRight,
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

// ─── MOCK DATA (history only) ─────────────────────────────────────────────────
const MOCK_HISTORY = [
  {
    date: 'Today',
    entries: [
      { id: 'E-001', time: '11:15 – 13:49', zone: 'Gulshan', totalEarnings: 490, hoursWorked: '2h 35m', tips: 20, deliveries: 7, adjustment: 0,
        orders: [{ id: 'o9ap-l7pm', completedAt: '13:32', amount: 72 }, { id: 'w8ci-b3u5', completedAt: '12:46', amount: 68 }]
      },
    ]
  },
  {
    date: 'Yesterday',
    entries: [
      { id: 'E-002', time: '11:15 – 14:14', zone: 'Mirpur', totalEarnings: 610, hoursWorked: '2h 60m', tips: 0, deliveries: 9, adjustment: 70, orders: [] },
    ]
  }
];

const MOCK_COMPLETED_ORDERS = [
  { id: 'ORD-6891', shortId: 't2iz-abcd', customer: 'Hassan Ali',   amount: 380, tips: 20, completedAt: '13:32' },
  { id: 'ORD-6885', shortId: 'w8ci-efgh', customer: 'Ayesha Begum', amount: 290, tips: 10, completedAt: '12:46' },
];

// ─── BACKEND API HELPERS ──────────────────────────────────────────────────────

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
    rating:  4.8,
  };

  const [activeTab,     setActiveTab]     = useState('status');
  const [isOnline,      setIsOnline]      = useState(false);
  const [isDark,        setIsDark]        = useState(() => localStorage.getItem('theme') === 'dark');
  const [showProfile,   setShowProfile]   = useState(false);

  // Task 8: orders from backend
  const [nearbyOrders,  setNearbyOrders]  = useState([]);
  const [myOrders,      setMyOrders]      = useState([]);  // accepted orders
  const [orderTab,      setOrderTab]      = useState('nearby');
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [walletBalance, setWalletBalance] = useState(0);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [ordersToday,   setOrdersToday]   = useState(0);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  // Push GPS to backend
  const pushLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => updateRiderLocation(coords.latitude, coords.longitude),
      () => {},
      { enableHighAccuracy: true }
    );
  }, []);

  // Task 8: load nearby orders
  const loadNearbyOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const raw = await fetchNearbyOrders();
      const normalised = raw.map(o => ({
        id:        `#${o.order_id}`,
        orderId:   String(o.order_id),
        backendId: o.order_id,
        customer: {
          name:  `${o.customer_first_name || ''} ${o.customer_last_name || ''}`.trim() || 'Customer',
          phone: o.customer_phone || '',
        },
        restaurant: {
          name:    o.restaurant_name    || 'Restaurant',
          address: o.restaurant_address || '',
          pickup:  '~5 mins',
          lat: o.restaurant_lat, lng: o.restaurant_lng,
        },
        delivery: {
          address: [o.street_number, o.apartment_number, o.address_description].filter(Boolean).join(', ') || 'Delivery address',
          time: '~10 mins',
          lat: o.delivery_lat, lng: o.delivery_lng,
        },
        items:       (o.items || []).map(i => ({ name: i.item_name, qty: i.quantity })),
        amount:      parseFloat(o.total_amount || 0),
        payment:     'Online',
        status:      'new',
        timer:       90,
        distance_km: o.distance_km,
      }));
      setNearbyOrders(normalised);
    } catch (e) {
      console.error('loadNearbyOrders error:', e);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  // Auto-refresh when online
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

  // Task 8: accept from backend
  const handleAcceptOrder = async (orderId, backendId) => {
    try {
      await acceptOrderApi(backendId);
      const order = nearbyOrders.find(o => o.id === orderId);
      if (order) {
        setMyOrders(prev => [{ ...order, status: 'ongoing' }, ...prev]);
        setNearbyOrders(prev => prev.filter(o => o.id !== orderId));
      }
      setOrderTab('ongoing');
      toast.success('Order accepted! Head to the restaurant.');
    } catch (e) { toast.error(e.message || 'Failed to accept order'); }
  };

  const handleDeclineOrder = (orderId) => {
    setNearbyOrders(prev => prev.filter(o => o.id !== orderId));
    toast('Order skipped', { icon: '❌' });
  };

  const handlePickedUp = async (orderId, backendId) => {
    try {
      await updateOrderStatusApi(backendId, 'PICKED_UP');
      setMyOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'picked_up' } : o));
      toast.success('Order picked up! Delivering now.');
    } catch (e) { toast.error(e.message || 'Failed to update status'); }
  };

  const handleDelivered = async (orderId, backendId) => {
    try {
      await updateOrderStatusApi(backendId, 'DELIVERED');
      const order = myOrders.find(o => o.id === orderId);
      if (order) {
        setMyOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'completed', completedAt: new Date() } : o));
        setTodayEarnings(p => p + order.amount);
        setOrdersToday(p => p + 1);
        setWalletBalance(p => p + order.amount);
        setOrderTab('completed');
        toast.success(`✅ Delivered! ৳${order.amount} earned`);
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
                  { Icon: User,       label: 'Profile',     action: () => { setActiveTab('profile'); setShowProfile(false); } },
                  { Icon: MapPin,     label: riderData.city, noAction: true },
                  { Icon: HelpCircle, label: 'Help Center',  action: () => { window.open('https://www.foodpanda.com.bd/contents/help-center', '_blank'); setShowProfile(false); } },
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
        <div className="rdb-stat"><span className="rdb-stat-label">Today's Earnings</span><span className="rdb-stat-val rdb-stat-earnings">৳{todayEarnings}</span></div>
        <div className="rdb-stat"><span className="rdb-stat-label">Orders Today</span><span className="rdb-stat-val rdb-stat-orders">{ordersToday}</span></div>
        <div className="rdb-stat"><span className="rdb-stat-label">Rating</span><span className="rdb-stat-val rdb-stat-rating"><Star size={13} fill="currentColor" style={{ verticalAlign: 'middle', marginRight: 3, marginTop: -2 }} /> {riderData.rating}</span></div>
        <div className="rdb-stat"><span className="rdb-stat-label">Status</span><span className={`rdb-stat-val rdb-stat-status ${isOnline ? 'online' : 'offline'}`}>{isOnline ? 'Online' : 'Offline'}</span></div>
      </div>

      {/* Tab content */}
      <div className="rdb-content">
        <AnimatePresence mode="wait">
          {activeTab === 'status'     && <StatusTab     key="status"     isOnline={isOnline} activeOrder={activeOrder} onToggleOnline={handleToggleOnline} />}
          {activeTab === 'deliveries' && <DeliveriesTab key="deliveries"
            nearbyOrders={nearbyOrders} ongoingOrders={ongoingOrders} completedOrders={completedOrders}
            orderTab={orderTab} setOrderTab={setOrderTab}
            isOnline={isOnline} loadingOrders={loadingOrders}
            onAccept={handleAcceptOrder} onDecline={handleDeclineOrder}
            onPickedUp={handlePickedUp} onDelivered={handleDelivered} onRefresh={loadNearbyOrders}
          />}
          {activeTab === 'history'  && <HistoryTab  key="history"  />}
          {activeTab === 'wallet'   && <WalletTab   key="wallet"   balance={walletBalance} />}
          {activeTab === 'profile'  && <ProfileTab  key="profile"  rider={riderData} />}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ─── STATUS TAB — no shifts ────────────────────────────────────────────────────
const StatusTab = ({ isOnline, activeOrder, onToggleOnline }) => (
  <motion.div className="rdb-tab-pane"
    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>

    <RiderMap order={activeOrder} isOnline={isOnline} />

    <div className="rdb-online-toggle-card">
      <div>
        <p className={`rdb-online-toggle-title ${isOnline ? 'online' : 'offline'}`}>
          <span className={`rdb-mini-dot ${isOnline ? 'online' : ''}`} />
          {isOnline ? 'You are Online' : 'You are Offline'}
        </p>
        <p className="rdb-online-toggle-desc">
          {isOnline ? 'You are visible to customers and can receive orders.' : 'Toggle to go online and start receiving orders.'}
        </p>
      </div>
      <button onClick={onToggleOnline} className={`rdb-go-toggle-btn ${isOnline ? 'go-offline' : 'go-online'}`}>
        {isOnline ? 'Go Offline' : 'Go Online'}
      </button>
    </div>

    {activeOrder ? (
      <div className="rdb-active-order-banner">
        <div className="rdb-aob-label"><Package size={14} /> Active Order</div>
        <p className="rdb-aob-id">{activeOrder.id} — {activeOrder.customer?.name}</p>
        <p className="rdb-aob-status">
          {activeOrder.status === 'ongoing' ? 'Preparing at restaurant' : 'On the way to customer'}
        </p>
      </div>
    ) : isOnline ? (
      <div className="rdb-waiting-state">
        <Bike size={48} strokeWidth={1} className="rdb-waiting-icon" />
        <p className="rdb-waiting-title">Waiting for orders…</p>
        <p className="rdb-waiting-sub">Check the Deliveries tab for orders near you.</p>
      </div>
    ) : null}
  </motion.div>
);

// ─── DELIVERIES TAB ───────────────────────────────────────────────────────────
const DeliveriesTab = ({ nearbyOrders, ongoingOrders, completedOrders, orderTab, setOrderTab,
  isOnline, loadingOrders, onAccept, onDecline, onPickedUp, onDelivered, onRefresh }) => {
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
        <div className="rdb-offline-warning">
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
            order.status === 'new'       ? <NearbyOrderCard  key={order.id} order={order} onAccept={() => onAccept(order.id, order.backendId)}   onDecline={() => onDecline(order.id)} /> :
            order.status === 'ongoing'   ? <OngoingOrderCard key={order.id} order={order} onPickedUp={() => onPickedUp(order.id, order.backendId)} /> :
            order.status === 'picked_up' ? <PickedUpCard     key={order.id} order={order} onDelivered={() => onDelivered(order.id, order.backendId)} /> :
                                           <CompletedCard    key={order.id} order={order} />
          )
        )}
        {orderTab === 'completed' && current.length === 0 && MOCK_COMPLETED_ORDERS.map(o => (
          <div key={o.id} className="rdb-completed-card">
            <div className="rdb-completed-left">
              <Check size={16} color={COLORS.success} />
              <div>
                <p className="rdb-completed-id">{o.id}</p>
                <p className="rdb-completed-customer">{o.customer} · {o.completedAt}</p>
              </div>
            </div>
            <div className="rdb-completed-right">
              <span className="rdb-completed-amt">৳{o.amount}</span>
              {o.tips > 0 && <span className="rdb-completed-tip">+৳{o.tips} tip</span>}
            </div>
          </div>
        ))}
      </div>
      <style>{`@keyframes rdbSpin { to { transform: rotate(360deg); } }`}</style>
    </motion.div>
  );
};

// ─── ORDER CARDS ──────────────────────────────────────────────────────────────
const NearbyOrderCard = ({ order, onAccept, onDecline }) => {
  const [timer, setTimer] = useState(order.timer || 90);
  useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer(p => p - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);
  const mm = String(Math.floor(timer / 60)).padStart(2, '0');
  const ss = String(timer % 60).padStart(2, '0');
  return (
    <div className="rdb-new-order-card">
      <div className="rdb-noc-header">
        <div><p className="rdb-noc-id">{order.id}</p><p className="rdb-noc-customer">{order.customer.name}</p></div>
        <div className="rdb-noc-right">
          <span className="rdb-noc-amount">৳{order.amount}</span>
          <span className={`rdb-noc-timer ${timer < 20 ? 'urgent' : ''}`}>⏱ {mm}:{ss}</span>
        </div>
      </div>
      {order.distance_km && (
        <div className="rdb-noc-distance">
          <Navigation size={12} /> {order.distance_km.toFixed(1)} km away
        </div>
      )}
      <div className="rdb-noc-locations">
        <div className="rdb-noc-loc-row">
          <div className="rdb-noc-loc-dot pickup" />
          <div><p className="rdb-noc-loc-label">Pickup</p><p className="rdb-noc-loc-name">{order.restaurant.name}</p><p className="rdb-noc-loc-addr">{order.restaurant.address}</p></div>
        </div>
        <div className="rdb-noc-loc-line" />
        <div className="rdb-noc-loc-row">
          <div className="rdb-noc-loc-dot dropoff" />
          <div><p className="rdb-noc-loc-label">Drop-off</p><p className="rdb-noc-loc-addr">{order.delivery.address}</p></div>
        </div>
      </div>
      <div className="rdb-noc-items">{order.items.map((item, i) => <span key={i} className="rdb-noc-item">{item.qty}× {item.name}</span>)}</div>
      <div className="rdb-noc-footer">
        <span className="rdb-noc-payment">{order.payment}</span>
        <div className="rdb-noc-actions">
          <button className="rdb-btn-decline" onClick={onDecline}>Skip</button>
          <button className="rdb-btn-accept"  onClick={onAccept}>Accept Order</button>
        </div>
      </div>
    </div>
  );
};

const OngoingOrderCard = ({ order, onPickedUp }) => (
  <div className="rdb-ongoing-card">
    <div className="rdb-ongoing-header">
      <p className="rdb-ongoing-id">{order.id}</p>
      <span className="rdb-ongoing-badge preparing">Preparing</span>
    </div>
    <p className="rdb-ongoing-restaurant">{order.restaurant?.name}</p>
    <p className="rdb-ongoing-addr">{order.restaurant?.address}</p>
    <div className="rdb-ongoing-status-bar">
      <div className="rdb-status-step done"><Check size={12} /> Order Placed</div>
      <div className="rdb-status-step active pulse"><Utensils size={12} /> Preparing</div>
      <div className="rdb-status-step"><Bike size={12} /> Picked Up</div>
      <div className="rdb-status-step"><MapPin size={12} /> Delivered</div>
    </div>
    <button className="rdb-pickup-btn" onClick={onPickedUp}><Package size={16} /> Picked Up — Head to Customer</button>
  </div>
);

const PickedUpCard = ({ order, onDelivered }) => (
  <div className="rdb-ongoing-card delivering">
    <div className="rdb-ongoing-header">
      <p className="rdb-ongoing-id">{order.id}</p>
      <span className="rdb-ongoing-badge delivering">Delivering</span>
    </div>
    <p className="rdb-ongoing-restaurant">{order.customer?.name}</p>
    <p className="rdb-ongoing-addr">{order.delivery?.address}</p>
    <div className="rdb-ongoing-status-bar">
      <div className="rdb-status-step done"><Check size={12} /> Order Placed</div>
      <div className="rdb-status-step done"><Check size={12} /> Preparing</div>
      <div className="rdb-status-step done"><Check size={12} /> Picked Up</div>
      <div className="rdb-status-step active pulse"><MapPin size={12} /> Delivering</div>
    </div>
    <button className="rdb-deliver-btn" onClick={onDelivered}><Check size={16} /> Dropped Off — Order Complete</button>
  </div>
);

const CompletedCard = ({ order }) => (
  <div className="rdb-completed-card">
    <div className="rdb-completed-left"><Check size={16} color={COLORS.success} /><div><p className="rdb-completed-id">{order.id}</p><p className="rdb-completed-customer">{order.customer?.name} · Just now</p></div></div>
    <span className="rdb-completed-amt">৳{order.amount}</span>
  </div>
);

// ─── HISTORY TAB ─────────────────────────────────────────────────────────────
const HistoryTab = () => {
  const [dateFilter, setDateFilter] = useState('today');
  const [expandedId, setExpandedId] = useState(null);
  const dateFilters = [{ id: 'today', label: 'Today' }, { id: 'yesterday', label: 'Yesterday' }, { id: '7days', label: '7 Days' }, { id: '30days', label: '30 Days' }];
  const visible = dateFilter === 'today' ? MOCK_HISTORY.filter(g => g.date === 'Today') : dateFilter === 'yesterday' ? MOCK_HISTORY.filter(g => g.date === 'Yesterday') : MOCK_HISTORY;
  return (
    <motion.div className="rdb-tab-pane" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>
      <h2 className="rdb-section-title">Order History</h2>
      <div className="rdb-hist-summary">
        <div className="rdb-hist-stat"><Calendar size={18} color={COLORS.primary} /><span className="rdb-hist-stat-num">7</span><span className="rdb-hist-stat-label">Orders</span></div>
        <div className="rdb-hist-stat"><DollarSign size={18} color={COLORS.success} /><span className="rdb-hist-stat-num">৳955</span><span className="rdb-hist-stat-label">Earnings</span></div>
        <div className="rdb-hist-stat tips-active"><Star size={18} color="#f59e0b" /><span className="rdb-hist-stat-num tips">৳20</span><span className="rdb-hist-stat-label">Tips</span></div>
      </div>
      <div className="rdb-date-filters">{dateFilters.map(f => <button key={f.id} className={`rdb-date-filter-btn ${dateFilter === f.id ? 'active' : ''}`} onClick={() => setDateFilter(f.id)}>{f.label}</button>)}</div>
      {visible.map(group => (
        <div key={group.date} className="rdb-hist-group">
          <h3 className="rdb-hist-date">{group.date}</h3>
          {group.entries.map(entry => (
            <div key={entry.id} className="rdb-shift-history-card">
              <div className="rdb-shc-header" onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}>
                <div><p className="rdb-shc-time">{entry.time}</p><p className="rdb-shc-zone">{entry.zone}</p></div>
                <div className="rdb-shc-right"><span className="rdb-shc-total">৳{entry.totalEarnings}</span><ChevronRight size={16} style={{ transform: expandedId === entry.id ? 'rotate(90deg)' : 'none', transition: '0.2s' }} /></div>
              </div>
              {expandedId === entry.id && (
                <div className="rdb-shc-breakdown">
                  <div className="rdb-pay-row header"><span>Total Earnings:</span><span>৳{entry.totalEarnings}</span></div>
                  <div className="rdb-pay-row sub"><span>Hours ({entry.hoursWorked})</span><span>৳0.00</span></div>
                  {entry.tips > 0 && <div className="rdb-pay-row sub tips"><span>Tips</span><span>৳{entry.tips}</span></div>}
                  <div className="rdb-pay-row sub deliveries"><span>Deliveries ({entry.deliveries})</span><span>৳{entry.totalEarnings - entry.tips}</span></div>
                  {entry.orders.map(o => <div key={o.id} className="rdb-pay-order-row"><Package size={13} className="rdb-pay-order-icon" /><span className="rdb-pay-order-id">{o.id}</span><span className="rdb-pay-order-time">{o.completedAt}</span><span className="rdb-pay-order-amt">৳{o.amount}</span></div>)}
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </motion.div>
  );
};

// ─── WALLET TAB ───────────────────────────────────────────────────────────────
const WalletTab = ({ balance }) => {
  const [showPayout, setShowPayout] = useState(false);
  return (
    <motion.div className="rdb-tab-pane" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>
      <h2 className="rdb-section-title">Wallet</h2>
      <div className="rdb-wallet-card">
        <p className="rdb-wallet-label">Current balance</p>
        <p className="rdb-wallet-balance">৳{(balance / 100).toFixed(2)}</p>
        <button className="rdb-payout-btn" onClick={() => setShowPayout(true)}>Request Payout</button>
      </div>
      <div className="rdb-earning-cards">
        <div className="rdb-earning-card received"><p className="rdb-ec-label">Amount Received</p><p className="rdb-ec-amount">৳97.05</p><p className="rdb-ec-sub">This week</p></div>
        <div className="rdb-earning-card pending"><p className="rdb-ec-label">Pending</p><p className="rdb-ec-amount">৳67.05</p><p className="rdb-ec-sub">Processing</p></div>
        <div className="rdb-earning-card lifetime"><p className="rdb-ec-label">Lifetime</p><p className="rdb-ec-amount">৳164.10</p><p className="rdb-ec-sub">10 orders total</p></div>
      </div>
      <div className="rdb-cash-return-banner"><AlertCircle size={16} color="#dc2626" /><span>Cash to return to office: <strong>৳761.40</strong></span></div>
      {showPayout && (
        <div className="rdb-modal-overlay" onClick={() => setShowPayout(false)}>
          <div className="rdb-modal" onClick={e => e.stopPropagation()}>
            <h3>Request Payout</h3>
            <p>Available: <strong>৳{(balance / 100).toFixed(2)}</strong></p>
            <p className="rdb-modal-sub">Funds transferred within 1–2 business days.</p>
            <div className="rdb-modal-actions">
              <button className="rdb-modal-cancel" onClick={() => setShowPayout(false)}>Cancel</button>
              <button className="rdb-modal-confirm" onClick={() => { setShowPayout(false); toast.success('Payout request submitted!'); }}>Confirm Payout</button>
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