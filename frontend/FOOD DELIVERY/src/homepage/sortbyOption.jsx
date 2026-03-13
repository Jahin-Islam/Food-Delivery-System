export default function SortOption({ sortBy = 'relevance', onSortChange }) {
    const options = [
        { value: 'relevance',     label: 'Relevance' },
        { value: 'top_rated',     label: 'Top rated' },
        { value: 'distance',      label: 'Distance' },
        { value: 'fast_delivery', label: 'Fastest delivery' },
    ];

    return (
        <div className="filter-section">
            <p className="filter-label">Sort by</p>
            {options.map(opt => (
                <label className="filter-option" key={opt.value}>
                    <input
                        type="radio"
                        name="sort"
                        checked={sortBy === opt.value}
                        onChange={() => onSortChange?.(opt.value)}
                    />
                    <span>{opt.label}</span>
                </label>
            ))}
        </div>
    );
}