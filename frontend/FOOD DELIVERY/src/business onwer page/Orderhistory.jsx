import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ScrollText, TrendingUp, ShoppingBag, Bike, Clock,
  CheckCircle, ChevronDown, ChevronUp, BarChart2,
  ArrowUpRight, Star,
} from 'lucide-react';
import { COLORS } from '../constants.js';
import BusinessHeader from './BusinessHeader.jsx';
import './Orderhistory.css';

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const ALL_ORDERS = [
  {
    id: '#3276', orderId: 'z9y8-x7w6', customerName: 'Fatima Rahman', riderName: 'Karim',
    items: [{ name: 'Nasi Goreng', quantity: 2, price: 495 }, { name: 'Coleslaw', quantity: 1, price: 135 }],
    subtotal: 1125, deliveryFee: 50, serviceFee: 15, total: 1190,
    completedAt: new Date('2024-02-14T15:30:00'), status: 'Delivered',
  },
  {
    id: '#3275', orderId: 'p8o7-n6m5', customerName: 'Hassan Ali', riderName: 'Ibrahim',
    items: [{ name: 'BBQ Chicken Rice Bowl', quantity: 1, price: 315 }],
    subtotal: 315, deliveryFee: 40, serviceFee: 8, total: 363,
    completedAt: new Date('2024-02-14T14:15:00'), status: 'Delivered',
  },
  {
    id: '#3274', orderId: 'k5j4-i3h2', customerName: 'Ayesha Begum', riderName: 'Rashid',
    items: [{ name: 'Chicken Cashewnut Salad', quantity: 1, price: 387 }, { name: 'Mushroom Salad', quantity: 1, price: 405 }],
    subtotal: 792, deliveryFee: 60, serviceFee: 12, total: 864,
    completedAt: new Date('2024-02-13T18:45:00'), status: 'Delivered',
  },
  {
    id: '#3273', orderId: 'g2f1-e0d9', customerName: 'Tariq Mahmud', riderName: 'Salman',
    items: [{ name: 'Vegetable Letka Khichuri', quantity: 3, price: 198 }],
    subtotal: 594, deliveryFee: 50, serviceFee: 10, total: 654,
    completedAt: new Date('2024-02-13T12:20:00'), status: 'Delivered',
  },
  {
    id: '#3272', orderId: 'h7g6-f5e4', customerName: 'Nasrin Akter', riderName: 'Karim',
    items: [{ name: 'Beef Kacchi Biryani', quantity: 2, price: 420 }],
    subtotal: 840, deliveryFee: 60, serviceFee: 12, total: 912,
    completedAt: new Date('2024-02-12T20:10:00'), status: 'Delivered',
  },
];

const WEEKLY = [
  { day: 'Mon', orders: 12, revenue: 8400  },
  { day: 'Tue', orders: 18, revenue: 12600 },
  { day: 'Wed', orders: 15, revenue: 10500 },
  { day: 'Thu', orders: 22, revenue: 15400 },
  { day: 'Fri', orders: 28, revenue: 19600 },
  { day: 'Sat', orders: 35, revenue: 24500 },
  { day: 'Sun', orders: 24, revenue: 16800 },
];

const fmt = n => `৳${Number(n).toLocaleString('en-BD')}`;

