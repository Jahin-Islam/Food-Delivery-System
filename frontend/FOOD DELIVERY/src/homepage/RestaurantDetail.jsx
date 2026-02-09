import { useState } from 'react';
import './RestaurantDetail.css';

const RestaurantDetail = ({ restaurant, onBack, onAddToCart, isLoggedIn }) => {
  const [selectedCategory, setSelectedCategory] = useState('Popular');
  const [showCart, setShowCart] = useState(false);
  const [cartItems, setCartItems] = useState([]);

  // Dummy data for menu items
  const menuCategories = [
    'Popular',
    'Coffee ☕',
    'Juice 🍊',
    'Sandwich & Burger 🍔',
    'Pastry 🥐',
    'Dessert 🍰',
    'Savory 🥗'
  ];

  const menuItems = {
    'Popular': [
      {
        id: 1,
        name: 'Americano',
        price: 4.99,
        description: 'Freshly brewed espresso with hot water',
        image: '☕',
        rating: 4.5
      },
      {
        id: 2,
        name: 'Cappuccino',
        price: 5.49,
        description: 'Espresso with steamed milk and foam',
        image: '☕',
        rating: 4.8
      },
      {
        id: 3,
        name: 'Latte',
        price: 5.99,
        description: 'Smooth espresso with steamed milk',
        image: '☕',
        rating: 4.6
      },
      {
        id: 4,
        name: 'Mocha',
        price: 6.49,
        description: 'Espresso with chocolate and steamed milk',
        image: '☕',
        rating: 4.7
      }
    ],
    'Coffee ☕': [
      {
        id: 5,
        name: 'Espresso',
        price: 3.99,
        description: 'Strong and rich espresso shot',
        image: '☕',
        rating: 4.9
      },
      {
        id: 6,
        name: 'Caramel Latte',
        price: 6.99,
        description: 'Latte with sweet caramel flavor',
        image: '☕',
        rating: 4.8
      },
      {
        id: 7,
        name: 'Vanilla Latte',
        price: 6.49,
        description: 'Creamy latte with vanilla syrup',
        image: '☕',
        rating: 4.7
      },
      {
        id: 8,
        name: 'Iced Coffee',
        price: 5.49,
        description: 'Cold brewed coffee over ice',
        image: '🧊',
        rating: 4.6
      }
    ],
    'Juice 🍊': [
      {
        id: 9,
        name: 'Orange Juice',
        price: 4.99,
        description: 'Freshly squeezed orange juice',
        image: '🍊',
        rating: 4.7
      },
      {
        id: 10,
        name: 'Strawberry Juice',
        price: 5.49,
        description: 'Sweet strawberry blend',
        image: '🍓',
        rating: 4.8
      },
      {
        id: 11,
        name: 'Watermelon Juice',
        price: 4.49,
        description: 'Refreshing watermelon juice',
        image: '🍉',
        rating: 4.5
      }
    ],
    'Sandwich & Burger 🍔': [
      {
        id: 12,
        name: 'Wellness Chicken Delight Burger',
        price: 8.99,
        description: 'Grilled chicken with fresh vegetables',
        image: '🍔',
        rating: 4.6
      },
      {
        id: 13,
        name: 'Beef Burger',
        price: 9.99,
        description: 'Juicy beef patty with cheese',
        image: '🍔',
        rating: 4.7
      },
      {
        id: 14,
        name: 'Club Sandwich',
        price: 7.99,
        description: 'Triple layered sandwich with chicken',
        image: '🥪',
        rating: 4.5
      }
    ],
    'Pastry 🥐': [
      {
        id: 15,
        name: 'Blueberry Cheese Pastry',
        price: 4.99,
        description: 'Sweet blueberry and cream cheese',
        image: '🥐',
        rating: 4.8
      },
      {
        id: 16,
        name: 'Chocolate Fudge Pastry',
        price: 5.49,
        description: 'Rich chocolate fudge filling',
        image: '🥐',
        rating: 4.9
      }
    ],
    'Dessert 🍰': [
      {
        id: 17,
        name: 'Chocolate Brownie',
        price: 5.99,
        description: 'Warm chocolate brownie with nuts',
        image: '🍰',
        rating: 4.9
      },
      {
        id: 18,
        name: 'Chocolate Mousse',
        price: 6.49,
        description: 'Light and creamy chocolate mousse',
        image: '🍰',
        rating: 4.8
      },
      {
        id: 19,
        name: 'Red Velvet Cupcake',
        price: 4.99,
        description: 'Classic red velvet with cream cheese',
        image: '🧁',
        rating: 4.7
      }
    ],
    'Savory 🥗': [
      {
        id: 20,
        name: 'Creazy Chicken Box',
        price: 12.99,
        description: 'Crispy chicken pieces with sides',
        image: '🍗',
        rating: 4.6
      },
      {
        id: 21,
        name: 'Thai Veg Puff',
        price: 6.99,
        description: 'Vegetable puff with Thai spices',
        image: '🥟',
        rating: 4.5
      }
    ]
  };

  const availableDeals = [
    {
      id: 1,
      title: '৳100 off ৳500',
      description: 'Min. order ৳500 • Valid for new customers',
      code: 'NEW100',
      bgColor: '#1f2937'
    },
    {
      id: 2,
      title: '20% off',
      description: 'Up to ৳50 off • Min. order ৳300',
      code: 'SAVE20',
      bgColor: '#fce7f3'
    }
  ];

  const similarRestaurants = [
    { id: 1, name: 'Coffee World', rating: 4.5, image: '☕', deal: '30% off' },
    { id: 2, name: 'Cafe Delight', rating: 4.7, image: '🍰', deal: '₹100 off' },
    { id: 3, name: 'Brew Station', rating: 4.6, image: '☕', deal: 'Free delivery' },
    { id: 4, name: 'Sweet Treats', rating: 4.8, image: '🧁', deal: '25% off' }
  ];

  const handleAddToCart = (item) => {
    if (!isLoggedIn) {
      alert('Please login to add items to cart');
      return;
    }
    
    const cartItem = {
      ...item,
      restaurantName: restaurant?.name || 'Wellness Cafe',
      quantity: 1
    };
    
    onAddToCart(cartItem);
    setShowCart(true);
  };

  return (
    <div className="restaurant-detail-container">
      {/* Header with back button */}
      <div className="restaurant-detail-header">
        <button className="back-button" onClick={onBack}>
          ← Back
        </button>
      </div>

      {/* Restaurant Banner */}
      <div className="restaurant-banner">
        <div className="banner-image">
          <div className="banner-emoji">🍽️</div>
        </div>
        <div className="restaurant-info-banner">
          <h1 className="restaurant-name">{restaurant?.name || 'Wellness Cafe - Gulshan 2'}</h1>
          <div className="restaurant-meta">
            <span className="meta-item">⭐ {restaurant?.rating || '4.5'}</span>
            <span className="meta-item">📍 {restaurant?.address || 'Gulshan, Dhaka'}</span>
            <span className="meta-item">🕐 30-40 min</span>
          </div>
          <div className="restaurant-tags">
            <span className="tag">Cafe</span>
            <span className="tag">Coffee</span>
            <span className="tag">Desserts</span>
          </div>
        </div>
      </div>

      {/* Available Deals */}
      <section className="deals-section-detail">
        <h2 className="section-title-detail">Available deals</h2>
        <div className="deals-grid-detail">
          {availableDeals.map(deal => (
            <div 
              key={deal.id} 
              className="deal-card-detail"
              style={{ backgroundColor: deal.bgColor }}
            >
              <h3 className="deal-title-detail">{deal.title}</h3>
              <p className="deal-description">{deal.description}</p>
              <button className="deal-code-btn">Use code: {deal.code}</button>
            </div>
          ))}
        </div>
        <button className="view-all-deals">View all 3 offers</button>
      </section>

      {/* Menu Categories */}
      <section className="menu-section">
        <div className="menu-categories-scroll">
          {menuCategories.map(category => (
            <button
              key={category}
              className={`menu-category-btn ${selectedCategory === category ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Menu Items */}
        <div className="menu-items-container">
          <h2 className="menu-category-title">🔥 {selectedCategory}</h2>
          <p className="menu-category-subtitle">Most ordered right now</p>
          
          <div className="menu-items-grid">
            {menuItems[selectedCategory]?.map(item => (
              <div key={item.id} className="menu-item-card">
                <div className="menu-item-image">
                  <div className="menu-item-emoji">{item.image}</div>
                </div>
                <div className="menu-item-info">
                  <h3 className="menu-item-name">{item.name}</h3>
                  <p className="menu-item-description">{item.description}</p>
                  <div className="menu-item-footer">
                    <span className="menu-item-price">৳{item.price.toFixed(2)}</span>
                    <div className="menu-item-rating">
                      ⭐ {item.rating}
                    </div>
                  </div>
                </div>
                <button 
                  className="add-item-btn"
                  onClick={() => handleAddToCart(item)}
                >
                  +
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Similar Restaurants */}
      <section className="similar-restaurants-section">
        <h2 className="section-title-detail">Similar restaurants</h2>
        <div className="similar-restaurants-grid">
          {similarRestaurants.map(rest => (
            <div key={rest.id} className="similar-restaurant-card">
              <div className="similar-rest-image">
                <div className="similar-rest-emoji">{rest.image}</div>
                <div className="similar-rest-deal">{rest.deal}</div>
              </div>
              <div className="similar-rest-info">
                <h4>{rest.name}</h4>
                <div className="similar-rest-rating">⭐ {rest.rating}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer Info */}
      <div className="restaurant-footer-info">
        <div className="footer-info-section">
          <h3>📍 Location</h3>
          <p>{restaurant?.address || 'Gulshan 2, Dhaka 1212, Bangladesh'}</p>
        </div>
        <div className="footer-info-section">
          <h3>🕐 Opening hours</h3>
          <p>Monday - Sunday: 8:00 AM - 11:00 PM</p>
        </div>
        <div className="footer-info-section">
          <h3>💳 Payment methods</h3>
          <p>Cash, Card, Mobile Payment</p>
        </div>
      </div>
    </div>
  );
};

export default RestaurantDetail;