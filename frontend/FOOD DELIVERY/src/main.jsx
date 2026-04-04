import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css' 
import App from './App.jsx'
import './darkmode-fix.css'

// ─── Apply saved theme BEFORE React renders ───────────────────────────────────
// useEffect fires after paint — this runs synchronously so there's zero flash.
// Each tab stores its own preference in sessionStorage (cross-tab independent).
try {
  const t = sessionStorage.getItem('fp_theme') || 'light';
  document.documentElement.setAttribute('data-theme', t);
} catch (_) {}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)