import { useState } from 'react';
import { COLORS } from '../constants.js';

export function filterByPrice(restaurants, minPrice, maxPrice) {
  const hasMin = minPrice !== '' && minPrice !== null && minPrice !== undefined && !isNaN(Number(minPrice));
  const hasMax = maxPrice !== '' && maxPrice !== null && maxPrice !== undefined && !isNaN(Number(maxPrice));
  if (!hasMin && !hasMax) return restaurants;
  const lo = hasMin ? Number(minPrice) : 0;
  const hi = hasMax ? Number(maxPrice) : Infinity;
  return restaurants.filter(r =>
    r.items?.some(item => {
      const p = parseFloat(item.price);
      return !isNaN(p) && p >= lo && p <= hi;
    })
  );
}

export default function PriceOption({ minPrice, maxPrice, onPriceChange }) {
  // Local state fallback when not controlled
  const [localMin, setLocalMin] = useState('');
  const [localMax, setLocalMax] = useState('');

  const isControlled = typeof onPriceChange === 'function';
  const curMin = isControlled ? (minPrice ?? '') : localMin;
  const curMax = isControlled ? (maxPrice ?? '') : localMax;

  const update = (field, value) => {
    const next = value === '' ? '' : value;
    if (isControlled) {
      onPriceChange(
        field === 'min' ? next : curMin,
        field === 'max' ? next : curMax,
      );
    } else {
      if (field === 'min') setLocalMin(next);
      else setLocalMax(next);
    }
  };

  const hasFilter = curMin !== '' || curMax !== '';

  const clear = () => {
    if (isControlled) onPriceChange('', '');
    else { setLocalMin(''); setLocalMax(''); }
  };

  const inputStyle = {
    width: '100%',
    padding: '8px 10px',
    border: '2px solid var(--c-gray-200)',
    borderRadius: 8,
    fontSize: 13,
    fontFamily: 'var(--font)',
    background: 'var(--c-gray-50)',
    color: 'var(--c-gray-900)',
    outline: 'none',
    transition: 'border-color 0.18s',
  };

  return (
    <div className="filter-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <p className="filter-label" style={{ margin: 0 }}>Price Range (৳)</p>
        {hasFilter && (
          <button onClick={clear} style={{ fontSize: 11, color: 'var(--c-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, padding: 0 }}>
            Clear
          </button>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Min */}
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--c-gray-500)', marginBottom: 4 }}>Min</label>
          <input
            type="number" min="0" placeholder="0" value={curMin}
            onChange={e => update('min', e.target.value)}
            style={{ ...inputStyle, borderColor: curMin !== '' ? 'var(--c-primary)' : 'var(--c-gray-200)' }}
            onFocus={e => e.target.style.borderColor = 'var(--c-primary)'}
            onBlur={e => e.target.style.borderColor = curMin !== '' ? 'var(--c-primary)' : 'var(--c-gray-200)'}
          />
        </div>

        <span style={{ fontSize: 13, color: 'var(--c-gray-400)', marginTop: 18, flexShrink: 0 }}>—</span>

        {/* Max */}
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--c-gray-500)', marginBottom: 4 }}>Max</label>
          <input
            type="number" min="0" placeholder="Any" value={curMax}
            onChange={e => update('max', e.target.value)}
            style={{ ...inputStyle, borderColor: curMax !== '' ? 'var(--c-primary)' : 'var(--c-gray-200)' }}
            onFocus={e => e.target.style.borderColor = 'var(--c-primary)'}
            onBlur={e => e.target.style.borderColor = curMax !== '' ? 'var(--c-primary)' : 'var(--c-gray-200)'}
          />
        </div>
      </div>

      {hasFilter && (
        <p style={{ fontSize: 11, color: 'var(--c-primary)', marginTop: 7, fontWeight: 600 }}>
          Showing restaurants with at least one item {curMin !== '' ? `from ৳${curMin}` : ''}{curMin !== '' && curMax !== '' ? ' ' : ''}{curMax !== '' ? `up to ৳${curMax}` : ''}
        </p>
      )}
    </div>
  );
}