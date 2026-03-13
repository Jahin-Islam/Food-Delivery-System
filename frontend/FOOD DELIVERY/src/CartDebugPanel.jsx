// CartDebugPanel.jsx
// Drop this anywhere in App.jsx:
//   import CartDebugPanel from './CartDebugPanel.jsx';
//   <CartDebugPanel cartItems={cartItems} isLoggedIn={isLoggedIn} />
//
// It shows a floating panel in the bottom-right corner with live state + manual test buttons.
// REMOVE before production.

import { useState, useEffect } from 'react';
import authService from './Authservice.js';
import cartApiService from './Cartapiservice.js';
import cartService from './Cartservice.js';

const S = {
  panel: {
    position: 'fixed', bottom: 10, right: 10, zIndex: 99999,
    background: '#1e1e2e', color: '#cdd6f4', fontFamily: 'monospace',
    fontSize: 11, borderRadius: 8, boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
    width: 380, maxHeight: '80vh', overflow: 'auto',
  },
  header: {
    background: '#313244', padding: '6px 12px', borderRadius: '8px 8px 0 0',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    cursor: 'pointer', userSelect: 'none',
  },
  title: { fontWeight: 'bold', color: '#cba6f7', fontSize: 12 },
  body: { padding: 10 },
  section: { marginBottom: 10 },
  sectionTitle: { color: '#89b4fa', fontWeight: 'bold', marginBottom: 4, fontSize: 11 },
  row: { display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid #313244' },
  key: { color: '#94e2d5' },
  val: { color: '#a6e3a1', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  valBad: { color: '#f38ba8' },
  btn: {
    background: '#45475a', color: '#cdd6f4', border: 'none', borderRadius: 4,
    padding: '3px 8px', margin: '2px', cursor: 'pointer', fontSize: 11,
  },
  btnGreen: { background: '#40a02b' },
  btnRed: { background: '#e64553' },
  log: {
    background: '#11111b', padding: 6, borderRadius: 4, marginTop: 4,
    maxHeight: 160, overflowY: 'auto', fontSize: 10, lineHeight: 1.6,
  },
  logLine: { borderBottom: '1px solid #1e1e2e', padding: '1px 0' },
  logErr: { color: '#f38ba8' },
  logOk: { color: '#a6e3a1' },
  logInfo: { color: '#89dceb' },
};

export default function CartDebugPanel({ cartItems = [], isLoggedIn }) {
  const [open, setOpen] = useState(true);
  const [logs, setLogs] = useState([]);
  const [backendCart, setBackendCart] = useState(null);
  const [localCart, setLocalCart] = useState([]);
  const [tick, setTick] = useState(0);

  const log = (msg, type = 'info') => {
    const time = new Date().toLocaleTimeString('en-GB', { hour12: false });
    setLogs(prev => [{ msg, type, time }, ...prev].slice(0, 80));
  };

  // Refresh snapshot every 2s
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 2000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setLocalCart(cartService.loadCart());
  }, [tick, cartItems]);

  const fetchBackend = async () => {
    log(`→ GET ${cartApiService.API_BASE_URL}/`, 'info');
    try {
      const data = await cartApiService.getAllCarts();
      setBackendCart(data);
      log(`✓ Backend returned ${data.length} items`, 'ok');
      data.forEach(i => log(`  food_id=${i.food_id ?? i.foodId} name="${i.name}" qty=${i.quantity} rid=${i.restaurantId}`, 'info'));
    } catch (e) {
      log(`✗ getAllCarts() threw: ${e.message}`, 'err');
      setBackendCart(null);
    }
  };

  const testRawURL = async () => {
    const token = authService.getAccessToken();
    const url = `${cartApiService.API_BASE_URL}/`;
    log(`→ Raw GET ${url}`, 'info');
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const text = await res.text();
      log(`  status: ${res.status}`, res.ok ? 'ok' : 'err');
      log(`  body: ${text.slice(0, 300)}`, res.ok ? 'ok' : 'err');
    } catch (e) { log(`✗ fetch threw: ${e.message}`, 'err'); }
  };

  const testAddRaw = async () => {
    const rid = prompt('restaurantId (e.g. 3):');
    const fid = prompt('food_id (e.g. 35):');
    if (!rid || !fid) return;
    const token = authService.getAccessToken();
    const url = `${cartApiService.API_BASE_URL}/${rid}/`;
    log(`→ POST ${url} {item_id:${fid}}`, 'info');
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: parseInt(fid), quantity: 1 }),
      });
      const text = await res.text();
      log(`  status: ${res.status}`, res.ok ? 'ok' : 'err');
      log(`  body: ${text.slice(0, 300)}`, res.ok ? 'ok' : 'err');
    } catch (e) { log(`✗ fetch threw: ${e.message}`, 'err'); }
  };

  const checkTokens = () => {
    const access = authService.getAccessToken();
    const refresh = authService.getRefreshToken();
    const user = authService.getUser();
    log(`accessToken: ${access ? access.slice(0, 30) + '...' : 'NULL'}`, access ? 'ok' : 'err');
    log(`refreshToken: ${refresh ? refresh.slice(0, 30) + '...' : 'NULL'}`, refresh ? 'ok' : 'err');
    log(`user: ${user ? JSON.stringify(user).slice(0, 80) : 'NULL'}`, user ? 'ok' : 'err');
    log(`isAuthenticated(): ${authService.isAuthenticated()}`, authService.isAuthenticated() ? 'ok' : 'err');
  };

  const testInit = async () => {
    log('→ Running authService.initialize()...', 'info');
    try {
      const result = await authService.initialize();
      log(`✓ initialize() result: isAuthenticated=${result.isAuthenticated}`, result.isAuthenticated ? 'ok' : 'err');
      log(`  user: ${JSON.stringify(result.user)?.slice(0, 80)}`, 'info');
    } catch (e) {
      log(`✗ initialize() threw: ${e.message}`, 'err');
    }
  };

  const clearLocalStorage = () => {
    cartService.clearCart();
    setLocalCart([]);
    log('✓ Cleared foodpanda_cart from localStorage', 'ok');
  };

  const nukeAllStorage = () => {
    localStorage.clear();
    setLocalCart([]);
    log('⚠ Cleared ALL localStorage (tokens, user, cart)', 'err');
  };

  const ls = {
    accessToken: localStorage.getItem('accessToken'),
    refreshToken: localStorage.getItem('refreshToken'),
    user: localStorage.getItem('user'),
    cart: localStorage.getItem('foodpanda_cart'),
  };

  return (
    <div style={S.panel}>
      <div style={S.header} onClick={() => setOpen(o => !o)}>
        <span style={S.title}>🐞 Cart Debug Panel {open ? '▼' : '▲'}</span>
        <span style={{ color: isLoggedIn ? '#a6e3a1' : '#f38ba8', fontSize: 11 }}>
          {isLoggedIn ? '🔐 LOGGED IN' : '👤 GUEST'}
        </span>
      </div>

      {open && (
        <div style={S.body}>

          {/* ── REACT STATE ── */}
          <div style={S.section}>
            <div style={S.sectionTitle}>React cartItems ({cartItems.length})</div>
            {cartItems.length === 0
              ? <div style={{ color: '#f38ba8' }}>empty</div>
              : cartItems.map((i, idx) => (
                <div key={idx} style={S.row}>
                  <span style={S.key}>{i.name?.slice(0, 18)}</span>
                  <span style={S.val}>id={i.id} | food_id={i.food_id ?? i.foodId} | qty={i.quantity} | rid={i.restaurantId}</span>
                </div>
              ))
            }
          </div>

          {/* ── LOCAL STORAGE RAW ── */}
          <div style={S.section}>
            <div style={S.sectionTitle}>localStorage</div>
            {[
              ['accessToken', ls.accessToken ? ls.accessToken.slice(0, 28) + '...' : null],
              ['refreshToken', ls.refreshToken ? ls.refreshToken.slice(0, 28) + '...' : null],
              ['user', ls.user ? ls.user.slice(0, 40) : null],
              ['foodpanda_cart', ls.cart ? `${JSON.parse(ls.cart).length} items` : null],
            ].map(([k, v]) => (
              <div key={k} style={S.row}>
                <span style={S.key}>{k}</span>
                <span style={v ? S.val : S.valBad}>{v ?? '❌ null'}</span>
              </div>
            ))}
          </div>

          {/* ── LOCAL CART ITEMS ── */}
          <div style={S.section}>
            <div style={S.sectionTitle}>localStorage cart items ({localCart.length})</div>
            {localCart.length === 0
              ? <div style={{ color: '#6c7086' }}>empty</div>
              : localCart.map((i, idx) => (
                <div key={idx} style={S.row}>
                  <span style={S.key}>{i.name?.slice(0, 18)}</span>
                  <span style={S.val}>id={i.id} | food_id={i.food_id ?? i.foodId} | qty={i.quantity}</span>
                </div>
              ))
            }
          </div>

          {/* ── BACKEND CART ── */}
          <div style={S.section}>
            <div style={S.sectionTitle}>
              Backend cart snapshot {backendCart === null ? '(not fetched)' : `(${backendCart.length} items)`}
            </div>
            {backendCart === null
              ? <div style={{ color: '#6c7086' }}>click "Fetch Backend" below</div>
              : backendCart.length === 0
                ? <div style={{ color: '#f38ba8' }}>empty</div>
                : backendCart.map((i, idx) => (
                  <div key={idx} style={S.row}>
                    <span style={S.key}>{i.name?.slice(0, 18)}</span>
                    <span style={S.val}>food_id={i.food_id ?? i.foodId} qty={i.quantity} rid={i.restaurantId}</span>
                  </div>
                ))
            }
          </div>

          {/* ── BUTTONS ── */}
          <div style={{ marginBottom: 4 }}>
            <div style={{ color: '#6c7086', fontSize: 10, marginBottom: 3 }}>API URL: {cartApiService.API_BASE_URL}</div>
          </div>
          <div style={{ marginBottom: 8, display: 'flex', flexWrap: 'wrap' }}>
            <button style={S.btn} onClick={fetchBackend}>Fetch Backend</button>
            <button style={S.btn} onClick={testRawURL}>Raw GET /carts/</button>
            <button style={{ ...S.btn, ...S.btnGreen }} onClick={testAddRaw}>Test POST item</button>
            <button style={S.btn} onClick={checkTokens}>Check Tokens</button>
            <button style={S.btn} onClick={testInit}>Run initialize()</button>
            <button style={{ ...S.btn, ...S.btnRed }} onClick={clearLocalStorage}>Clear LS Cart</button>
            <button style={{ ...S.btn, ...S.btnRed }} onClick={nukeAllStorage}>Nuke ALL Storage</button>
            <button style={S.btn} onClick={() => setLogs([])}>Clear Logs</button>
          </div>

          {/* ── LOGS ── */}
          <div style={S.sectionTitle}>Logs</div>
          <div style={S.log}>
            {logs.length === 0
              ? <div style={{ color: '#6c7086' }}>no logs yet</div>
              : logs.map((l, i) => (
                <div key={i} style={{ ...S.logLine, ...(l.type === 'err' ? S.logErr : l.type === 'ok' ? S.logOk : S.logInfo) }}>
                  [{l.time}] {l.msg}
                </div>
              ))
            }
          </div>

        </div>
      )}
    </div>
  );
}