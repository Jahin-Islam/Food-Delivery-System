import React, { useState, useMemo } from 'react';

export const CuisineFilter = ({ selectedCuisines = [], onCuisineToggle, restaurants = [] }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const cuisines = useMemo(() => {
    const seen = new Set();
    const names = [];
    for (const restaurant of restaurants) {
      for (const item of restaurant?.items ?? []) {
        const name = item?.category_name?.trim();
        if (name && !seen.has(name.toLowerCase())) {
          seen.add(name.toLowerCase());
          names.push(name);
        }
      }
    }
    return names.sort((a, b) => a.localeCompare(b));
  }, [restaurants]);

  const filtered = cuisines.filter(c =>
    c.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayed = isExpanded ? filtered : filtered.slice(0, 10);

  return (
    <div className="filter-section">
      <p className="filter-label">Cuisines</p>

      {/* Search */}
      <div className="search-container">
        <input
          type="text"
          placeholder="Search for cuisines"
          className="filter-search-input"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Options */}
      <div className="filter-options-list">
        {cuisines.length === 0 && restaurants.length === 0 && (
          <span style={{ fontSize: 13, color: 'var(--c-gray-400)', padding: '4px 0', display: 'block' }}>
            Loading categories…
          </span>
        )}
        {cuisines.length === 0 && restaurants.length > 0 && (
          <span style={{ fontSize: 13, color: 'var(--c-gray-400)', padding: '4px 0', display: 'block' }}>
            No categories found.
          </span>
        )}
        {displayed.map(cuisine => (
          <label key={cuisine} className="filter-option">
            <input
              type="checkbox"
              name="cuisine"
              value={cuisine.toLowerCase()}
              checked={selectedCuisines.includes(cuisine)}
              onChange={() => onCuisineToggle?.(cuisine)}
            />
            <span>{cuisine}</span>
          </label>
        ))}
      </div>

      {/* Show more / less — only show when there are more than 10 results */}
      {filtered.length > 10 && (
        <button
          className="show-more-btn"
          onClick={() => setIsExpanded(p => !p)}
        >
          {isExpanded ? "Show less ˄" : `Show more (${filtered.length - 10} more) ˅`}
        </button>
      )}
    </div>
  );
};

export default CuisineFilter;