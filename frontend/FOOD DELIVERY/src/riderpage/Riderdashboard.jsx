import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle, Bike, MapPin, Clock, History,
  User, Package, ChevronRight, ChevronLeft, LogOut,
  Calendar, Upload, AlertCircle, Check,
  Phone, Mail, Lock, CreditCard, FileText,
  Edit2, Sun, Moon, HelpCircle, Navigation, RefreshCw,
  Zap, TrendingUp, Star, DollarSign, Activity,
  Flame, XCircle, WifiOff,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { COLORS, BRAND } from '../constants.js';
import './Riderdashboard.css';
import RiderMap from './RiderMap.jsx';
import authService from '../Authservice.js';

// ─── STATUS HELPERS ───────────────────────────────────────────────────────────
function backendToUIStatus(backendStatus) {
  switch ((backendStatus || '').toUpperCase()) {
    case 'PENDING':
    case 'PREPARING': return 'ongoing';
    case 'PICKED_UP': return 'picked_up';
    case 'DELIVERED': return 'completed';
    case 'CANCELLED': return 'cancelled';
    default:          return 'ongoing';
  }
}

function normaliseOrder(raw) {
  return {
    id:            `#${raw.order_id}`,
    orderId:       String(raw.order_id),
    backendId:     raw.order_id,
    backendStatus: (raw.status || '').toUpperCase(),
    status:        backendToUIStatus(raw.status),
    customer: {
      name:  `${raw.customer_first_name || ''} ${raw.customer_last_name || ''}`.trim() || 'Customer',
      phone: raw.customer_phone || '',
    },
    restaurant: {
      name:    raw.restaurant_name    || 'Restaurant',
      address: raw.restaurant_address || '',
      lat: raw.restaurant_lat  ?? null,
      lng: raw.restaurant_lng  ?? null,
    },
    delivery: {
      address: [raw.street_number, raw.apartment_number, raw.address_description]
                  .filter(Boolean).join(', ') || 'Delivery address',
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
async function fetchMyOrders() {
  try {
    const data = await authService.authenticatedFetch('http://127.0.0.1:8000/api/riders/me/orders/');
    return data?.orders ?? [];
  } catch { return []; }
}
async function fetchRiderStats() {
  try { return await authService.authenticatedFetch('http://127.0.0.1:8000/api/riders/me/stats/'); }
  catch { return null; }
}
async function fetchRiderHistory(days = 30) {
  try { return await authService.authenticatedFetch(`http://127.0.0.1:8000/api/riders/me/history/?days=${days}`); }
  catch { return null; }
}
async function fetchNearbyOrders() {
  try {
    const data = await authService.authenticatedFetch('http://127.0.0.1:8000/api/riders/orders/nearby/?radius=50');
    return data?.orders ?? [];
  } catch { return []; }
}
async function acceptOrderApi(orderId) {
  return authService.authenticatedFetch(`http://127.0.0.1:8000/api/riders/orders/accept/${orderId}/`, { method: 'POST' });
}
async function updateOrderStatusApi(orderId, newStatus) {
  return authService.authenticatedFetch(`http://127.0.0.1:8000/api/riders/orders/update-status/${orderId}/`, {
    method: 'PATCH', body: JSON.stringify({ status: newStatus }),
  });
}
async function updateRiderLocation(lat, lng) {
  try {
    await authService.authenticatedFetch('http://127.0.0.1:8000/api/riders/location/', {
      method: 'PATCH', body: JSON.stringify({ current_latitude: lat, current_longitude: lng }),
    });
  } catch {}
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
      () => {}, { enableHighAccuracy: true }
    );
  }, []);

  const loadStats = useCallback(async () => {
    const stats = await fetchRiderStats();
    if (stats) { setOrdersToday(stats.orders_today); setTodayEarnings(stats.today_earnings); }
  }, []);

  const loadMyOrders = useCallback(async () => {
    try { setMyOrders((await fetchMyOrders()).map(normaliseOrder)); } catch {}
  }, []);

  useEffect(() => { loadMyOrders(); loadStats(); }, [loadMyOrders, loadStats]);
  useEffect(() => { const id = setInterval(loadMyOrders, 8_000); return () => clearInterval(id); }, [loadMyOrders]);
  useEffect(() => { const id = setInterval(loadStats, 30_000); return () => clearInterval(id); }, [loadStats]);

  const loadNearbyOrders = useCallback(async () => {
    setLoadingOrders(true);
    try { setNearbyOrders((await fetchNearbyOrders()).map(o => ({ ...normaliseOrder(o), status: 'new' }))); }
    catch {} finally { setLoadingOrders(false); }
  }, []);

  useEffect(() => {
    if (!isOnline) return;
    loadNearbyOrders();
    const id = setInterval(loadNearbyOrders, 10_000);
    return () => clearInterval(id);
  }, [isOnline, loadNearbyOrders]);

  const handleToggleOnline = () => {
    const next = !isOnline;
    setIsOnline(next);
    if (next) {
      pushLocation();
      toast.success("You're online! Ready for orders");
      loadNearbyOrders();
    } else {
      toast("You're now offline", {
        icon: <XCircle size={16} color="#ef4444" />,
      });
    }
  };

  const handleAcceptOrder = async (orderId, backendId) => {
    try {
      await acceptOrderApi(backendId);
      await loadMyOrders();
      setNearbyOrders(prev => prev.filter(o => o.id !== orderId));
      setOrderTab('ongoing');
      toast.success('Order accepted! Head to the restaurant');
    } catch (e) {
      const msg = e.message || '';
      if (msg.includes('PENDING')) toast.error("Restaurant hasn't accepted yet — try again shortly.");
      else if (msg.includes('already')) { toast.error('Another rider grabbed this.'); setNearbyOrders(prev => prev.filter(o => o.id !== orderId)); }
      else if (msg.includes('cancel')) { toast.error('Order was cancelled.'); setNearbyOrders(prev => prev.filter(o => o.id !== orderId)); }
      else toast.error(msg || 'Failed to accept order');
    }
  };

  const handlePickedUp = async (orderId, backendId) => {
    try {
      await updateOrderStatusApi(backendId, 'PICKED_UP');
      setMyOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'picked_up', backendStatus: 'PICKED_UP' } : o));
      toast.success('Picked up! Now deliver to the customer');
    } catch (e) { toast.error(e.message || 'Failed to update status'); }
  };

  const handleDelivered = async (orderId, backendId) => {
    try {
      await updateOrderStatusApi(backendId, 'DELIVERED');
      const order = myOrders.find(o => o.id === orderId);
      setMyOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'completed', backendStatus: 'DELIVERED' } : o));
      setOrderTab('completed');
      if (order) { toast.success(`Delivered! ৳${order.amount} earned`); loadStats(); }
    } catch (e) { toast.error(e.message || 'Failed to update status'); }
  };

  const ongoingOrders   = myOrders.filter(o => o.status === 'ongoing' || o.status === 'picked_up');
  const completedOrders = myOrders.filter(o => o.status === 'completed');
  const initials = riderData.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'RD';

  const TABS = [
    { id: 'status',     Icon: Activity, label: 'Status'     },
    { id: 'deliveries', Icon: Bike,     label: 'Deliveries', badge: nearbyOrders.length + ongoingOrders.length },
    { id: 'history',    Icon: History,  label: 'History'    },
    { id: 'profile',    Icon: User,     label: 'Profile'    },
  ];

  return (
    <div className="rdb-wrap">
      <Toaster position="top-center" toastOptions={{
        style: { borderRadius: '12px', fontFamily: 'var(--rdb-font)', fontSize: '14px', fontWeight: 600 },
        success: { iconTheme: { primary: 'var(--primary)', secondary: '#fff' } },
      }} />

      {/* Profile dropdown */}
      <AnimatePresence>
        {showProfile && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 999 }} onClick={() => setShowProfile(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }} transition={{ duration: 0.15 }}
              className="rdb-dropdown"
            >
              <div className="rdb-dropdown-hero">
                <div className="rdb-dropdown-av">{initials}</div>
                <div>
                  <div className="rdb-dropdown-name">{riderData.name}</div>
                  <div className="rdb-dropdown-email">{riderData.email}</div>
                </div>
              </div>
              <div className="rdb-dropdown-sep" />
              {[
                { Icon: User,       label: 'Profile',      fn: () => { setActiveTab('profile'); setShowProfile(false); } },
                { Icon: MapPin,     label: riderData.city, fn: null },
                { Icon: HelpCircle, label: 'Help Center',  fn: () => { window.open('https://www.youtube.com/watch?v=Aq5WXmQQooo', '_blank'); setShowProfile(false); } },
              ].map(({ Icon, label, fn }, i) => (
                <button key={i} className="rdb-dropdown-row" onClick={fn || undefined} style={{ cursor: fn ? 'pointer' : 'default' }}>
                  <Icon size={15} /><span>{label}</span>
                </button>
              ))}
              <div className="rdb-dropdown-sep" />
              <button className="rdb-dropdown-row danger" onClick={() => { setShowProfile(false); onLogout?.(); }}>
                <LogOut size={15} /><span>Logout</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ══ HEADER ══ */}
      <header className="rdb-header">
        <div className="rdb-header-inner">
          <div className="rdb-brand">
            <div className="rdb-brand-icon">
              <img
                src="/images/logo/khetechailogo.png"
                alt="Khete Chai"
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10, display: 'block' }}
                onError={e => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
            <span className="rdb-brand-name">Khete Chai</span>
            <span className="rdb-brand-tag">rider</span>
          </div>
          <div className="rdb-header-right">
            <div className={`rdb-pill ${isOnline ? 'online' : ''}`}>
              <span className={`rdb-pill-dot ${isOnline ? 'on' : ''}`} />
              {isOnline ? 'Online' : 'Offline'}
            </div>
            <button className="rdb-icon-btn" onClick={() => setIsDark(p => !p)}>
              <AnimatePresence mode="wait">
                {isDark
                  ? <motion.span key="s" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.12 }} style={{ display: 'flex' }}><Sun size={15} /></motion.span>
                  : <motion.span key="m" initial={{ rotate:  90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate:-90, opacity: 0 }} transition={{ duration: 0.12 }} style={{ display: 'flex' }}><Moon size={15} /></motion.span>
                }
              </AnimatePresence>
            </button>
            <button className="rdb-profile-btn" onClick={() => setShowProfile(p => !p)}>
              <div className="rdb-hdr-av">{initials}</div>
              <div className="rdb-hdr-info">
                <span className="rdb-hdr-name">{riderData.name.split(' ')[0]}</span>
                <span className="rdb-hdr-role">Rider</span>
              </div>
              <ChevronRight size={12} style={{ opacity: 0.4 }} />
            </button>
          </div>
        </div>

        <nav className="rdb-nav">
          {TABS.map(({ id, Icon, label, badge }) => (
            <button key={id} className={`rdb-nav-btn ${activeTab === id ? 'active' : ''}`} onClick={() => setActiveTab(id)}>
              <Icon size={14} strokeWidth={activeTab === id ? 2.5 : 1.8} />
              {label}
              {badge > 0 && <span className="rdb-badge">{badge}</span>}
            </button>
          ))}
        </nav>
      </header>

      {/* ══ STATS BAR ══ */}
      <div className="rdb-stats">
        <div className="rdb-stat">
          <TrendingUp size={14} className="rdb-stat-ico green" />
          <div>
            <div className="rdb-stat-lbl">Today's Earnings</div>
            <div className="rdb-stat-val green">৳{todayEarnings}</div>
          </div>
        </div>
        <div className="rdb-stat-sep" />
        <div className="rdb-stat">
          <Package size={14} className="rdb-stat-ico pink" />
          <div>
            <div className="rdb-stat-lbl">Orders Today</div>
            <div className="rdb-stat-val pink">{ordersToday}</div>
          </div>
        </div>
        <div className="rdb-stat-sep" />
        <div className="rdb-stat">
          <Activity size={14} className={`rdb-stat-ico ${isOnline ? 'green' : ''}`} />
          <div>
            <div className="rdb-stat-lbl">Status</div>
            <div className={`rdb-stat-val ${isOnline ? 'green' : 'muted'}`}>
              {isOnline ? 'Online' : 'Offline'}
            </div>
          </div>
        </div>
      </div>

      {/* ══ CONTENT ══ */}
      <div className="rdb-content">
        <AnimatePresence mode="wait">
          {activeTab === 'status'     && <StatusTab     key="s" isOnline={isOnline} ongoingOrders={ongoingOrders} onToggle={handleToggleOnline} />}
          {activeTab === 'deliveries' && <DeliveriesTab key="d"
            nearbyOrders={nearbyOrders} ongoingOrders={ongoingOrders} completedOrders={completedOrders}
            orderTab={orderTab} setOrderTab={setOrderTab}
            isOnline={isOnline} loading={loadingOrders}
            onAccept={handleAcceptOrder} onPickedUp={handlePickedUp}
            onDelivered={handleDelivered} onRefresh={loadNearbyOrders}
          />}
          {activeTab === 'history' && <HistoryTab key="h" />}
          {activeTab === 'profile' && <ProfileTab key="p" rider={riderData} />}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ─── STATUS TAB ───────────────────────────────────────────────────────────────
