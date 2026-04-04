import { useState } from 'react';
import { Percent } from 'lucide-react';

export default function OfferOption({ selectedOffers = {}, onOfferChange }) {
  const [localSelected, setLocalSelected] = useState({ deals: false });

  const isControlled = typeof onOfferChange === 'function';
  const active = isControlled ? selectedOffers : localSelected;

  const toggle = (key) => {
    if (isControlled) {
      onOfferChange({ ...active, [key]: !active[key] });
    } else {
      setLocalSelected(prev => ({ ...prev, [key]: !prev[key] }));
    }
  };

  const OFFERS = [
    { key: 'deals', label: 'Deals', Icon: Percent },
  ];

  return (
    <div className="filter-section">
      <p className="filter-label">Offers</p>
      {OFFERS.map(({ key, label, Icon }) => (
        <label
          key={key}
          className="filter-option"
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, userSelect: 'none' }}
          onClick={() => toggle(key)}
        >
          <input
            type="checkbox"
            checked={!!active[key]}
            onChange={() => toggle(key)}
            onClick={e => e.stopPropagation()}
            style={{ accentColor: 'var(--c-primary)', cursor: 'pointer' }}
          />
          <Icon
            size={13}
            style={{
              color: active[key] ? 'var(--c-primary)' : 'var(--c-gray-400)',
              flexShrink: 0,
              transition: 'color 0.18s',
            }}
          />
          <span style={{
            fontWeight: active[key] ? 600 : 400,
            color: active[key] ? 'var(--c-primary)' : 'inherit',
            transition: 'color 0.18s, font-weight 0.18s',
          }}>
            {label}
          </span>
        </label>
      ))}
    </div>
  );
}