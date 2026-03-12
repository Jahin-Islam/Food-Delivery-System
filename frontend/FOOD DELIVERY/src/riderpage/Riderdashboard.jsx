import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle, Bike, MapPin, Clock, DollarSign, History,
  Wallet, User, Star, TrendingUp, Package, ChevronRight,
  ChevronLeft, LogOut, Bell, Filter, Calendar, ArrowRight,
  Upload, AlertCircle, Check, X, Phone, Mail, Lock,
  CreditCard, FileText, Shield, Edit2, Utensils
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { COLORS, BRAND } from '../constants.js';
import './Riderdashboard.css';
import './RiderDashboardExtra.css';
import RiderMap from './RiderMap.jsx';

// ─── MOCK DATA ────────────────────────────────────────────────────────────────

const MOCK_SHIFTS = [
  { id: 1, zone: 'Gulshan/Tejgaon', start: '08:00', end: '12:00', duration: '4h', date: 'Today',    type: 'available' },
  { id: 2, zone: 'Dhanmondi',       start: '10:00', end: '14:00', duration: '4h', date: 'Today',    type: 'available' },
  { id: 3, zone: 'Mirpur',          start: '14:00', end: '18:00', duration: '4h', date: 'Today',    type: 'available' },
  { id: 4, zone: 'Gulshan/Tejgaon', start: '18:00', end: '22:00', duration: '4h', date: 'Today',    type: 'available' },
  { id: 5, zone: 'Dhanmondi',       start: '20:00', end: '00:00', duration: '4h', date: 'Today',    type: 'swap'      },
  { id: 6, zone: 'Mirpur',          start: '22:00', end: '02:00', duration: '4h', date: 'Tomorrow', type: 'available' },
  { id: 7, zone: 'Chittagong',      start: '09:00', end: '13:00', duration: '4h', date: 'Tomorrow', type: 'available' },
];

const MOCK_ACTIVE_SHIFT = {
  id: 10, zone: 'Gulshan/Tejgaon',
  start: '14:00', end: '18:00', duration: '4h', date: 'Today'
};

const MOCK_ORDERS = [
  {
    id: 'ORD-6897', shortId: 't2iz-2apy',
    customer: { name: 'Fatima Rahman', phone: '01712345678' },
    restaurant: { name: 'Kutumbari Restora', address: '146, CDA Avenue, Wasa Mor', pickup: '6 mins' },
    delivery: { address: 'Zahur Ahmed Chowdhury Rd 18, Chittagong', time: '7 mins' },
    items: [{ name: 'Beef Kacchi Biryani', qty: 2 }, { name: 'Borhani', qty: 2 }],
    amount: 520,
    payment: 'Cash',
    status: 'new',
    timer: 84
  }
];

const MOCK_HISTORY = [
  {
    date: 'Today',
    shifts: [
      {
        id: 'SH-001', time: '11:15 – 13:49', zone: 'Gulshan',
        totalEarnings: 490, hoursWorked: '2h 35m', tips: 20,
        deliveries: 7, adjustment: 0,
        orders: [
          { id: 'o9ap-l7pm', completedAt: '13:32', amount: 72 },
          { id: 'w8ci-b3u5', completedAt: '12:46', amount: 68 },
          { id: 'w9px-yka6', completedAt: '12:35', amount: 75 },
          { id: 'v2jr-rv3s', completedAt: '12:14', amount: 65 },
          { id: 'y2zd-6epy', completedAt: '11:56', amount: 70 },
          { id: 'nov5-7n6r', completedAt: '11:26', amount: 60 },
          { id: 's4ki-d192', completedAt: '11:10', amount: 80 },
        ]
      },
      {
        id: 'SH-002', time: '17:41 – 20:37', zone: 'Dhanmondi',
        totalEarnings: 465, hoursWorked: '2h 56m', tips: 10,
        deliveries: 7, adjustment: 0,
        orders: [
          { id: 'a1bc-defg', completedAt: '20:22', amount: 65 },
          { id: 'h2ij-klmn', completedAt: '19:50', amount: 70 },
          { id: 'o3pq-rstu', completedAt: '19:15', amount: 68 },
          { id: 'v4wx-yz12', completedAt: '18:50', amount: 62 },
          { id: 'a5bc-3456', completedAt: '18:30', amount: 75 },
          { id: 'd6ef-7890', completedAt: '18:05', amount: 60 },
          { id: 'g7hi-jklm', completedAt: '17:50', amount: 65 },
        ]
      }
    ]
  },
  {
    date: 'Yesterday',
    shifts: [
      {
        id: 'SH-003', time: '11:15 – 14:14', zone: 'Mirpur',
        totalEarnings: 610, hoursWorked: '2h 60m', tips: 0,
        deliveries: 9, adjustment: 70,
        orders: []
      }
    ]
  }
];