const StatusTab = ({ isOnline, ongoingOrders, onToggle }) => (
  <motion.div className="rdb-pane" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
    <RiderMap orders={ongoingOrders} isOnline={isOnline} />

    <div className="rdb-toggle-card">
      <div className="rdb-toggle-left">
        <div className={`rdb-toggle-glow ${isOnline ? 'on' : ''}`}><Zap size={20} /></div>
        <div>
          <p className="rdb-toggle-title">{isOnline ? 'You are Online' : 'You are Offline'}</p>
          <p className="rdb-toggle-sub">{isOnline ? 'Visible · receiving orders' : 'Toggle to start receiving orders'}</p>
        </div>
      </div>
      <motion.button className={`rdb-toggle-btn ${isOnline ? 'off' : 'on'}`} onClick={onToggle} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
        {isOnline ? 'Go Offline' : 'Go Online'}
      </motion.button>
    </div>

    {ongoingOrders.length > 0 && (
      <div className="rdb-active-stack">
        {ongoingOrders.map(o => (
          <div key={o.id} className={`rdb-active-chip ${o.status === 'picked_up' ? 'delivering' : 'pickup'}`}>
            <div className="rdb-chip-icon">{o.status === 'picked_up' ? <Bike size={16} /> : <Package size={16} />}</div>
            <div className="rdb-chip-info">
              <span className="rdb-chip-status">{o.status === 'picked_up' ? 'Delivering' : 'Pickup'}</span>
              <span className="rdb-chip-id">{o.id} — {o.customer?.name}</span>
              <span className="rdb-chip-addr">{o.status === 'picked_up' ? o.delivery?.address : o.restaurant?.address}</span>
            </div>
            <span className="rdb-chip-amt">৳{o.amount}</span>
          </div>
        ))}
      </div>
    )}

    {isOnline && ongoingOrders.length === 0 && (
      <div className="rdb-waiting">
        <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} className="rdb-waiting-icon">
          <Bike size={38} />
        </motion.div>
        <p className="rdb-waiting-title">Waiting for orders…</p>
        <p className="rdb-waiting-sub">Check Deliveries tab for nearby orders</p>
      </div>
    )}
  </motion.div>
);

