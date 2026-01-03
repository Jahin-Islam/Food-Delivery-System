import { useState } from "react";
import "./homepage.css";

const Homepage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [cartItems, setCartItems] = useState([]);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const products = [
    {
      id: 1,
      name: "Coffee",
      type: "Hot",
      rating: 4.9,
      price: 20.99,
      discount: 10,
      image: "☕",
    },
    {
      id: 2,
      name: "Coffee",
      type: "Cold",
      rating: 4.9,
      price: 20.99,
      discount: 15,
      image: "🥤",
    },
    {
      id: 3,
      name: "Burger",
      type: "Deluxe",
      rating: 4.8,
      price: 15.99,
      discount: 0,
      image: "🍔",
    },
    {
      id: 4,
      name: "Pizza",
      type: "Margherita",
      rating: 4.7,
      price: 18.99,
      discount: 20,
      image: "🍕",
    },
    {
      id: 5,
      name: "Pasta",
      type: "Carbonara",
      rating: 4.6,
      price: 14.99,
      discount: 0,
      image: "🍝",
    },
    {
      id: 6,
      name: "Sushi",
      type: "Mixed",
      rating: 4.9,
      price: 25.99,
      discount: 10,
      image: "🍱",
    },
  ];

  const addToCart = (product) => {
    setCartItems([...cartItems, product]);
    alert(`${product.name} added to cart!`);
  };

  return (
    <div className="homepage-container">
      {/* Top Bar */}
      <div className="top-bar">
        <div className="top-bar-content">
          <div className="top-bar-left">
            <div className="logo-box">LOGO</div>
            <button className="address-btn">
              <span className="icon">📍</span>
              <span>Address</span>
            </button>
          </div>
          <div className="top-bar-right">
            <button className="icon-btn profile-btn">
              <img
                className="profile-image homepage-upper-right-icon-images"
                src={"../../public/images/accessories/avatar.png"}
              />
              <span>Profile</span>
            </button>
            <button className="icon-btn globe-btn">
              <img
                className="globe-image homepage-upper-right-icon-images"
                src={"../../public/images/accessories/world.png"}
              />
              <span>EN</span>
            </button>
            <button className="icon-btn heart-btn">
              <img
                className="heart-image homepage-upper-right-icon-images"
                src={"../../public/images/accessories/heart.png"}
              />

              <span>Fav</span>
            </button>
            <button className="icon-btn cart-btn">
               <img
                className="cart-image homepage-upper-right-icon-images"
                src={"../../public/images/accessories/cart.png"}
              />
              <span>Cart</span>
              {cartItems.length > 0 && (
                <span className="cart-badge">{cartItems.length}</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Sign In Button Bar */}
      <div className="signin-bar">
        <div className="signin-bar-content">
          <button className="signin-btn">SIGN IN / SIGNUP</button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="main-nav">
        <div className="nav-content">
          <button
            className="mobile-menu-btn"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
          >
            ☰
          </button>
          <div className={`nav-links ${showMobileMenu ? "show" : ""}`}>
            <a href="#home">Home</a>
            <a href="#about">About</a>
            <a href="#restaurants">Restaurants</a>
            <a href="#orders">Orders</a>
            <a href="#track">Track Your Orders</a>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="main-content">
        <div className="content-wrapper">
          {/* Sidebar Filters */}
          <aside className="sidebar">
            <h3 className="sidebar-title">Filters</h3>

            <div className="filter-section">
              <p className="filter-label">Sort by</p>
              <label className="filter-option">
                <input type="radio" name="sort" />
                <span>New</span>
              </label>
              <label className="filter-option">
                <input type="radio" name="sort" />
                <span>Popular</span>
              </label>
              <label className="filter-option">
                <input type="radio" name="sort" />
                <span>Top Rated</span>
              </label>
            </div>

            <div className="filter-section">
              <p className="filter-label">Price</p>
              <label className="filter-option">
                <input type="radio" name="price" />
                <span>$ Range</span>
              </label>
            </div>

            <div className="filter-section">
              <p className="filter-label">Cuisine</p>
              <label className="filter-option">
                <input type="checkbox" />
                <span>Bangladeshi</span>
              </label>
              <label className="filter-option">
                <input type="checkbox" />
                <span>Chinese</span>
              </label>
              <label className="filter-option">
                <input type="checkbox" />
                <span>Japanese</span>
              </label>
            </div>

            <div className="filter-section">
              <p className="filter-label">Tags</p>
              <label className="filter-option">
                <input type="radio" name="tags" />
                <span>Special Offer</span>
              </label>
              <label className="filter-option">
                <input type="radio" name="tags" />
                <span>Free Delivery</span>
              </label>
            </div>
          </aside>

          {/* Main Area */}
          <main className="main-area">
            {/* Search and Create Section */}
            <div className="search-section">
              <div className="search-wrapper">
                <input
                  type="text"
                  placeholder="Search for restaurants, dishes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>
              <div className="action-buttons">
                <button className="create-btn">🔄 Create</button>
                <button className="play-btn">▶️</button>
              </div>
            </div>

            {/* Product Grid */}
            <div className="product-grid">
              {products.map((product) => (
                <div key={product.id} className="product-card">
                  <div className="product-image">
                    {product.discount > 0 && (
                      <div className="discount-badge">
                        {product.discount}% OFF
                      </div>
                    )}
                    <button className="favorite-btn">❤️</button>
                    <div className="product-emoji">{product.image}</div>
                  </div>
                  <div className="product-info">
                    <h3 className="product-name">{product.name}</h3>
                    <p className="product-type">{product.type}</p>
                    <div className="product-rating">
                      <span className="stars">⭐⭐⭐⭐⭐</span>
                      <span className="rating-number">{product.rating}</span>
                    </div>
                    <div className="product-footer">
                      <span className="product-price">${product.price}</span>
                      <button
                        className="add-to-cart-btn"
                        onClick={() => addToCart(product)}
                      >
                        Add to cart
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="pagination">
              <div className="page-number">Page - 69</div>
            </div>
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-links">
            <a href="#help">Help & Support</a>
            <a href="#contact">Contact Support</a>
          </div>
          <div className="social-icons">
            <a href="#facebook" className="social-icon">
              f
            </a>
            <a href="#instagram" className="social-icon">
              📷
            </a>
            <a href="#twitter" className="social-icon">
              🐦
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Homepage;
