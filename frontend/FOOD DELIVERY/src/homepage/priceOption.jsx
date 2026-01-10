import React, { useState } from 'react';

export default function PriceOption() {
  const [selectedPrice, setSelectedPrice] = useState(null);

  const priceLevels = [
    { id: 1, label: "$" },
    { id: 2, label: "$$" },
    { id: 3, label: "$$$" },
  ];

  return (
    <div className="filter-section">
      <p className="filter-label">Price</p>
      <div className="price-filter-container" style={{ display: 'flex', gap: '10px' }}>
        {priceLevels.map((level) => (
          <button
            key={level.id}
            onClick={() => setSelectedPrice(level.id)}
            style={{
              flex: 1,
              padding: '10px',
              border: '1px solid #ebebeb',
              borderRadius: '8px',
              backgroundColor: selectedPrice === level.id ? '#d70f64' : 'white',
              color: selectedPrice === level.id ? 'white' : '#333',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: '0.2s',
              fontFamily: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif"
            }}
          >
            {level.label}
          </button>
        ))}
      </div>
    </div>
  );
}