// ─── DELIVERIES TAB ───────────────────────────────────────────────────────────
const DeliveriesTab = ({ nearbyOrders, ongoingOrders, completedOrders, orderTab, setOrderTab,
  isOnline, loading, onAccept, onPickedUp, onDelivered, onRefresh }) => {
  const tabs = [
    { id: 'nearby',    label: 'Nearby',    n: nearbyOrders.length   },
    { id: 'ongoing',   label: 'Ongoing',   n: ongoingOrders.length  },
    { id: 'completed', label: 'Completed', n: completedOrders.length },
  ];
  const current = orderTab === 'nearby' ? nearbyOrders : orderTab === 'ongoing' ? ongoingOrders : completedOrders;

  return (
    <motion.div className="rdb-pane" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
      <div className="rdb-tab-header">
        <div className="rdb-tabs-row">
          {tabs.map(t => (
            <button key={t.id} className={`rdb-tab-btn ${orderTab === t.id ? 'active' : ''}`} onClick={() => setOrderTab(t.id)}>
              {t.label}{t.n > 0 && <span className="rdb-tab-n">{t.n}</span>}
            </button>
          ))}
        </div>
        {orderTab === 'nearby' && (
          <button onClick={onRefresh} disabled={loading} className="rdb-refresh-btn">
            <RefreshCw size={13} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
          </button>
        )}
      </div>

      {orderTab === 'nearby' && !isOnline && (
        <div className="rdb-offline-warn"><AlertCircle size={15} />Go online to receive orders</div>
      )}

      <div className="rdb-list">
        {loading && orderTab === 'nearby' ? (
          <div className="rdb-empty"><div className="rdb-ring" /><p>Finding nearby orders…</p></div>
        ) : current.length === 0 ? (
          <div className="rdb-empty">
            <Bike size={50} strokeWidth={1} style={{ opacity: 0.2, marginBottom: 12 }} />
            <p>No {orderTab} orders</p>
            <span>{orderTab === 'nearby' ? (isOnline ? 'No orders nearby right now.' : 'Go online to see orders.') : orderTab === 'ongoing' ? 'Accept an order to see it here.' : 'Completed orders appear here.'}</span>
          </div>
        ) : current.map(order =>
            order.status === 'new'       ? <NearbyCard   key={order.id} order={order} onAccept={() => onAccept(order.id, order.backendId)} />
          : order.status === 'ongoing'   ? <PickupCard   key={order.id} order={order} onPickedUp={() => onPickedUp(order.id, order.backendId)} />
          : order.status === 'picked_up' ? <DeliverCard  key={order.id} order={order} onDelivered={() => onDelivered(order.id, order.backendId)} />
          :                                <DoneCard     key={order.id} order={order} />
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </motion.div>
  );
};

// ─── NEARBY CARD ──────────────────────────────────────────────────────────────
const NearbyCard = ({ order, onAccept }) => {
  const [t, setT] = useState(order.timer || 90);
  useEffect(() => {
    if (t <= 0) return;
    const id = setInterval(() => setT(p => p - 1), 1000);
    return () => clearInterval(id);
  }, [t]);
  const mm = String(Math.floor(t / 60)).padStart(2, '0');
  const ss = String(t % 60).padStart(2, '0');
  const urgent = t < 20;
  const d = order.distance_km;
  const dc = d == null ? '#6b7280' : d < 2 ? '#10b981' : d < 5 ? '#f59e0b' : '#ef4444';

  return (
    <motion.div className="rdb-nearby-card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <div className="rdb-nc-pulse" />
      <div className="rdb-nc-top">
        <div>
          <p className="rdb-nc-id">{order.id}</p>
          <p className="rdb-nc-customer">{order.customer.name}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p className="rdb-nc-amount">৳{order.amount}</p>
          <span className={`rdb-nc-timer ${urgent ? 'urgent' : ''}`}>
            {urgent ? <Flame size={11} /> : <Clock size={11} />} {mm}:{ss}
          </span>
        </div>
      </div>

      {d != null && (
        <div className="rdb-dist" style={{ background: `${dc}15`, border: `1px solid ${dc}35`, color: dc }}>
          <Navigation size={11} />{d.toFixed(1)} km · {d < 2 ? 'Very close' : d < 5 ? 'Nearby' : 'Far away'}
        </div>
      )}

      <div className="rdb-route">
        <div className="rdb-route-row"><div className="rdb-dot pink" /><div><p className="rdb-route-lbl">Pickup</p><p className="rdb-route-name">{order.restaurant.name}</p>{order.restaurant.address && <p className="rdb-route-addr">{order.restaurant.address}</p>}</div></div>
        <div className="rdb-route-line" />
        <div className="rdb-route-row"><div className="rdb-dot green" /><div><p className="rdb-route-lbl">Drop-off</p><p className="rdb-route-addr">{order.delivery.address}</p></div></div>
      </div>

      {order.items?.length > 0 && (
        <div className="rdb-nc-items">{order.items.map((it, i) => <span key={i} className="rdb-nc-item">{it.qty}× {it.name}</span>)}</div>
      )}

      <motion.button className="rdb-accept-btn" onClick={onAccept} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}>
        <Zap size={15} fill="currentColor" /> Accept · ৳{order.amount}
      </motion.button>
    </motion.div>
  );
};

// ─── PICKUP CARD (ongoing — restaurant has accepted) ──────────────────────────
const PickupCard = ({ order, onPickedUp }) => (
  <motion.div className="rdb-action-card pickup" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
    <div className="rdb-ac-row">
      <span className="rdb-ac-badge pickup"><Package size={11} /> Pickup Order</span>
      <span className="rdb-ac-id">{order.id}</span>
    </div>
    <p className="rdb-ac-main">{order.restaurant?.name}</p>
    {order.restaurant?.address && <p className="rdb-ac-addr"><MapPin size={11} /> {order.restaurant.address}</p>}
    <div className="rdb-ac-meta"><User size={12} /><span>{order.customer?.name}</span>{order.customer?.phone && <><Phone size={11} /><span>{order.customer.phone}</span></>}</div>
    {order.items?.length > 0 && <div className="rdb-ac-items">{order.items.map((it, i) => <span key={i} className="rdb-nc-item">{it.qty}× {it.name}</span>)}</div>}
    <motion.button className="rdb-action-btn pickup" onClick={onPickedUp} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}>
      <Package size={15} /> Picked Up from Restaurant
    </motion.button>
  </motion.div>
);

// ─── DELIVER CARD (picked_up) ─────────────────────────────────────────────────
const DeliverCard = ({ order, onDelivered }) => (
  <motion.div className="rdb-action-card deliver" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
    <div className="rdb-ac-row">
      <span className="rdb-ac-badge deliver"><Bike size={11} /> Delivering</span>
      <span className="rdb-ac-id">{order.id}</span>
    </div>
    <p className="rdb-ac-main">{order.customer?.name}</p>
    {order.delivery?.address && <p className="rdb-ac-addr"><MapPin size={11} /> {order.delivery.address}</p>}
    <div className="rdb-ac-meta"><Star size={12} style={{ color: 'var(--warning)' }} /><span style={{ fontSize: 12, opacity: 0.7 }}>From {order.restaurant?.name}</span></div>
    <motion.button className="rdb-action-btn deliver" onClick={onDelivered} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}>
      <CheckCircle size={15} /> Drop Off — Order Complete
    </motion.button>
  </motion.div>
);

// ─── DONE CARD ────────────────────────────────────────────────────────────────
const DoneCard = ({ order }) => (
  <div className="rdb-done-card">
    <div className="rdb-done-left"><div className="rdb-done-check"><Check size={13} /></div><div><p className="rdb-done-id">{order.id}</p><p className="rdb-done-name">{order.customer?.name}</p></div></div>
    <span className="rdb-done-amt">৳{order.amount}</span>
  </div>
);