const MOCK_COMPLETED_ORDERS = [
  { id: 'ORD-6891', shortId: 't2iz-abcd', customer: 'Hassan Ali',   amount: 380, tips: 20, completedAt: '13:32', zone: 'Gulshan'   },
  { id: 'ORD-6885', shortId: 'w8ci-efgh', customer: 'Ayesha Begum', amount: 290, tips: 10, completedAt: '12:46', zone: 'Dhanmondi' },
  { id: 'ORD-6880', shortId: 'v2jr-ijkl', customer: 'Tariq Mahmud', amount: 450, tips: 0,  completedAt: '11:56', zone: 'Mirpur'    },
];

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const RiderDashboard = ({ rider = {}, onLogout }) => {
  const riderData = {
    name:    rider.name    || 'Piyush Agarwal',
    id:      rider.id      || 'RD-9577690140',
    vehicle: rider.vehicle || 'Motorbike',
    phone:   rider.phone   || '01712345678',
    email:   rider.email   || 'rider@example.com',
    city:    rider.city    || 'Dhaka-Gulshan',
    rating:  4.8,
    totalReviews: 156,
  };

  const [activeTab,    setActiveTab]    = useState('status');
  const [isOnline,     setIsOnline]     = useState(false);
  const [orders,       setOrders]       = useState(MOCK_ORDERS);
  const [orderTab,     setOrderTab]     = useState('new');
  const [activeShift,  setActiveShift]  = useState(null);
  const [shiftStarted, setShiftStarted] = useState(false);
  const [walletBalance,setWalletBalance]= useState(1362);
  const [todayEarnings,setTodayEarnings]= useState(0);
  const [ordersToday,  setOrdersToday]  = useState(0);

  const newOrders       = orders.filter(o => o.status === 'new');
  const ongoingOrders   = orders.filter(o => o.status === 'ongoing' || o.status === 'picked_up');
  const completedOrders = orders.filter(o => o.status === 'completed');

  const handleToggleOnline = () => {
    if (!activeShift) { toast.error('Please book a shift first!'); return; }
    setIsOnline(p => !p);
    toast.success(isOnline ? 'You are now offline' : 'You are now online! Waiting for orders...');
  };

  const handleTakeShift = (shift) => {
    setActiveShift(shift);
    toast.success(`Shift booked: ${shift.zone} ${shift.start}–${shift.end}`);
  };

  const handleStartShift = () => {
    setShiftStarted(true);
    setIsOnline(true);
    toast.success('Shift started! You are now online.');
  };

  const handleAcceptOrder = (orderId) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'ongoing' } : o));
    setOrderTab('ongoing');
    toast.success('Order accepted! Head to the restaurant.');
  };

  const handleDeclineOrder = (orderId) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
    toast('Order declined', { icon: '❌' });
  };

  const handlePickedUp = (orderId) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'picked_up' } : o));
    toast.success('Order picked up! Delivering now.');
  };

  const handleDelivered = (orderId) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'completed', completedAt: new Date() } : o));
      setTodayEarnings(p => p + order.amount);
      setOrdersToday(p => p + 1);
      setWalletBalance(p => p + order.amount);
      setOrderTab('completed');
      toast.success(`✅ Delivered! ৳${order.amount} earned`);
    }
  };

  const initials = riderData.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const TABS = [
    { id: 'status',     Icon: CheckCircle, label: 'Status'     },
    { id: 'deliveries', Icon: Bike,        label: 'Deliveries' },
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

      {/* ── TOP HEADER (logo + right controls) ── */}
      <header className="rdb-header">
        <div className="rdb-header-top">
          {/* Logo */}
          <div className="rdb-logo-section">
            <div className="rdb-logo-icon">
              <Bike size={18} color={COLORS.primary} strokeWidth={2.5} />
            </div>
            <span className="rdb-logo-main">panda</span>
            <span className="rdb-logo-sub">rider</span>
          </div>

          {/* Right: status pill + avatar + logout */}
          <div className="rdb-header-right">
            <div className="rdb-status-pill" style={{ background: isOnline ? 'rgba(16,185,129,0.15)' : 'rgba(0,0,0,0.05)' }}>
              <div className={`rdb-status-dot ${isOnline ? 'online' : ''}`} />
              <span className="rdb-status-text">{isOnline ? 'Online' : 'Offline'}</span>
            </div>
            <div className="rdb-header-avatar" title={riderData.name}>{initials}</div>
            <button className="rdb-logout-btn" onClick={onLogout}>
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>

        {/* ── NAV TABS (like business dashboard) ── */}
        <nav className="rdb-nav-tabs">
          <div className="rdb-nav-tabs-inner">
            {TABS.map(({ id, Icon, label }) => (
              <button
                key={id}
                className={`rdb-nav-tab ${activeTab === id ? 'active' : ''}`}
                onClick={() => setActiveTab(id)}
              >
                <Icon size={16} strokeWidth={activeTab === id ? 2.5 : 1.8} />
                <span>{label}</span>
                {id === 'deliveries' && newOrders.length > 0 && (
                  <span className="rdb-tab-badge">{newOrders.length}</span>
                )}
              </button>
            ))}
          </div>
        </nav>
      </header>

      {/* ── STATS BAR ── */}
      <div className="rdb-stats-bar">
        <div className="rdb-stat">
          <span className="rdb-stat-label">Today's Earnings</span>
          <span className="rdb-stat-val" style={{ color: COLORS.success }}>৳{todayEarnings.toFixed(0)}</span>
        </div>
        <div className="rdb-stat">
          <span className="rdb-stat-label">Orders Today</span>
          <span className="rdb-stat-val" style={{ color: COLORS.primary }}>{ordersToday}</span>
        </div>
        <div className="rdb-stat">
          <span className="rdb-stat-label">Rating</span>
          <span className="rdb-stat-val" style={{ color: '#f59e0b' }}>⭐ {riderData.rating}</span>
        </div>
        <div className="rdb-stat">
          <span className="rdb-stat-label">Acceptance</span>
          <span className="rdb-stat-val">89%</span>
        </div>
      </div>

      {/* ── TAB CONTENT ── */}
      <div className="rdb-content">
        <AnimatePresence mode="wait">
          {activeTab === 'status' && (
            <StatusTab key="status"
              activeShift={activeShift} shiftStarted={shiftStarted}
              isOnline={isOnline}
              orders={orders}
              onTakeShift={handleTakeShift} onStartShift={handleStartShift}
              onToggleOnline={handleToggleOnline}
            />
          )}
          {activeTab === 'deliveries' && (
            <DeliveriesTab key="deliveries"
              newOrders={newOrders} ongoingOrders={ongoingOrders} completedOrders={completedOrders}
              orderTab={orderTab} setOrderTab={setOrderTab}
              onAccept={handleAcceptOrder} onDecline={handleDeclineOrder}
              onPickedUp={handlePickedUp} onDelivered={handleDelivered}
            />
          )}
          {activeTab === 'history' && <HistoryTab key="history" />}
          {activeTab === 'wallet'  && <WalletTab  key="wallet"  balance={walletBalance} />}
          {activeTab === 'profile' && <ProfileTab key="profile" rider={riderData} />}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ─── STATUS TAB ───────────────────────────────────────────────────────────────

const StatusTab = ({ activeShift, shiftStarted, isOnline, orders = [], onTakeShift, onStartShift, onToggleOnline }) => {
  const [showShifts,  setShowShifts]  = useState(!activeShift);
  const [filterZone,  setFilterZone]  = useState('all');
  const [selectedDay, setSelectedDay] = useState('Today');
  const [bookedShift, setBookedShift] = useState(activeShift);

  useEffect(() => { setBookedShift(activeShift); }, [activeShift]);

  const days = ['Mon 10', 'Tue 11', 'Wed 12', 'Thu 13', 'Fri 14', 'Sat 15', 'Sun 16'];
  const zones = ['all', 'Gulshan/Tejgaon', 'Dhanmondi', 'Mirpur', 'Chittagong'];

  const filteredShifts = MOCK_SHIFTS.filter(s =>
    (filterZone === 'all' || s.zone === filterZone) &&
    (selectedDay === 'Today' ? s.date === 'Today' : s.date === 'Tomorrow')
  );

  const handleTake = (shift) => {
    setBookedShift(shift);
    setShowShifts(false);
    onTakeShift(shift);
  };

  // Find active order for the map (ongoing or picked_up)
  const activeOrder = orders.find(o => o.status === 'ongoing' || o.status === 'picked_up') || null;

  return (
    <motion.div className="rdb-tab-pane" {...{ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -12 }, transition: { duration: 0.25 } }}>

      {/* ── Live Map ── */}
      <RiderMap order={activeOrder} isOnline={isOnline} />

      {bookedShift && (
        <div className="rdb-upcoming-shift">
          <div className="rdb-upcoming-header">
            <div>
              <span className="rdb-upcoming-badge">
                {shiftStarted ? '🟢 Active Shift' : '⏳ Upcoming Shift'}
              </span>
              <h3 className="rdb-upcoming-time">{bookedShift.start} – {bookedShift.end} ({bookedShift.duration})</h3>
              <p className="rdb-upcoming-zone">{bookedShift.zone} · {bookedShift.date}</p>
            </div>
            <div className="rdb-shift-date-box">
              <span className="rdb-shift-month">MAR</span>
              <span className="rdb-shift-day">14</span>
              <span className="rdb-shift-today">Today</span>
            </div>
          </div>
          <p className="rdb-upcoming-ready">Are you ready?</p>
          {!shiftStarted ? (
            <button className="rdb-start-shift-btn" onClick={onStartShift}>Start Shift Now</button>
          ) : (
            <div className="rdb-online-toggle-row">
              <span className="rdb-online-label">Available for deliveries</span>
              <button className={`rdb-toggle-switch-btn ${isOnline ? 'on' : ''}`} onClick={onToggleOnline}>
                <div className="rdb-toggle-thumb" />
              </button>
            </div>
          )}
          <div className="rdb-shift-extension">
            <span>Available for Shift Extension</span>
            <div className="rdb-ext-toggle">
              <div className="rdb-toggle-thumb" style={{ transform: 'translateX(0)' }} />
            </div>
          </div>
        </div>
      )}

      <div className="rdb-shifts-section">
        <div className="rdb-shifts-header" onClick={() => setShowShifts(p => !p)}>
          <h3>Available Shifts</h3>
          <button className="rdb-shifts-toggle-btn">
            {showShifts ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>

        {showShifts && (
          <>
            <div className="rdb-week-calendar">
              {days.map(d => {
                const isToday = d.includes('14');
                return (
                  <button key={d} className={`rdb-day-btn ${isToday ? 'active' : ''}`}
                    onClick={() => setSelectedDay(isToday ? 'Today' : 'Tomorrow')}>
                    <span className="rdb-day-name">{d.split(' ')[0]}</span>
                    <span className="rdb-day-num">{d.split(' ')[1]}</span>
                  </button>
                );
              })}
            </div>

            <div className="rdb-zone-filter">
              {zones.map(z => (
                <button key={z} className={`rdb-zone-btn ${filterZone === z ? 'active' : ''}`}
                  onClick={() => setFilterZone(z)}>
                  {z === 'all' ? 'All Zones' : z}
                </button>
              ))}
            </div>

            <p className="rdb-shifts-count">Available Shifts ({filteredShifts.length})</p>

            <div className="rdb-shifts-list">
              {filteredShifts.map(shift => (
                <div key={shift.id} className="rdb-shift-row">
                  <div className="rdb-shift-info">
                    <span className="rdb-shift-zone">{shift.zone}</span>
                    <span className="rdb-shift-time">{shift.start} – {shift.end} / {shift.duration}</span>
                  </div>
                  <button
                    className={`rdb-take-shift-btn ${shift.type === 'swap' ? 'swap' : ''} ${bookedShift?.id === shift.id ? 'booked' : ''}`}
                    onClick={() => handleTake(shift)}
                    disabled={bookedShift?.id === shift.id}>
                    {bookedShift?.id === shift.id ? '✓ Booked' : shift.type === 'swap' ? 'Take Swap' : 'Take Shift'}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};

// ─── DELIVERIES TAB ───────────────────────────────────────────────────────────

const DeliveriesTab = ({ newOrders, ongoingOrders, completedOrders, orderTab, setOrderTab, onAccept, onDecline, onPickedUp, onDelivered }) => {
  const tabs = [
    { id: 'new',       label: 'New',       count: newOrders.length       },
    { id: 'ongoing',   label: 'Ongoing',   count: ongoingOrders.length   },
    { id: 'completed', label: 'Completed', count: completedOrders.length },
  ];

  const current = orderTab === 'new' ? newOrders : orderTab === 'ongoing' ? ongoingOrders : completedOrders;

  return (
    <motion.div className="rdb-tab-pane" {...{ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -12 }, transition: { duration: 0.25 } }}>
      <div className="rdb-order-tabs">
        {tabs.map(t => (
          <button key={t.id} className={`rdb-order-tab ${orderTab === t.id ? 'active' : ''}`}
            onClick={() => setOrderTab(t.id)}>
            {t.label}
            {t.count > 0 && <span className="rdb-order-tab-badge">{t.count}</span>}
          </button>
        ))}
      </div>

      <div className="rdb-orders-list">
        {current.length === 0 ? (
          <div className="rdb-empty">
            <Bike size={56} color={COLORS.primary} opacity={0.3} strokeWidth={1} />
            <p>No {orderTab} orders</p>
            <span>
              {orderTab === 'new' ? 'New orders will appear here when you are online' :
               orderTab === 'ongoing' ? 'Accept an order to see it here' : 'Completed orders show here'}
            </span>
          </div>
        ) : (
          current.map(order => (
            order.status === 'new'       ? <NewOrderCard      key={order.id} order={order} onAccept={onAccept} onDecline={onDecline} /> :
            order.status === 'ongoing'   ? <OngoingOrderCard  key={order.id} order={order} onPickedUp={onPickedUp}                  /> :
            order.status === 'picked_up' ? <PickedUpCard      key={order.id} order={order} onDelivered={onDelivered}                /> :
                                           <CompletedCard     key={order.id} order={order}                                          />
          ))
        )}

        {orderTab === 'completed' && current.length === 0 && MOCK_COMPLETED_ORDERS.map(o => (
          <div key={o.id} className="rdb-completed-card">
            <div className="rdb-completed-left">
              <Check size={16} color={COLORS.success} />
              <div>
                <p className="rdb-completed-id">{o.id} <span className="rdb-completed-shortid">({o.shortId})</span></p>
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
    </motion.div>
  );
};

// ─── ORDER CARDS ──────────────────────────────────────────────────────────────

const NewOrderCard = ({ order, onAccept, onDecline }) => {
  const [timer, setTimer] = useState(order.timer || 84);
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
        <div>
          <p className="rdb-noc-id">{order.id} <span className="rdb-noc-shortid">({order.shortId})</span></p>
          <p className="rdb-noc-customer">{order.customer.name}</p>
        </div>
        <div className="rdb-noc-right">
          <span className="rdb-noc-amount">৳{order.amount}</span>
          <span className={`rdb-noc-timer ${timer < 20 ? 'urgent' : ''}`}>⏱ {mm}:{ss}</span>
        </div>
      </div>

      <div className="rdb-noc-locations">
        <div className="rdb-noc-loc-row">
          <div className="rdb-noc-loc-dot pickup" />
          <div>
            <p className="rdb-noc-loc-label">Pickup · {order.restaurant.pickup}</p>
            <p className="rdb-noc-loc-name">{order.restaurant.name}</p>
            <p className="rdb-noc-loc-addr">{order.restaurant.address}</p>
          </div>
        </div>
        <div className="rdb-noc-loc-line" />
        <div className="rdb-noc-loc-row">
          <div className="rdb-noc-loc-dot dropoff" />
          <div>
            <p className="rdb-noc-loc-label">Drop-off · {order.delivery.time}</p>
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
          <button className="rdb-btn-decline" onClick={() => onDecline(order.id)}>Decline</button>
          <button className="rdb-btn-accept"  onClick={() => onAccept(order.id)}>Accept Order</button>
        </div>
      </div>
    </div>
  );
};

const OngoingOrderCard = ({ order, onPickedUp }) => (
  <div className="rdb-ongoing-card">
    <div className="rdb-ongoing-header">
      <p className="rdb-ongoing-id">{order.id}</p>
      <span className="rdb-ongoing-badge preparing">🍳 Preparing</span>
    </div>
    <p className="rdb-ongoing-restaurant">{order.restaurant?.name}</p>
    <p className="rdb-ongoing-addr">{order.restaurant?.address}</p>
    <div className="rdb-ongoing-status-bar">
      <div className="rdb-status-step done"><Check size={12} /> Order Placed</div>
      <div className="rdb-status-step active pulse"><Utensils size={12} /> Preparing</div>
      <div className="rdb-status-step"><Bike size={12} /> Picked Up</div>
      <div className="rdb-status-step"><MapPin size={12} /> Delivered</div>
    </div>
    <button className="rdb-pickup-btn" onClick={() => onPickedUp(order.id)}>
      <Package size={16} /> Picked Up — Head to Customer
    </button>
  </div>
);

const PickedUpCard = ({ order, onDelivered }) => (
  <div className="rdb-ongoing-card delivering">
    <div className="rdb-ongoing-header">
      <p className="rdb-ongoing-id">{order.id}</p>
      <span className="rdb-ongoing-badge delivering">🚴 Delivering</span>
    </div>
    <p className="rdb-ongoing-restaurant">{order.customer?.name}</p>
    <p className="rdb-ongoing-addr">{order.delivery?.address}</p>
    <div className="rdb-ongoing-status-bar">
      <div className="rdb-status-step done"><Check size={12} /> Order Placed</div>
      <div className="rdb-status-step done"><Check size={12} /> Preparing</div>
      <div className="rdb-status-step done"><Check size={12} /> Picked Up</div>
      <div className="rdb-status-step active pulse"><MapPin size={12} /> Delivering</div>
    </div>
    <button className="rdb-deliver-btn" onClick={() => onDelivered(order.id)}>
      <CheckCircle size={16} /> Dropped Off — Order Complete
    </button>
  </div>
);

const CompletedCard = ({ order }) => (
  <div className="rdb-completed-card">
    <div className="rdb-completed-left">
      <Check size={16} color={COLORS.success} />
      <div>
        <p className="rdb-completed-id">{order.id}</p>
        <p className="rdb-completed-customer">{order.customer?.name} · Just now</p>
      </div>
    </div>
    <span className="rdb-completed-amt">৳{order.amount}</span>
  </div>
);

// ─── HISTORY TAB ─────────────────────────────────────────────────────────────

const HistoryTab = () => {
  const [dateFilter,    setDateFilter]    = useState('today');
  const [expandedShift, setExpandedShift] = useState(null);

  const dateFilters = [
    { id: 'today',     label: 'Today'     },
    { id: 'yesterday', label: 'Yesterday' },
    { id: '7days',     label: '7 Days'    },
    { id: '30days',    label: '30 Days'   },
  ];

  const visible = dateFilter === 'today' ? MOCK_HISTORY.filter(g => g.date === 'Today') :
                  dateFilter === 'yesterday' ? MOCK_HISTORY.filter(g => g.date === 'Yesterday') :
                  MOCK_HISTORY;

  return (
    <motion.div className="rdb-tab-pane" {...{ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -12 }, transition: { duration: 0.25 } }}>
      <h2 className="rdb-section-title">Order History</h2>

      <div className="rdb-hist-summary">
        <div className="rdb-hist-stat">
          <Calendar size={18} color={COLORS.primary} />
          <span className="rdb-hist-stat-num">7</span>
          <span className="rdb-hist-stat-label">Orders</span>
        </div>
        <div className="rdb-hist-stat">
          <DollarSign size={18} color={COLORS.success} />
          <span className="rdb-hist-stat-num">৳14.29</span>
          <span className="rdb-hist-stat-label">Earnings</span>
        </div>
        <div className="rdb-hist-stat tips-active">
          <Star size={18} color="#f59e0b" />
          <span className="rdb-hist-stat-num tips">৳2.00</span>
          <span className="rdb-hist-stat-label">Tips</span>
        </div>
      </div>

      <div className="rdb-date-filters">
        {dateFilters.map(f => (
          <button key={f.id} className={`rdb-date-filter-btn ${dateFilter === f.id ? 'active' : ''}`}
            onClick={() => setDateFilter(f.id)}>{f.label}</button>
        ))}
      </div>

      {visible.map(group => (
        <div key={group.date} className="rdb-hist-group">
          <h3 className="rdb-hist-date">{group.date}</h3>
          {group.shifts.map(shift => (
            <div key={shift.id} className="rdb-shift-history-card">
              <div className="rdb-shc-header" onClick={() => setExpandedShift(expandedShift === shift.id ? null : shift.id)}>
                <div>
                  <p className="rdb-shc-time">{shift.time}</p>
                  <p className="rdb-shc-zone">{shift.zone}</p>
                </div>
                <div className="rdb-shc-right">
                  <span className="rdb-shc-total">৳{shift.totalEarnings}</span>
                  <ChevronRight size={16} style={{ transform: expandedShift === shift.id ? 'rotate(90deg)' : 'rotate(0deg)', transition: '0.2s' }} />
                </div>
              </div>

              {expandedShift === shift.id && (
                <div className="rdb-shc-breakdown">
                  <div className="rdb-pay-row header">
                    <span>Total Earnings:</span>
                    <span>৳{shift.totalEarnings}</span>
                  </div>
                  <div className="rdb-pay-row">
                    <span className="rdb-pay-time">{shift.time}</span>
                    <span>৳{shift.totalEarnings}</span>
                  </div>
                  <div className="rdb-pay-row sub"><span>Hours worked ({shift.hoursWorked})</span><span>৳0.00</span></div>
                  {shift.tips > 0 && <div className="rdb-pay-row sub tips"><span>Tips</span><span>৳{shift.tips}.00</span></div>}
                  <div className="rdb-pay-row sub deliveries"><span>Deliveries ({shift.deliveries})</span><span>৳{shift.totalEarnings - shift.tips}</span></div>
                  {shift.adjustment > 0 && (
                    <>
                      <div className="rdb-pay-row adjustment"><span>Adjustment</span><span>৳{shift.adjustment}.00</span></div>
                      <div className="rdb-pay-row sub"><span>Fee Adjustment</span><span>৳{shift.adjustment}.00</span></div>
                    </>
                  )}
                  {shift.orders.length > 0 && (
                    <div className="rdb-pay-orders">
                      {shift.orders.map(o => (
                        <div key={o.id} className="rdb-pay-order-row">
                          <span className="rdb-pay-order-icon">📦</span>
                          <span className="rdb-pay-order-id">{o.id}</span>
                          <span className="rdb-pay-order-time">{o.completedAt}</span>
                          <span className="rdb-pay-order-amt">৳{o.amount}</span>
                        </div>
                      ))}
                    </div>
                  )}
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

  const handlePayout = () => {
    setShowPayout(false);
    toast.success('Payout request submitted!');
  };

  return (
    <motion.div className="rdb-tab-pane" {...{ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -12 }, transition: { duration: 0.25 } }}>
      <h2 className="rdb-section-title">Wallet</h2>

      <div className="rdb-wallet-card">
        <p className="rdb-wallet-label">Current balance</p>
        <p className="rdb-wallet-balance">৳{(balance / 100).toFixed(2)}</p>
        <button className="rdb-payout-btn" onClick={() => setShowPayout(true)}>
          💸 Payout
        </button>
      </div>

      <div className="rdb-earning-cards">
        <div className="rdb-earning-card received">
          <p className="rdb-ec-label">Amount Received</p>
          <p className="rdb-ec-amount">৳97.05</p>
          <p className="rdb-ec-sub">This week</p>
        </div>
        <div className="rdb-earning-card pending">
          <p className="rdb-ec-label">Pending</p>
          <p className="rdb-ec-amount">৳67.05</p>
          <p className="rdb-ec-sub">Processing</p>
        </div>
        <div className="rdb-earning-card lifetime">
          <p className="rdb-ec-label">Lifetime</p>
          <p className="rdb-ec-amount">৳164.10</p>
          <p className="rdb-ec-sub">10 orders total</p>
        </div>
      </div>

      <div className="rdb-cash-return-banner">
        <AlertCircle size={16} color="#dc2626" />
        <span>Cash to return to office: <strong>৳761.40</strong></span>
      </div>

      {showPayout && (
        <div className="rdb-modal-overlay" onClick={() => setShowPayout(false)}>
          <div className="rdb-modal" onClick={e => e.stopPropagation()}>
            <h3>Request Payout</h3>
            <p>Available balance: <strong>৳{(balance / 100).toFixed(2)}</strong></p>
            <p className="rdb-modal-sub">Funds will be transferred to your registered bank account within 1–2 business days.</p>
            <div className="rdb-modal-actions">
              <button className="rdb-modal-cancel" onClick={() => setShowPayout(false)}>Cancel</button>
              <button className="rdb-modal-confirm" onClick={handlePayout}>Confirm Payout</button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

// ─── PROFILE TAB ─────────────────────────────────────────────────────────────

const ProfileTab = ({ rider }) => {
  const [section, setSection] = useState('main');
  const [bankTab, setBankTab] = useState('info');
  const [bankData, setBankData] = useState({ bankName: '', bic: '', iban: '' });
  const [bankDocs, setBankDocs] = useState({ front: null, back: null });
  const [showReview, setShowReview] = useState(false);
  const [editField, setEditField] = useState(null);
  const [profileData, setProfileData] = useState({
    email:    rider.email,
    phone:    rider.phone,
    password: '••••••••••',
  });

  const initials = rider.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  if (section === 'bank') {
    if (showReview) return (
      <motion.div className="rdb-tab-pane" {...{ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.25 } }}>
        <button className="rdb-back-btn" onClick={() => setShowReview(false)}><ChevronLeft size={18} /> Bank Details</button>
        <div className="rdb-review-card">
          <Shield size={40} color={COLORS.primary} />
          <h3>Prepare for a review</h3>
          <p>To update your profile details, information that you will submit will be checked to make sure that it's correct.</p>
          <ul className="rdb-review-list">
            <li><FileText size={14} /> Be ready to upload documents to prove the change.</li>
            <li><Bell size={14} /> You will receive a notification about the outcome once it's finished.</li>
            <li><Lock size={14} /> All information will be securely transmitted.</li>
          </ul>
          <button className="rdb-get-started-btn" onClick={() => { setShowReview(false); setBankTab('info'); }}>Get started</button>
          <button className="rdb-cancel-link" onClick={() => { setSection('main'); setShowReview(false); }}>Cancel</button>
        </div>
      </motion.div>
    );

    return (
      <motion.div className="rdb-tab-pane" {...{ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.25 } }}>
        <button className="rdb-back-btn" onClick={() => setSection('main')}><ChevronLeft size={18} /> My Profile</button>
        <h2 className="rdb-section-title">Edit bank details</h2>

        <div className="rdb-bank-tabs">
          <button className={`rdb-bank-tab ${bankTab === 'info' ? 'active' : ''}`} onClick={() => setBankTab('info')}>Information</button>
          <button className={`rdb-bank-tab ${bankTab === 'documents' ? 'active' : ''}`} onClick={() => setBankTab('documents')}>Documents</button>
        </div>

        {bankTab === 'info' ? (
          <div className="rdb-bank-form">
            {[{ key: 'bankName', label: 'Bank Name' }, { key: 'bic', label: 'BIC' }, { key: 'iban', label: 'IBAN' }].map(f => (
              <div key={f.key} className="rdb-bank-field">
                <label>{f.label} <span className="rdb-required">Required</span></label>
                <input value={bankData[f.key]} onChange={e => setBankData(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={`Enter ${f.label}`} />
              </div>
            ))}
            <button className="rdb-continue-btn" onClick={() => setBankTab('documents')}>Continue</button>
            <button className="rdb-go-back-link" onClick={() => setSection('main')}>Go back</button>
          </div>
        ) : (
          <div className="rdb-bank-form">
            <h4 className="rdb-docs-title">Documents</h4>
            {[
              { key: 'front', label: 'Bank Receipt Front' },
              { key: 'back',  label: 'Bank Receipt Back'  },
            ].map(doc => (
              <div key={doc.key} className="rdb-doc-upload">
                <div className="rdb-doc-header">
                  <span className="rdb-doc-num">{doc.key === 'front' ? '1' : '2'}</span>
                  <span>{doc.label}</span>
                  <span className="rdb-required">Required</span>
                </div>
                <label className="rdb-upload-area">
                  <Upload size={24} color={COLORS.primary} />
                  <span className="rdb-upload-label">Upload documents</span>
                  <span className="rdb-upload-hint">Accepted formats: png, pdf, jpg</span>
                  {bankDocs[doc.key] && <span className="rdb-upload-done">✓ {bankDocs[doc.key].name}</span>}
                  <input type="file" accept=".png,.pdf,.jpg,.jpeg" style={{ display: 'none' }}
                    onChange={e => setBankDocs(p => ({ ...p, [doc.key]: e.target.files[0] }))} />
                </label>
              </div>
            ))}
            <button className="rdb-continue-btn" onClick={() => { setSection('main'); toast.success('Bank details submitted for review!'); }}>Continue</button>
            <button className="rdb-go-back-link" onClick={() => setBankTab('info')}>Go back</button>
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div className="rdb-tab-pane" {...{ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -12 }, transition: { duration: 0.25 } }}>
      <h2 className="rdb-section-title">My Profile</h2>

      <div className="rdb-profile-hero">
        <div className="rdb-profile-avatar">{initials}</div>
        <div>
          <p className="rdb-profile-name">{rider.name}</p>
          <p className="rdb-profile-id">ID {rider.id}</p>
        </div>
      </div>

      <div className="rdb-profile-sections">
        {[
          { key: 'license', label: 'Driver license', Icon: CreditCard },
          { key: 'bank',    label: 'Bank details',   Icon: DollarSign  },
          { key: 'id',      label: 'Id card',         Icon: FileText   },
        ].map(({ key, label, Icon }) => (
          <button key={key} className="rdb-profile-section-btn" onClick={() => setSection(key)}>
            <Icon size={18} color={COLORS.primary} />
            <span>{label}</span>
            <span className="rdb-profile-view">View</span>
            <ChevronRight size={16} color="var(--c-gray-400)" />
          </button>
        ))}
      </div>

      <div className="rdb-profile-info">
        <h3>Other information</h3>
        {[
          { label: 'Email',        key: 'email',    Icon: Mail,  editable: false },
          { label: 'Password',     key: 'password', Icon: Lock,  editable: true  },
          { label: 'Phone number', key: 'phone',    Icon: Phone, editable: false },
        ].map(f => (
          <div key={f.key} className="rdb-info-row">
            <div className="rdb-info-field">
              <label>{f.label}</label>
              {editField === f.key ? (
                <input autoFocus value={profileData[f.key]}
                  onChange={e => setProfileData(p => ({ ...p, [f.key]: e.target.value }))}
                  onBlur={() => setEditField(null)} />
              ) : (
                <p className={f.key === 'email' || f.key === 'phone' ? 'rdb-info-obscured' : ''}>{profileData[f.key]}</p>
              )}
            </div>
            {f.editable && (
              <button className="rdb-edit-btn" onClick={() => setEditField(f.key)}>
                <Edit2 size={14} /> Edit
              </button>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default RiderDashboard;