const fmtDate = date => {
  const d = new Date(date);
  const now = new Date();
  const diff = Math.floor((now - d) / 86400000);
  if (diff === 0) return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// ─── STAT CARD ────────────────────────────────────────────────────────────────
const StatCard = ({ Icon, label, value, sub, color, bg, trend }) => (
  <motion.div className="oh-stat" whileHover={{ y: -3 }} transition={{ duration: 0.18 }}>
    <div className="oh-stat-icon" style={{ background: bg }}><Icon size={20} color={color} strokeWidth={2} /></div>
    <div className="oh-stat-body">
      <span className="oh-stat-label">{label}</span>
      <span className="oh-stat-value">{value}</span>
      {sub && <span className="oh-stat-sub">{sub}</span>}
    </div>
    {trend != null && (
      <span className="oh-stat-trend" style={{ color: trend >= 0 ? '#10b981' : '#ef4444' }}>
        <ArrowUpRight size={13} style={{ transform: trend < 0 ? 'rotate(90deg)' : 'none', verticalAlign: 'middle' }} />
        {Math.abs(trend)}%
      </span>
    )}
  </motion.div>
);

// ─── BAR CHART ────────────────────────────────────────────────────────────────
const BarChart = ({ data, metric }) => {
  const [hover, setHover] = useState(null);
  const max = Math.max(...data.map(d => d[metric]));
  return (
    <div className="oh-chart">
      {data.map((d, i) => {
        const isLast = i === data.length - 1;
        const isHov  = hover === i;
        return (
          <div key={d.day} className="oh-bar-col"
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            {isHov && (
              <div className="oh-tooltip">
                <span className="oh-tip-day">{d.day}</span>
                <span className="oh-tip-val">
                  {metric === 'orders' ? `${d[metric]} orders` : fmt(d[metric])}
                </span>
              </div>
            )}
            <div className="oh-bar-track">
              <motion.div className="oh-bar"
                initial={{ height: '0%' }}
                animate={{ height: `${(d[metric] / max) * 100}%` }}
                transition={{ duration: 0.55, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  background: (isLast || isHov) ? 'var(--gradient-primary)' : 'var(--gray-200)',
                  boxShadow: (isLast || isHov) ? 'var(--shadow-primary)' : 'none',
                  borderRadius: '6px 6px 0 0',
                }}
              />
            </div>
            <span className="oh-bar-label" style={{ fontWeight: isLast ? 800 : 500, color: isLast ? 'var(--primary)' : 'var(--gray-500)' }}>
              {d.day}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// ─── ORDER ROW (expandable) ───────────────────────────────────────────────────
const OrderRow = ({ order }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="oh-row">
      <div className="oh-row-main" onClick={() => setOpen(p => !p)}>
        <div className="oh-row-id-block">
          <div className="oh-row-avatar">{order.customerName[0]}</div>
          <div>
            <p className="oh-row-num">{order.id}</p>
            <p className="oh-row-code">{order.orderId}</p>
          </div>
        </div>
        <p className="oh-row-cust">{order.customerName}</p>
        <p className="oh-row-time"><Clock size={11} style={{ marginRight: 3, verticalAlign: 'middle' }} />{fmtDate(order.completedAt)}</p>
        <p className="oh-row-rider"><Bike size={11} style={{ marginRight: 3, verticalAlign: 'middle' }} />{order.riderName}</p>
        <p className="oh-row-total">{fmt(order.total)}</p>
        <span className="oh-row-status"><CheckCircle size={14} color="#10b981" /></span>
        <button className="oh-row-expand">{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden' }}>
            <div className="oh-row-detail">
              <div className="oh-detail-items">
                {order.items.map((item, i) => (
                  <div key={i} className="oh-detail-item">
                    <span className="oh-d-qty">{item.quantity}×</span>
                    <span className="oh-d-name">{item.name}</span>
                    <span className="oh-d-price">{fmt(item.price)}</span>
                  </div>
                ))}
              </div>
              <div className="oh-detail-totals">
                <div className="oh-d-row"><span>Subtotal</span><span>{fmt(order.subtotal)}</span></div>
                {order.deliveryFee > 0 && <div className="oh-d-row"><span>Delivery</span><span>{fmt(order.deliveryFee)}</span></div>}
                {order.serviceFee  > 0 && <div className="oh-d-row"><span>Service</span><span>{fmt(order.serviceFee)}</span></div>}
                <div className="oh-d-row final"><span>Total</span><span>{fmt(order.total)}</span></div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── MAIN ─────────────────────────────────────────────────────────────────────
const OrderHistory = ({ user, restaurant, onLogout, onNavigateToMenu, onNavigateToOrders }) => {
  const [dateFilter,   setDateFilter]   = useState('7days');
  const [chartMetric,  setChartMetric]  = useState('orders');

  const DATE_TABS = [
    { id: 'today',     label: 'Today'     },
    { id: 'yesterday', label: 'Yesterday' },
    { id: '7days',     label: '7 Days'    },
    { id: '30days',    label: '30 Days'   },
  ];

  const filtered = useMemo(() => {
    const now   = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yest  = new Date(today); yest.setDate(today.getDate() - 1);
    const d7    = new Date(today); d7.setDate(today.getDate() - 7);
    const d30   = new Date(today); d30.setDate(today.getDate() - 30);
    return ALL_ORDERS.filter(o => {
      const d = new Date(o.completedAt);
      if (dateFilter === 'today')     return d >= today;
      if (dateFilter === 'yesterday') return d >= yest && d < today;
      if (dateFilter === '7days')     return d >= d7;
      if (dateFilter === '30days')    return d >= d30;
      return true;
    });
  }, [dateFilter]);

  const totalRev = ALL_ORDERS.reduce((s, o) => s + o.total, 0);
  const totalOrd = ALL_ORDERS.length;
  const avgVal   = Math.round(totalRev / totalOrd);
  const riders   = new Set(ALL_ORDERS.map(o => o.riderName)).size;

  const STATS = [
    { Icon: TrendingUp,  label: 'Total Revenue',   value: fmt(totalRev), bg: 'var(--primary-bg)',  color: COLORS.primary, trend: 12 },
    { Icon: ShoppingBag, label: 'Completed Orders', value: totalOrd,      bg: '#f0fdf4',            color: '#10b981',      trend: 8  },
    { Icon: BarChart2,   label: 'Avg. Order Value', value: `৳${avgVal}`,  bg: '#fef3c7',            color: '#f59e0b',      trend: 3  },
    { Icon: Bike,        label: 'Active Riders',    value: riders,        bg: '#eef2ff',            color: '#6366f1',      trend: 0  },
  ];

  return (
    <div className="order-history-page">
      <BusinessHeader
        activePage="history"
        user={user} restaurant={restaurant} onLogout={onLogout}
        onNavigateToMenu={onNavigateToMenu}
        onNavigateToOrders={onNavigateToOrders}
        onNavigateToHistory={() => {}}
      />

      <div className="oh-page-body">

        {/* ── STATS ── */}
        <div className="oh-stats-grid">
          {STATS.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <StatCard {...s} />
            </motion.div>
          ))}
        </div>

        {/* ── ANALYTICS ROW ── */}
        <div className="oh-analytics-row">

          {/* Chart card */}
          <div className="oh-card oh-chart-card">
            <div className="oh-card-top">
              <div>
                <h2 className="oh-card-title">Weekly Performance</h2>
                <p className="oh-card-sub">Last 7 days overview</p>
              </div>
              <div className="oh-toggle-group">
                {['orders', 'revenue'].map(m => (
                  <button key={m} className={`oh-toggle ${chartMetric === m ? 'active' : ''}`}
                    onClick={() => setChartMetric(m)}>
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <BarChart data={WEEKLY} metric={chartMetric} />
            <div className="oh-chart-foot">
              {WEEKLY.map(d => (
                <div key={d.day} className="oh-foot-col">
                  <span className="oh-foot-day">{d.day}</span>
                  <span className="oh-foot-val">
                    {chartMetric === 'orders' ? d.orders : `৳${(d.revenue / 1000).toFixed(0)}k`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Side cards */}
          <div className="oh-side-col">

            {/* Live ops */}
            <div className="oh-card oh-liveops">
              <h3 className="oh-card-title">Live Ops Monitor</h3>
              <div className="oh-live-row">
                <span className="oh-live-dot" /><span className="oh-live-text">Operating normally</span>
              </div>
              <div className="oh-lm-grid">
                {[
                  { label: 'Avg. Prep Time',      val: '18 min',   },
                  { label: 'Delivery Success',     val: '98.2%',    highlight: true },
                  { label: 'Customer Rating',      val: '★ 4.8',   },
                  { label: 'Peak Hours',           val: '12–2 PM', },
                ].map(m => (
                  <div key={m.label} className="oh-lm-item">
                    <span className="oh-lm-label">{m.label}</span>
                    <span className={`oh-lm-val ${m.highlight ? 'success' : ''}`}>{m.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top items */}
            <div className="oh-card oh-topitems">
              <h3 className="oh-card-title">Top Items This Week</h3>
              {[
                { name: 'Chicken Cashewnut Salad', orders: 34, pct: 100 },
                { name: 'Nasi Goreng',              orders: 28, pct: 82  },
                { name: 'BBQ Chicken Rice Bowl',    orders: 22, pct: 65  },
              ].map((item, i) => (
                <div key={item.name} className="oh-top-item">
                  <span className="oh-top-rank">#{i + 1}</span>
                  <div className="oh-top-body">
                    <span className="oh-top-name">{item.name}</span>
                    <div className="oh-top-track">
                      <motion.div className="oh-top-fill"
                        initial={{ width: 0 }} animate={{ width: `${item.pct}%` }}
                        transition={{ duration: 0.6, delay: i * 0.1 }} />
                    </div>
                  </div>
                  <span className="oh-top-orders">{item.orders}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── ORDERS LIST ── */}
        <div className="oh-card oh-history-section">
          <div className="oh-card-top">
            <div>
              <h2 className="oh-card-title">Completed Orders</h2>
              <p className="oh-card-sub">Click any row to see breakdown</p>
            </div>
            <div className="oh-date-tabs">
              {DATE_TABS.map(({ id, label }) => (
                <button key={id}
                  className={`oh-date-tab ${dateFilter === id ? 'active' : ''}`}
                  onClick={() => setDateFilter(id)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Header row */}
          <div className="oh-list-head">
            <span>Order</span><span>Customer</span>
            <span>Time</span><span>Rider</span>
            <span>Total</span><span>Status</span><span></span>
          </div>

          <div className="oh-orders-wrap">
            <AnimatePresence>
              {filtered.length > 0
                ? filtered.map(o => <OrderRow key={o.id} order={o} />)
                : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="oh-empty">
                    <ScrollText size={52} color={COLORS.primary} strokeWidth={1} opacity={0.25} />
                    <p>No orders found for this period</p>
                  </motion.div>
                )}
            </AnimatePresence>
          </div>

          {filtered.length > 0 && (
            <div className="oh-list-foot">
              <span>{filtered.length} order{filtered.length !== 1 ? 's' : ''}</span>
              <span>Period revenue: <strong>{fmt(filtered.reduce((s, o) => s + o.total, 0))}</strong></span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default OrderHistory;