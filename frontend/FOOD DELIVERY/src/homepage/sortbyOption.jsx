export default function SortOption() {
    return (
        <div className="filter-section">
            <p className="filter-label">Sort by</p>
            <label className="filter-option">
                <input type="radio" name="sort" defaultChecked />
                <span>Relevance</span>
            </label>
            <label className="filter-option">
                <input type="radio" name="sort" />
                <span>Fastest delivery</span>
            </label>
            <label className="filter-option">
                <input type="radio" name="sort" />
                <span>Distance</span>
            </label>
            <label className="filter-option">
                <input type="radio" name="sort" />
                <span>Top rated</span>
            </label>
        </div>
    );
}