// ─── HISTORY TAB ──────────────────────────────────────────────────────────────
const HistoryTab = () => {
  const [df, setDf]             = useState('30');
  const [expanded, setExpanded] = useState(null);
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  const filters = [{ id: 'today', label: 'Today', days: 1 }, { id: 'yesterday', label: 'Yesterday', days: 2 }, { id: '7', label: '7 Days', days: 7 }, { id: '30', label: '30 Days', days: 30 }];

  const load = useCallback(async (days) => {
    setLoading(true); setError(null);
    try { const d = await fetchRiderHistory(days); d ? setData(d) : setError('Failed to load history.'); }
    catch { setError('Failed to load history.'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { const f = filters.find(f => f.id === df); load(f?.days ?? 30); }, [df]);

  const visible = (() => {
    if (!data?.groups) return [];
    if (df === 'today')     return data.groups.filter(g => g.label === 'Today');
    if (df === 'yesterday') return data.groups.filter(g => g.label === 'Yesterday');
    return data.groups;
  })();

  const totalO = visible.reduce((s, g) => s + g.order_count, 0);
  const totalE = visible.reduce((s, g) => s + g.total_earnings, 0);

  return (
    <motion.div className="rdb-pane" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <h2 className="rdb-title">Order History</h2>

      <div className="rdb-hist-summary">
        <div className="rdb-hs-card orders"><Calendar size={16} /><span className="rdb-hs-val">{loading ? '—' : totalO}</span><span className="rdb-hs-lbl">Orders</span></div>
        <div className="rdb-hs-card earn"><TrendingUp size={16} /><span className="rdb-hs-val">{loading ? '—' : `৳${totalE.toFixed(2)}`}</span><span className="rdb-hs-lbl">Earnings</span></div>
      </div>

      <div className="rdb-filter-row">
        {filters.map(f => <button key={f.id} className={`rdb-filter-btn ${df === f.id ? 'active' : ''}`} onClick={() => setDf(f.id)}>{f.label}</button>)}
      </div>

      {loading ? <div className="rdb-empty"><div className="rdb-ring" /><p>Loading…</p></div>
       : error  ? <div className="rdb-empty"><AlertCircle size={36} color="#ef4444" opacity={0.5} /><p style={{ color: '#ef4444' }}>{error}</p></div>
       : visible.length === 0 ? <div className="rdb-empty"><History size={44} strokeWidth={1} style={{ opacity: 0.2, marginBottom: 10 }} /><p>No deliveries in this period</p></div>
       : visible.map(g => (
          <div key={g.date} className="rdb-hist-group">
            <h3 className="rdb-hist-label">{g.label}<span className="rdb-hist-meta">{g.order_count} orders · ৳{g.total_earnings.toFixed(2)}</span></h3>
            {g.orders.map(o => {
              const cid = `${g.date}-${o.order_id}`;
              const open = expanded === cid;
              const ts = o.completed_at ? new Date(o.completed_at).toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';
              return (
                <div key={o.order_id} className="rdb-hist-card">
                  <div className="rdb-hc-row" onClick={() => setExpanded(open ? null : cid)}>
                    <div><p className="rdb-hc-id">#{o.order_id} · {ts}</p><p className="rdb-hc-rest">{o.restaurant_name}</p></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="rdb-hc-earn">৳{o.earnings.toFixed(2)}</span>
                      <ChevronRight size={14} style={{ transform: open ? 'rotate(90deg)' : 'none', transition: '0.18s', opacity: 0.4 }} />
                    </div>
                  </div>
                  <AnimatePresence>
                    {open && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="rdb-hc-detail">
                        <div className="rdb-pay-row header"><span>Your Earnings</span><span>৳{o.earnings.toFixed(2)}</span></div>
                        <div className="rdb-pay-row sub"><span>Order Total</span><span>৳{o.total_amount.toFixed(2)}</span></div>
                        <div className="rdb-pay-row sub"><span>Delivery (50%)</span><span>৳{(o.delivery_charge * 0.5).toFixed(2)}</span></div>
                        {o.rider_tip > 0 && <div className="rdb-pay-row tip"><span>Tip (50%)</span><span>৳{(o.rider_tip * 0.5).toFixed(2)}</span></div>}
                        <div className="rdb-pay-customer"><User size={12} /><span>{o.customer_name}</span><span className="rdb-pay-ts">{ts}</span></div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        ))
      }
    </motion.div>
  );
};

// ─── PROFILE TAB ──────────────────────────────────────────────────────────────
const ProfileTab = ({ rider }) => {
  const [section, setSection]       = useState('main');
  const [bankTab, setBankTab]       = useState('info');
  const [bankData, setBankData]     = useState({ bankName: '', bic: '', iban: '' });
  const [bankDocs, setBankDocs]     = useState({ front: null, back: null });
  const [editField, setEditField]   = useState(null);
  const [pd, setPd]                 = useState({ email: rider.email, phone: rider.phone, password: '••••••••••' });
  const initials = rider.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'RD';

  if (section === 'bank') return (
    <motion.div className="rdb-pane" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <button className="rdb-back" onClick={() => setSection('main')}><ChevronLeft size={16} /> Profile</button>
      <h2 className="rdb-title">Bank Details</h2>
      <div className="rdb-bank-tabs">
        <button className={`rdb-bank-tab ${bankTab === 'info' ? 'active' : ''}`} onClick={() => setBankTab('info')}>Information</button>
        <button className={`rdb-bank-tab ${bankTab === 'documents' ? 'active' : ''}`} onClick={() => setBankTab('documents')}>Documents</button>
      </div>
      {bankTab === 'info' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[{ key: 'bankName', label: 'Bank Name' }, { key: 'bic', label: 'BIC' }, { key: 'iban', label: 'IBAN' }].map(f => (
            <div key={f.key} className="rdb-bank-field">
              <label>{f.label} <span className="rdb-req">Required</span></label>
              <input value={bankData[f.key]} onChange={e => setBankData(p => ({ ...p, [f.key]: e.target.value }))} placeholder={`Enter ${f.label}`} />
            </div>
          ))}
          <button className="rdb-cta" onClick={() => setBankTab('documents')}>Continue</button>
          <button className="rdb-link-btn" onClick={() => setSection('main')}>Go back</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[{ key: 'front', label: 'Bank Receipt Front' }, { key: 'back', label: 'Bank Receipt Back' }].map(doc => (
            <div key={doc.key}>
              <div className="rdb-doc-hdr"><span className="rdb-doc-num">{doc.key === 'front' ? '1' : '2'}</span><span>{doc.label}</span><span className="rdb-req">Required</span></div>
              <label className="rdb-upload">
                <Upload size={20} style={{ opacity: 0.6 }} />
                <span className="rdb-upload-label">Upload document</span>
                <span className="rdb-upload-hint">png, pdf, jpg</span>
                {bankDocs[doc.key] && <span style={{ color: 'var(--success)', fontSize: 12, fontWeight: 700 }}><Check size={12} /> {bankDocs[doc.key].name}</span>}
                <input type="file" accept=".png,.pdf,.jpg,.jpeg" style={{ display: 'none' }} onChange={e => setBankDocs(p => ({ ...p, [doc.key]: e.target.files[0] }))} />
              </label>
            </div>
          ))}
          <button className="rdb-cta" onClick={() => { setSection('main'); toast.success('Bank details submitted!'); }}>Continue</button>
          <button className="rdb-link-btn" onClick={() => setBankTab('info')}>Go back</button>
        </div>
      )}
    </motion.div>
  );

  return (
    <motion.div className="rdb-pane" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <h2 className="rdb-title">My Profile</h2>
      <div className="rdb-profile-hero">
        <div className="rdb-profile-av">{initials}</div>
        <div><p className="rdb-profile-name">{rider.name}</p><p className="rdb-profile-meta">ID {rider.id} · {rider.vehicle}</p></div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {[{ key: 'license', label: 'Driver License', Icon: CreditCard }, { key: 'bank', label: 'Bank Details', Icon: DollarSign }, { key: 'id', label: 'ID Card', Icon: FileText }].map(({ key, label, Icon }) => (
          <button key={key} className="rdb-profile-row" onClick={() => setSection(key)}>
            <div className="rdb-pr-icon"><Icon size={15} /></div>
            <span>{label}</span>
            <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.35 }} />
          </button>
        ))}
      </div>

      <div className="rdb-info-box">
        <h3 className="rdb-info-title">Contact Information</h3>
        {[{ label: 'Email', key: 'email', Icon: Mail, editable: false }, { label: 'Password', key: 'password', Icon: Lock, editable: true }, { label: 'Phone', key: 'phone', Icon: Phone, editable: false }].map(f => (
          <div key={f.key} className="rdb-info-row">
            <div><label className="rdb-info-lbl">{f.label}</label>
              {editField === f.key
                ? <input className="rdb-info-input" autoFocus value={pd[f.key]} onChange={e => setPd(p => ({ ...p, [f.key]: e.target.value }))} onBlur={() => setEditField(null)} />
                : <p className="rdb-info-val" style={f.key !== 'password' ? { opacity: 0.6 } : {}}>{pd[f.key]}</p>
              }
            </div>
            {f.editable && <button className="rdb-edit-btn" onClick={() => setEditField(f.key)}><Edit2 size={12} /> Edit</button>}
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default RiderDashboard;