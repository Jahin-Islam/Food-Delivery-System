import React, { useState } from 'react';

export const CuisineFilter = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const cuisines = [
    "Asian", "Bakery", "Bangladeshi", "Beverage", "Biryani", "Breakfast", 
    "Burgers", "Cafe", "Cakes", "Chicken", "Chinese", "Chotpoti & Fuchka", 
    "Curry", "Dessert", "Dumpling", "Fast Food", "Fish", "Fried Chicken", 
    "Healthy", "Ice Cream", "Indian", "Italian", "Japanese", "Juice Corner", 
    "Kebab", "Khichuri", "Korean", "Lebanese", "Meat", "Mediterranean", 
    "Mexican", "Middle Eastern", "Noodles", "Pasta", "Pizza", "Rice Dishes", 
    "Sandwiches", "Seafood", "Shawarma", "Snacks", "Soups", "Steak", 
    "Sushi", "Sweets", "Tehari", "Thai", "Turkish", "Vegetarian", "Western", "Wraps"
  ];


  const displayedCuisines = isExpanded ? cuisines : cuisines.slice(0, 10);

  return (
    <div className="filter-section">
      <p className="filter-label">Cuisines</p>
      
      {/* Search Input */}
      <div className="search-container">
        <input 
          type="text" 
          placeholder="Search for cuisines" 
          className="filter-search-input"
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Cuisine Options */}
      <div className="filter-options-list">
        {displayedCuisines
          .filter(item => item.toLowerCase().includes(searchTerm.toLowerCase()))
          .map((cuisine) => (
            <label key={cuisine} className="filter-option">
              <input type="checkbox" name="cuisine" value={cuisine.toLowerCase()} />
              <span>{cuisine}</span>
            </label>
          ))}
      </div>

      {/* Toggle Button */}
      <button 
        className="show-more-btn" 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? "Show less ˄" : "Show more ˅"}
      </button>
    </div>
  );
};

export default CuisineFilter;