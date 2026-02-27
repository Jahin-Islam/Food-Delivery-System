import React, { useState, useEffect } from 'react';
import './BusinessDashboard.css';
import { COLORS, SHADOWS } from '../constants.js';
import { Search, Utensils, Bike, Star, Camera, Pencil } from 'lucide-react';
import authService from '../Authservice.js';

const BusinessDashboard = ({
  restaurant,
  onBack,
  isLoggedIn,
  user,
  onLoginClick,
  onSignUpClick,
  onLogout,
  onNavigateToOrders,
}) => {
  const [activeTab, setActiveTab] = useState('menu');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [restaurantDetails, setRestaurantDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  // Local state for dynamically added items
  const [localCategories, setLocalCategories] = useState([]);
  const [localDeals, setLocalDeals] = useState([]);
  const [localMenuItems, setLocalMenuItems] = useState([]);

  // Add Item Modal States
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [selectedCategoryForAdd, setSelectedCategoryForAdd] = useState('');
  const [newItemData, setNewItemData] = useState({
    name: '',
    description: '',
    price: '',
    discount_ammount: '',
    discount_description: '',
    is_available: true,
    image_file: null,
    image_preview: null,
  });

  // Add Category Modal States
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Add Deal Modal States
  const [showAddDealModal, setShowAddDealModal] = useState(false);
  const [newDealData, setNewDealData] = useState({
    description: '',
    min_order: '',
    percentage: '',
  });

  useEffect(() => {
    const fetchRestaurantDetails = async () => {
      if (!restaurant || !restaurant.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        let data;

        if (isLoggedIn) {
          data = await authService.authenticatedFetch(
            `http://127.0.0.1:8000/api/v1/restaurants/${restaurant.id}/`
          );
        } else {
          const response = await fetch(
            `http://127.0.0.1:8000/api/v1/restaurants/${restaurant.id}/`
          );
          if (!response.ok) {
            throw new Error('Failed to fetch restaurant details');
          }
          data = await response.json();
        }

        setRestaurantDetails(data);

        if (data.items && data.items.length > 0) {
          const uniqueCategories = ['All', ...new Set(data.items.map((item) => item.category_name))];
          setCategories(uniqueCategories);
          setMenuItems(data.items);
        } else {
          setCategories(['All']);
          setMenuItems([]);
        }
      } catch (err) {
        console.error('Error fetching restaurant details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurantDetails();
  }, [restaurant, isLoggedIn]);

  const displayRestaurant = restaurantDetails || restaurant;

  const allCategories = [...categories, ...localCategories];
  const allDeals = [...(displayRestaurant?.discounts || []), ...localDeals];
  const allMenuItems = [...menuItems, ...localMenuItems];

  const filteredItems = allMenuItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category_name === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedItems = filteredItems.reduce((acc, item) => {
    const category = item.category_name || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {});

  const handleItemAvailabilityToggle = (itemId) => {
    console.log('Toggle availability for item:', itemId);
  };

  const handleItemEdit = (item) => {
    console.log('Edit item:', item);
  };

  const handleQuantityChange = (itemId, quantity) => {
    console.log('Update quantity for item:', itemId, 'to:', quantity);
  };

  // Add Item Modal Handlers
  const handleAddItemClick = (category) => {
    setSelectedCategoryForAdd(category);
    setShowAddItemModal(true);
  };

  const handleCloseAddItemModal = () => {
    setShowAddItemModal(false);
    setNewItemData({
      name: '',
      description: '',
      price: '',
      discount_ammount: '',
      discount_description: '',
      is_available: true,
      image_file: null,
      image_preview: null,
    });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewItemData((prev) => ({
        ...prev,
        image_file: file,
        image_preview: URL.createObjectURL(file),
      }));
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewItemData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmitNewItem = async () => {
    const newItem = {
      food_id: Date.now(),
      name: newItemData.name,
      description: newItemData.description,
      price: parseFloat(newItemData.price),
      discount_ammount: newItemData.discount_ammount ? parseFloat(newItemData.discount_ammount) : null,
      discount_description: newItemData.discount_description || null,
      is_available: newItemData.is_available ? 1 : 0,
      image_url: newItemData.image_preview,
      category_name: selectedCategoryForAdd,
      restaurant_id: displayRestaurant.id,
    };

    console.log('Submitting new item:', newItem);
    setLocalMenuItems((prev) => [...prev, newItem]);
    alert('Item added successfully! (Visible on page, backend integration pending)');
    handleCloseAddItemModal();
  };

  // Category Modal Handlers
  const handleAddCategoryClick = () => setShowAddCategoryModal(true);

  const handleCloseAddCategoryModal = () => {
    setShowAddCategoryModal(false);
    setNewCategoryName('');
  };

  const handleSubmitNewCategory = () => {
    if (!newCategoryName.trim()) {
      alert('Please enter a category name');
      return;
    }
    setLocalCategories((prev) => [...prev, newCategoryName]);
    alert('Category added successfully! (Visible on page, backend integration pending)');
    handleCloseAddCategoryModal();
  };

  // Deal Modal Handlers
  const handleAddDealClick = () => setShowAddDealModal(true);

  const handleCloseAddDealModal = () => {
    setShowAddDealModal(false);
    setNewDealData({ description: '', min_order: '', percentage: '' });
  };

  const handleDealInputChange = (e) => {
    const { name, value } = e.target;
    setNewDealData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitNewDeal = () => {
    if (!newDealData.description || !newDealData.min_order || !newDealData.percentage) {
      alert('Please fill in all fields');
      return;
    }
    const newDeal = {
      id: Date.now(),
      description: newDealData.description,
      min_order: parseFloat(newDealData.min_order),
      percentage: parseFloat(newDealData.percentage),
      resturant_id: displayRestaurant.id,
    };
    setLocalDeals((prev) => [...prev, newDeal]);
    alert('Deal added successfully! (Visible on page, backend integration pending)');
    handleCloseAddDealModal();
  };

  if (loading) {
    return (
      <div className="business-dashboard">
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <div className="loading-spinner">
            <img className="load-icon" src="/images/accessories/load.gif" alt="Loading..." />
          </div>
          <p>Loading restaurant details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="business-dashboard">

      {/* ── Business Header ──────────────────────────────────── */}
      <header className="business-header">
        <div className="business-header-content">

          {/* LEFT — wider CSS padding pushes this further left */}
          <div className="business-header-left">
            <div className="business-logo-section">
              {/* Panda image in the pink logo square */}
              <button className="logo-icon" aria-label="foodpanda business">
                <img
                  src="/images/accessories/panda.png"
                  alt="panda"
                  onError={(e) => {
                    // graceful fallback if panda.png not found
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentNode.style.fontSize = '22px';
                    e.currentTarget.parentNode.textContent = '🐼';
                  }}
                />
              </button>
              <div className="business-logo-text">
                <span className="logo-main">foodpanda</span>
                <span className="logo-sub">business</span>
              </div>
            </div>

            <button className="business-address-button">
              <span className="logo-image">
                <img src="/images/accessories/gps.png" alt="GPS" />
              </span>
              <div className="address-text">
                <div className="address-label">Restaurant Location</div>
                <div className="address-full">{displayRestaurant.address || 'Dhaka, Bangladesh'}</div>
              </div>
            </button>
          </div>

          {/* RIGHT — wider CSS padding pushes this further right */}
          <div className="business-header-right">
            <button className="business-header-btn language-btn">
              <span className="logo-image">
                <img src="/images/accessories/world.png" alt="Language" />
              </span>
              <span>EN</span>
            </button>
            <button
              className="business-header-btn profile-btn"
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            >
              <span className="logo-image">
                <img src="/images/accessories/profile.png" alt="Profile" />
              </span>
              <span>{user?.first_name || 'PROFILE'}</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="business-nav-tabs">
          <div className="business-nav-tabs-content">
            <button
              className={`business-nav-tab ${activeTab === 'menu' ? 'active' : ''}`}
              onClick={() => setActiveTab('menu')}
            >
              <span className="logo-image">
                <img src="/images/accessories/delivery.png" alt="Menu" />
              </span>
              Menu
            </button>
            <button
              className={`business-nav-tab ${activeTab === 'orders' ? 'active' : ''}`}
              onClick={() => onNavigateToOrders && onNavigateToOrders()}
            >
              <span className="logo-image">
                <img src="/images/accessories/cart.png" alt="Orders" />
              </span>
              Orders
            </button>
            <button
              className={`business-nav-tab ${activeTab === 'order-history' ? 'active' : ''}`}
              onClick={() => setActiveTab('order-history')}
            >
              <span className="logo-image">
                <img src="/images/accessories/heart.png" alt="Order History" />
              </span>
              Order History
            </button>
          </div>
        </div>
      </header>

      {/* ── Restaurant Banner ────────────────────────────────── */}
      <div className="business-restaurant-banner">
        <button className="business-back-button" onClick={onBack}>
          ← Back to restaurants
        </button>

        <div className="business-banner-content">
          <div className="business-banner-image">
            {displayRestaurant.image_url ? (
              <img
                src={displayRestaurant.image_url}
                alt={displayRestaurant.name}
                className="restaurant-banner-img"
              />
            ) : (
              <Utensils size={64} color="var(--primary)" style={{opacity:0.6}} />
            )}
          </div>

          <div className="business-restaurant-info">
            <h1 className="business-restaurant-name">{displayRestaurant.name}</h1>
            <p className="business-restaurant-subtitle">Restaurant</p>

            <div className="business-restaurant-meta">
              <p className="meta-item">
                <Bike size={16} style={{marginRight:4, verticalAlign:"middle", color:"var(--primary)"}} />
                Delivery: 20-30 min
              </p>
            </div>

            <div className="business-restaurant-rating">
              <Star size={16} fill="#f59e0b" color="#f59e0b" style={{marginRight:4, verticalAlign:"middle"}} />
              <span className="rating-number">{displayRestaurant.rating || '4.8'}</span>
              <span className="rating-count">({displayRestaurant.total_reviews || '1732'})</span>
              <a href="#" className="rating-link">See reviews</a>
              <a href="#" className="rating-link">More info</a>
            </div>
          </div>
        </div>
      </div>

      {/* ── Available Deals ──────────────────────────────────── */}
      <div className="business-deals-section">
        <h2 className="business-section-title">Available deals</h2>
        <div className="business-deals-grid">
          {allDeals.map((discount, index) => (
            <div
              key={discount.id || index}
              className="business-deal-card"
              style={{
                background:
                  index % 2 === 0
                    ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
                    : COLORS.gradientPrimary,
              }}
            >
              <div className="deal-icon">
                <img className="discount-icon" src="/images/accessories/discount.png" alt="Discount" />
              </div>
              <div className="deal-content">
                <h3 className="deal-title">{discount.description}</h3>
                <p className="deal-description">
                  Min. order ৳{discount.min_order} • {discount.percentage}% off
                </p>
              </div>
            </div>
          ))}

          <button className="business-add-card" onClick={handleAddDealClick}>
            <div className="add-card-icon">+</div>
            <div className="add-card-text">Add New Deal</div>
          </button>
        </div>
      </div>

      {/* ── Menu Section ─────────────────────────────────────── */}
      <div className="business-menu-section">
        <h2 className="business-section-title">Menu</h2>

        <div className="business-menu-controls">
          <div className="business-search-in-menu">
            <Search size={16} style={{marginRight:8, color:"var(--gray-400)", flexShrink:0}} />
            <input
              type="text"
              placeholder="Search in menu"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="business-menu-search-input"
            />
          </div>
        </div>

        <div className="business-menu-categories">
          <div className="business-categories-scroll">
            {allCategories.map((category) => (
              <button
                key={category}
                className={`business-category-btn ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
            <button className="business-add-category-btn" onClick={handleAddCategoryClick}>
              + Add Category
            </button>
          </div>
        </div>

        <div className="business-menu-items-container">
          {Object.entries(groupedItems).map(([category, items]) => (
            <div key={category} className="business-category-section">
              <h3 className="business-category-title">{category}</h3>
              <p className="business-category-subtitle">{items.length} items</p>

              <div className="business-items-grid">
                {items.map((item) => (
                  <div key={item.food_id} className="business-item-card">
                    <div className="business-item-info">
                      <h4 className="business-item-name">{item.name}</h4>
                      <p className="business-item-description">{item.description}</p>

                      <div className="business-item-footer">
                        <span className="business-item-price">৳{item.price}</span>
                        {item.discount_ammount && (
                          <span className="business-item-discount">
                            -{item.discount_ammount}%
                          </span>
                        )}
                      </div>

                      <div className="business-item-controls">
                        <button
                          className="business-item-edit-btn"
                          onClick={() => handleItemEdit(item)}
                        >
                          <Pencil size={13} style={{marginRight:4, verticalAlign:'middle'}} />Edit
                        </button>

                        <div className="business-item-availability">
                          <label className="availability-switch">
                            <input
                              type="checkbox"
                              defaultChecked={item.is_available}
                              onChange={() => handleItemAvailabilityToggle(item.food_id)}
                            />
                            <span className="availability-slider"></span>
                          </label>
                          <span className="availability-label">
                            {item.is_available ? 'Available' : 'Unavailable'}
                          </span>
                        </div>

                        <div className="business-item-quantity">
                          <label>Stock:</label>
                          <input
                            type="number"
                            min="0"
                            defaultValue="50"
                            className="quantity-input"
                            onChange={(e) => handleQuantityChange(item.food_id, e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="business-item-image-container">
                      <div className="business-item-image">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }}
                          />
                        ) : (
                          <div className="menu-item-emoji"><Utensils size={32} color="var(--primary)" style={{opacity:0.5}} /></div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  className="business-add-item-card"
                  onClick={() => handleAddItemClick(category)}
                >
                  <div className="add-item-icon">+</div>
                  <div className="add-item-text">Add New Item</div>
                </button>
              </div>
            </div>
          ))}

          {localCategories
            .filter((cat) => !Object.keys(groupedItems).includes(cat))
            .map((category) => (
              <div key={category} className="business-category-section">
                <h3 className="business-category-title">{category}</h3>
                <p className="business-category-subtitle">0 items</p>
                <div className="business-items-grid">
                  <button
                    className="business-add-item-card"
                    onClick={() => handleAddItemClick(category)}
                  >
                    <div className="add-item-icon">+</div>
                    <div className="add-item-text">Add New Item</div>
                  </button>
                </div>
              </div>
            ))}

          {Object.keys(groupedItems).length === 0 && localCategories.length === 0 && (
            <div className="business-no-results">
              <div className="no-results-icon"><Search size={48} style={{color:"var(--gray-400)", opacity:0.5}} /></div>
              <p>No items found matching "{searchQuery}"</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Add Item Modal ───────────────────────────────────── */}
      {showAddItemModal && (
        <div className="modal-overlay" onClick={handleCloseAddItemModal}>
          <div className="add-item-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add New Item to {selectedCategoryForAdd}</h2>
              <button className="modal-close-btn" onClick={handleCloseAddItemModal}>×</button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Item Photo</label>
                <div className="image-upload-area">
                  {newItemData.image_preview ? (
                    <div className="image-preview-container">
                      <img src={newItemData.image_preview} alt="Preview" className="image-preview" />
                      <button
                        className="remove-image-btn"
                        onClick={() => setNewItemData((prev) => ({ ...prev, image_file: null, image_preview: null }))}
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="upload-label">
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="file-input" />
                      <div className="upload-placeholder">
                        <div className="upload-icon"><Camera size={32} style={{color:"var(--gray-400)"}} /></div>
                        <div className="upload-text">Click to upload photo</div>
                        <div className="upload-subtext">PNG, JPG up to 5MB</div>
                      </div>
                    </label>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Item Name *</label>
                <input
                  type="text"
                  name="name"
                  value={newItemData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Chicken Cashewnut Salad"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  name="description"
                  value={newItemData.description}
                  onChange={handleInputChange}
                  placeholder="Describe your dish..."
                  className="form-textarea"
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Price (৳) *</label>
                <input
                  type="number"
                  name="price"
                  value={newItemData.price}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  className="form-input"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Discount (%)</label>
                  <input
                    type="number"
                    name="discount_ammount"
                    value={newItemData.discount_ammount}
                    onChange={handleInputChange}
                    placeholder="0"
                    className="form-input"
                    min="0"
                    max="100"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Discount Description</label>
                  <input
                    type="text"
                    name="discount_description"
                    value={newItemData.discount_description}
                    onChange={handleInputChange}
                    placeholder="e.g., Weekend Special"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Availability</label>
                <div className="availability-toggle-group">
                  <label className="availability-switch">
                    <input
                      type="checkbox"
                      name="is_available"
                      checked={newItemData.is_available}
                      onChange={handleInputChange}
                    />
                    <span className="availability-slider"></span>
                  </label>
                  <span className="availability-label">
                    {newItemData.is_available ? 'Available' : 'Unavailable'}
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="modal-cancel-btn" onClick={handleCloseAddItemModal}>Cancel</button>
              <button
                className="modal-submit-btn"
                onClick={handleSubmitNewItem}
                disabled={!newItemData.name || !newItemData.price}
              >
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Category Modal ───────────────────────────────── */}
      {showAddCategoryModal && (
        <div className="modal-overlay" onClick={handleCloseAddCategoryModal}>
          <div className="add-category-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add New Category</h2>
              <button className="modal-close-btn" onClick={handleCloseAddCategoryModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Category Name *</label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g., Desserts, Beverages, Appetizers"
                  className="form-input"
                  required
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-cancel-btn" onClick={handleCloseAddCategoryModal}>Cancel</button>
              <button
                className="modal-submit-btn"
                onClick={handleSubmitNewCategory}
                disabled={!newCategoryName.trim()}
              >
                Add Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Deal Modal ───────────────────────────────────── */}
      {showAddDealModal && (
        <div className="modal-overlay" onClick={handleCloseAddDealModal}>
          <div className="add-deal-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Add New Deal</h2>
              <button className="modal-close-btn" onClick={handleCloseAddDealModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Deal Name *</label>
                <input
                  type="text"
                  name="description"
                  value={newDealData.description}
                  onChange={handleDealInputChange}
                  placeholder="e.g., Weekend Special - 20% Off"
                  className="form-input"
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Minimum Order (৳) *</label>
                  <input
                    type="number"
                    name="min_order"
                    value={newDealData.min_order}
                    onChange={handleDealInputChange}
                    placeholder="0"
                    className="form-input"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Discount (%) *</label>
                  <input
                    type="number"
                    name="percentage"
                    value={newDealData.percentage}
                    onChange={handleDealInputChange}
                    placeholder="0"
                    className="form-input"
                    min="0"
                    max="100"
                    required
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-cancel-btn" onClick={handleCloseAddDealModal}>Cancel</button>
              <button
                className="modal-submit-btn"
                onClick={handleSubmitNewDeal}
                disabled={!newDealData.description || !newDealData.min_order || !newDealData.percentage}
              >
                Add Deal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessDashboard;