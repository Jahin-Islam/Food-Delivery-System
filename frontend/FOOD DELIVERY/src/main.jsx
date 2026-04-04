import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css' 
import App from './App.jsx'
import './darkmode-fix.css'


try {
  const t = sessionStorage.getItem('fp_theme') || 'light';
  document.documentElement.setAttribute('data-theme', t);
} catch (_) {}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)