import { useState, useEffect, useCallback } from 'react';
import {
  Clock, Package, CheckCircle, XCircle,
  ChevronDown, ChevronUp, Search, Filter,
  TrendingUp, ShoppingBag, AlertCircle,
} from 'lucide-react';
import authService from '../Authservice.js';
import BusinessHeader from './BusinessHeader.jsx';
import './Businessdashboard.css';
import './BusinessHeader.css';

// ─── Constants ────────────────────────────────────────────────────────────────
const BASE = 'http://127.0.0.1:8000/api';
const HISTORY_URL      = `${BASE}/vendor/order-history/`;
const HISTORY_ITEM_URL = (id) => `${BASE}/vendor/order-history/${id}/`;

const STATUS_STYLES = {
  DELIVERED: { bg: '#d1fae5', color: '#065f46', label: 'Delivered', Icon: CheckCircle },
  CANCELLED: { bg: '#fee2e2', color: '#991b1b', label: 'Cancelled', Icon: XCircle },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (val) =>
  val != null ? `৳${Number(val).toFixed(2)}` : '—';

const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, color }) => (
  <div style={{
    background: 'var(--white)',
    border: '1.5px solid var(--gray-200)',
    borderRadius: 14,
    padding: '18px 22px',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    flex: '1 1 180px',
    minWidth: 0,
  }}>
    <div style={{
      width: 44, height: 44, borderRadius: 12,
      background: color + '22',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <Icon size={22} color={color} />
    </div>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--gray-900)', whiteSpace: 'nowrap' }}>{value}</div>
    </div>
  </div>
);

// ─── Order Row ────────────────────────────────────────────────────────────────
const OrderRow = ({ order }) => {
  const [expanded, setExpanded] = useState(false);
  const [items, setItems]       = useState(null);
  const [loadingItems, setLoadingItems] = useState(false);

  const style = STATUS_STYLES[order.status] ?? STATUS_STYLES.DELIVERED;
  const { Icon } = style;

  const handleExpand = async () => {
    if (!expanded && items === null) {
      setLoadingItems(true);
      try {
        const data = await authService.authenticatedFetch(HISTORY_ITEM_URL(order.order_id));
        setItems(data?.items ?? []);
      } catch {
        setItems([]);
      } finally {
        setLoadingItems(false);
      }
    }
    setExpanded(p => !p);
  };

  return (
    <div style={{
      border: '1.5px solid var(--gray-200)',
      borderRadius: 12,
      background: 'var(--white)',
      overflow: 'hidden',
      transition: 'box-shadow 0.2s',
    }}>
      {/* ── Summary row ── */}
      <button
        onClick={handleExpand}
        style={{
          width: '100%', background: 'none', border: 'none',
          padding: '16px 20px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 16,
          textAlign: 'left', fontFamily: 'var(--font)',
        }}
      >
        {/* Status icon */}
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: style.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={18} color={style.color} />
        </div>

        {/* Order ID + date */}
        <div style={{ flex: '0 0 auto', minWidth: 110 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-900)' }}>
            #{order.order_id}
          </div>
          <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 2 }}>
            {fmtDate(order.created_at)}
          </div>
        </div>

        {/* Customer name */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-800)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {[order.first_name, order.last_name].filter(Boolean).join(' ') || 'Guest'}
          </div>
          {order.delivery_address && (
            <div style={{ fontSize: 11, color: 'var(--gray-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
              {order.delivery_address}{order.delivery_city ? `, ${order.delivery_city}` : ''}
            </div>
          )}
        </div>

        {/* Items count */}
        <div style={{ flex: '0 0 auto', textAlign: 'center', minWidth: 60 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-800)' }}>{order.total_quantity ?? order.item_count ?? '—'}</div>
          <div style={{ fontSize: 10, color: 'var(--gray-400)', marginTop: 1 }}>items</div>
        </div>

        {/* Total */}
        <div style={{ flex: '0 0 auto', textAlign: 'right', minWidth: 90 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--primary)' }}>{fmt(order.total_amount)}</div>
          <span style={{
            display: 'inline-block', marginTop: 3,
            padding: '2px 8px', borderRadius: 999,
            fontSize: 10, fontWeight: 700,
            background: style.bg, color: style.color,
          }}>
            {style.label}
          </span>
        </div>

        {/* Chevron */}
        <div style={{ color: 'var(--gray-400)', flexShrink: 0 }}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* ── Expanded detail ── */}
      {expanded && (
        <div style={{
          borderTop: '1px solid var(--gray-200)',
          padding: '16px 20px',
          background: 'var(--gray-50)',
        }}>
          {loadingItems ? (
            <div style={{ textAlign: 'center', padding: '12px 0', color: 'var(--gray-400)', fontSize: 13 }}>
              Loading items…
            </div>
          ) : (
            <>
              {/* Items list */}
              {items && items.length > 0 ? (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>
                    Items Ordered
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {items.map((item, i) => (
                      <div key={item.id ?? i} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 12px', background: 'var(--white)',
                        borderRadius: 8, border: '1px solid var(--gray-200)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{
                            width: 22, height: 22, borderRadius: 6,
                            background: 'var(--primary-bg)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 700, color: 'var(--primary)',
                          }}>
                            {item.quantity}×
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-800)' }}>
                            {item.item_name ?? `Item #${item.food_id}`}
                          </span>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-700)' }}>
                          {fmt(item.price_at_purchase * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: 13, color: 'var(--gray-400)', marginBottom: 16 }}>No item details available.</p>
              )}

              {/* Charges breakdown */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: 8,
              }}>
                {[
                  { label: 'Subtotal',       value: fmt(order.total_amount) },
                  { label: 'Delivery Charge', value: fmt(order.delivery_charge) },
                  { label: 'Discount',        value: order.discount_amount ? `-${fmt(order.discount_amount)}` : '—' },
                  { label: 'Service Charge',  value: fmt(order.service_charge) },
                  { label: 'Rider Tip',       value: fmt(order.rider_tip) },
                  { label: 'Delivered At',    value: fmtDate(order.delivered_at) },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-700)' }}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Contact */}
              {(order.email || order.phone_number) && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--gray-200)', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  {order.email && (
                    <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                      <span style={{ fontWeight: 700 }}>Email: </span>{order.email}
                    </div>
                  )}
                  {order.phone_number && (
                    <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                      <span style={{ fontWeight: 700 }}>Phone: </span>{order.phone_number}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const OrderHistory = ({
  restaurant,
  user,
  isLoggedIn,
  onLogout,
  onNavigateToMenu,
  onNavigateToOrders,
  onNavigateToProfile,
  isDark = false,
  onToggleTheme,
}) => {
  const [history,    setHistory]    = useState([]);
  const [stats,      setStats]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState(''); 
  const [dateFrom,     setDateFrom]     = useState('');
  const [dateTo,       setDateTo]       = useState('');
  const [searchQuery,  setSearchQuery]  = useState('');

  // Pagination
  const [offset, setOffset] = useState(0);
  const [total,  setTotal]  = useState(0);
  const LIMIT = 20;

  const fetchHistory = useCallback(async (newOffset = 0) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: LIMIT, offset: newOffset });
      if (statusFilter) params.set('status', statusFilter);
      if (dateFrom)     params.set('date_from', dateFrom);
      if (dateTo)       params.set('date_to', dateTo);

      const url = `${HISTORY_URL}?${params.toString()}`;
      const data = await authService.authenticatedFetch(url);

      setStats(data.stats);
      setHistory(data.history?.orders ?? []);
      setTotal(data.history?.count ?? 0);
      setOffset(newOffset);
    } catch (e) {
      setError(e.message ?? 'Failed to load order history.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateFrom, dateTo]);

  useEffect(() => { fetchHistory(0); }, [fetchHistory]);

  // Client-side search filter on already-fetched orders
  const filteredHistory = searchQuery.trim()
    ? history.filter(o => {
        const q = searchQuery.toLowerCase();
        const name = [o.first_name, o.last_name].join(' ').toLowerCase();
        return (
          String(o.order_id).includes(q) ||
          name.includes(q) ||
          (o.email ?? '').toLowerCase().includes(q) ||
          (o.phone_number ?? '').includes(q)
        );
      })
    : history;

  const handleApplyFilters = () => fetchHistory(0);
  const handleClearFilters = () => {
    setStatusFilter('');
    setDateFrom('');
    setDateTo('');
    setSearchQuery('');
  };

  // ── Layout constants ──
  const inputStyle = {
    padding: '8px 12px', borderRadius: 8,
    border: '1.5px solid var(--gray-200)',
    background: 'var(--white)', color: 'var(--gray-800)',
    fontSize: 13, fontFamily: 'var(--font)', outline: 'none',
    width: '100%', boxSizing: 'border-box',
  };

  return (
    <div className="business-dashboard">
      <BusinessHeader
        activePage="history"
        user={user}
        restaurant={restaurant}
        onLogout={onLogout}
        onNavigateToMenu={onNavigateToMenu     ?? (() => {})}
        onNavigateToOrders={onNavigateToOrders ?? (() => {})}
        onNavigateToHistory={() => {}}
        onNavigateToProfile={onNavigateToProfile ?? (() => {})}
        isDark={isDark}
        onToggleTheme={onToggleTheme}
      />

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 20px 60px' }}>

        {/* ── Page Title ── */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--gray-900)', margin: 0 }}>
            Order History
          </h1>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 4 }}>
            All delivered and cancelled orders for {restaurant?.name ?? 'your restaurant'}
          </p>
        </div>

        {/* ── Stats ── */}
        {stats && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
            <StatCard icon={Package}      label="Total Orders"    value={stats.total_orders}                         color="var(--primary)" />
            <StatCard icon={CheckCircle}  label="Delivered"       value={stats.delivered_count}                      color="#10b981" />
            <StatCard icon={XCircle}      label="Cancelled"       value={stats.cancelled_count}                      color="#ef4444" />
            <StatCard icon={TrendingUp}   label="Total Revenue"   value={`৳${Number(stats.total_revenue).toFixed(0)}`}  color="#f59e0b" />
            <StatCard icon={ShoppingBag}  label="Avg Order Value" value={`৳${Number(stats.avg_order_value).toFixed(0)}`} color="#8b5cf6" />
          </div>
        )}

        {/* ── Filters ── */}
        <div style={{
          background: 'var(--white)', border: '1.5px solid var(--gray-200)',
          borderRadius: 14, padding: '16px 20px', marginBottom: 20,
          display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end',
        }}>
          {/* Search */}
          <div style={{ flex: '1 1 200px', minWidth: 0 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-500)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Search</label>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
              <input
                type="text"
                placeholder="Order ID, name, email…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ ...inputStyle, paddingLeft: 30 }}
              />
            </div>
          </div>

          {/* Status */}
          <div style={{ flex: '0 0 150px' }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-500)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Status</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={inputStyle}>
              <option value="">All</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Date From */}
          <div style={{ flex: '0 0 140px' }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-500)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.3px' }}>From</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inputStyle} />
          </div>

          {/* Date To */}
          <div style={{ flex: '0 0 140px' }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-500)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.3px' }}>To</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inputStyle} />
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button
              onClick={handleApplyFilters}
              style={{
                padding: '9px 16px', borderRadius: 8, border: 'none',
                background: 'var(--primary)', color: '#fff',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font)',
              }}
            >
              <Filter size={14} /> Apply
            </button>
            <button
              onClick={handleClearFilters}
              style={{
                padding: '9px 14px', borderRadius: 8,
                border: '1.5px solid var(--gray-200)',
                background: 'var(--white)', color: 'var(--gray-600)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
              }}
            >
              Clear
            </button>
          </div>
        </div>

        {/* ── Results count ── */}
        {!loading && !error && (
          <div style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 12, fontWeight: 500 }}>
            Showing {filteredHistory.length} of {total} order{total !== 1 ? 's' : ''}
            {(statusFilter || dateFrom || dateTo) && ' (filtered)'}
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{
              width: 44, height: 44, border: '3px solid var(--primary-light)',
              borderTopColor: 'var(--primary)', borderRadius: '50%',
              margin: '0 auto 16px', animation: 'spin 0.8s linear infinite',
            }} />
            <p style={{ color: 'var(--gray-400)', fontSize: 14 }}>Loading order history…</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* ── Error ── */}
        {!loading && error && (
          <div style={{
            background: '#fee2e2', border: '1.5px solid #fecaca',
            borderRadius: 12, padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: 12,
            color: '#991b1b', fontSize: 14, fontWeight: 600,
          }}>
            <AlertCircle size={18} />
            {error}
            <button
              onClick={() => fetchHistory(0)}
              style={{ marginLeft: 'auto', padding: '6px 14px', borderRadius: 7, border: 'none',
                background: '#dc2626', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && !error && filteredHistory.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--gray-400)' }}>
            <Clock size={52} style={{ opacity: 0.3, marginBottom: 16 }} />
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--gray-600)', marginBottom: 6 }}>No order history yet</p>
            <p style={{ fontSize: 13 }}>
              {searchQuery || statusFilter || dateFrom || dateTo
                ? 'No orders match your filters. Try adjusting them.'
                : 'Completed and cancelled orders will appear here.'}
            </p>
          </div>
        )}

        {/* ── Order list ── */}
        {!loading && !error && filteredHistory.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredHistory.map(order => (
              <OrderRow key={order.order_id} order={order} />
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {!loading && !error && total > LIMIT && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 28 }}>
            <button
              disabled={offset === 0}
              onClick={() => fetchHistory(Math.max(0, offset - LIMIT))}
              style={{
                padding: '8px 20px', borderRadius: 8,
                border: '1.5px solid var(--gray-200)',
                background: offset === 0 ? 'var(--gray-100)' : 'var(--white)',
                color: offset === 0 ? 'var(--gray-400)' : 'var(--gray-700)',
                fontWeight: 600, fontSize: 13, cursor: offset === 0 ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font)',
              }}
            >
              ← Previous
            </button>
            <span style={{ fontSize: 13, color: 'var(--gray-500)', fontWeight: 500 }}>
              {offset + 1}–{Math.min(offset + LIMIT, total)} of {total}
            </span>
            <button
              disabled={offset + LIMIT >= total}
              onClick={() => fetchHistory(offset + LIMIT)}
              style={{
                padding: '8px 20px', borderRadius: 8,
                border: '1.5px solid var(--gray-200)',
                background: offset + LIMIT >= total ? 'var(--gray-100)' : 'var(--white)',
                color: offset + LIMIT >= total ? 'var(--gray-400)' : 'var(--gray-700)',
                fontWeight: 600, fontSize: 13,
                cursor: offset + LIMIT >= total ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font)',
              }}
            >
              Next →
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default OrderHistory;