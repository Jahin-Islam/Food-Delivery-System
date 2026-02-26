// import React, { useState } from 'react';
// import RiderDashboard from './riderpage/Riderdashboard.jsx';
// import './App.css';

// function App() {
//   const [isLoggedIn, setIsLoggedIn] = useState(true);
  
//   const mockRider = {
//     name: 'Piyush Agarwal',
//     id: 'RD-9577690140',
//     vehicle: 'Car',
//     phone: '9577690140',
//     email: 'agarwal.piyush123@outlook.com',
//     rating: 4.8,
//     totalReviews: 156
//   };

//   const handleLogout = () => {
//     setIsLoggedIn(false);
//     console.log('Rider logged out');
//   };

//   return (
//     <div className="App">
//       <RiderDashboard 
//         rider={mockRider}
//         onLogout={handleLogout}
//       />
//     </div>
//   );
// }

// export default App;


// import React, { useState } from 'react';
// import RiderDashboard from './riderpage/Riderdashboard.jsx';
// import './App.css';

// function App() {
//   const [isLoggedIn, setIsLoggedIn] = useState(true);
  
//   const mockRider = {
//     name: 'Piyush Agarwal',
//     id: 'RD-9577690140',
//     vehicle: 'Car',
//     phone: '9577690140',
//     email: 'agarwal.piyush123@outlook.com',
//     rating: 4.8,
//     totalReviews: 156
//   };

//   const handleLogout = () => {
//     setIsLoggedIn(false);
//     console.log('Rider logged out');
//   };

//   return (
//     <div className="App">
//       <RiderDashboard 
//         rider={mockRider}
//         onLogout={handleLogout}
//       />
//     </div>
//   );
// }

// export default App;

// import React, { useState } from 'react';
// import RiderDashboard from './riderpage/Riderdashboard.jsx';
// import './App.css';

// function App() {
//   const [isLoggedIn, setIsLoggedIn] = useState(true);
  
//   const mockRider = {
//     name: 'Piyush Agarwal',
//     id: 'RD-9577690140',
//     vehicle: 'Car',
//     phone: '9577690140',
//     email: 'agarwal.piyush123@outlook.com',
//     rating: 4.8,
//     totalReviews: 156
//   };

//   const handleLogout = () => {
//     setIsLoggedIn(false);
//     console.log('Rider logged out');
//   };

//   return (
//     <div className="App">
//       <RiderDashboard 
//         rider={mockRider}
//         onLogout={handleLogout}
//       />
//     </div>
//   );
// }

// export default App;


// import React, { useState } from 'react';
// import RiderDashboard from './riderpage/Riderdashboard.jsx';
// import './App.css';

// function App() {
//   const [isLoggedIn, setIsLoggedIn] = useState(true);
  
//   const mockRider = {
//     name: 'Piyush Agarwal',
//     id: 'RD-9577690140',
//     vehicle: 'Car',
//     phone: '9577690140',
//     email: 'agarwal.piyush123@outlook.com',
//     rating: 4.8,
//     totalReviews: 156
//   };

//   const handleLogout = () => {
//     setIsLoggedIn(false);
//     console.log('Rider logged out');
//   };

//   return (
//     <div className="App">
//       <RiderDashboard 
//         rider={mockRider}
//         onLogout={handleLogout}
//       />
//     </div>
//   );
// }

// export default App;


import { useState, useEffect } from 'react';
import Homepage from './homepage/homepage.jsx';
import RestaurantDetail from './homepage/RestaurantDetail.jsx';
import BusinessDashboard from './business onwer page/Businessdashboard.jsx';
import BusinessWelcome from './business onwer page/BusinessWelcome.jsx'; // ← ADDED
import Orders from './business onwer page/Orders.jsx';
import OrderHistory from './business onwer page/Orderhistory.jsx';
import Checkout from './homepage/Checkout.jsx';
import Profile from './homepage/Profile.jsx';
import SignIn from './log in and sign up/log_in_page.jsx';
import SignUp from './log in and sign up/sign_up_page.jsx';
import RestaurantLogin from './homepage/RestaurantLogIn.jsx';
import RestaurantSignUp from './homepage/RestaurantSignUp.jsx';
import RiderSignUp from './homepage/RiderSignUp.jsx';
import RiderOnBoarding from './homepage/RiderOnBoarding.jsx';
import authService from './Authservice.js';
import cartService from './Cartservice.js';
import cartApiService from './Cartapiservice.js';

function App() {
  const [currentPage, setCurrentPage] = useState('home'); // 'home', 'restaurant', 'business-welcome', 'business-dashboard', 'orders', 'order-history', 'checkout', 'profile', 'login', 'signup', 'restaurant-login', 'restaurant-signup', 'rider-signup', 'rider-onboarding'
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [checkoutRestaurantId, setCheckoutRestaurantId] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [isInitializing, setIsInitializing] = useState(true);

  // ============================================
  // INITIALIZE APP - Check auth and load cart
  // ============================================
  useEffect(() => {
    const initializeApp = async () => {
      try {
        setIsInitializing(true);

        // Check authentication status
        const authState = await authService.initialize();
        setIsLoggedIn(authState.isAuthenticated);
        setUser(authState.user);

        // Load cart from localStorage
        const savedCart = cartService.loadCart();
        setCartItems(savedCart);

        console.log('App initialized:', {
          isAuthenticated: authState.isAuthenticated,
          user: authState.user,
          cartItems: savedCart.length
        });
      } catch (error) {
        console.error('App initialization error:', error);
        // On error, assume not logged in
        setIsLoggedIn(false);
        setUser(null);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeApp();
  }, []);

  // ============================================
  // SAVE CART whenever it changes
  // ============================================
  useEffect(() => {
    if (!isInitializing) {
      cartService.saveCart(cartItems);
      console.log('Cart saved to localStorage:', cartItems.length, 'items');
    }
  }, [cartItems, isInitializing]);

  // ============================================
  // CART MANAGEMENT
  // ============================================

  // Smart Add to Cart - Increases quantity if item already exists
  const handleAddToCart = (newItem) => {
    setCartItems(prevItems => {
      const existingItemIndex = prevItems.findIndex(
        item => item.foodId === newItem.foodId && 
                item.restaurantId === newItem.restaurantId
      );

      if (existingItemIndex !== -1) {
        // Item exists - increase quantity
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + 1
        };
        console.log('Increased quantity:', updatedItems[existingItemIndex].name);
        return updatedItems;
      } else {
        // New item - add to cart
        console.log('Added new item:', newItem.name);
        return [...prevItems, { ...newItem, quantity: 1 }];
      }
    });
  };

  const handleUpdateQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      handleRemoveItem(itemId);
      return;
    }
    
    setCartItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const handleRemoveItem = (itemId) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== itemId));
  };

  const handleClearCart = () => {
    setCartItems([]);
    cartService.clearCart();
  };

  // ============================================
  // NAVIGATION
  // ============================================

  const handleRestaurantClick = (restaurant) => {
    setSelectedRestaurant(restaurant);
    setCurrentPage('restaurant');
  };

  const handleBusinessDashboardClick = (restaurant) => {
    setSelectedRestaurant(restaurant);
    setCurrentPage('business-dashboard');
  };

  const handleNavigateToOrders = () => {
    setCurrentPage('orders');
  };

  const handleNavigateToMenu = () => {
    setCurrentPage('business-dashboard');
  };

  const handleNavigateToOrderHistory = () => {
    setCurrentPage('order-history');
  };

  const handleBackToHome = () => {
    setCurrentPage('home');
    setSelectedRestaurant(null);
    setCheckoutRestaurantId(null);
  };

  const handleBackToRestaurant = () => {
    setCurrentPage('restaurant');
    setCheckoutRestaurantId(null);
  };

  // Handle checkout navigation - FIXED to pass restaurant ID
  const handleCheckout = (restaurantId) => {
    console.log('Navigating to checkout for restaurant:', restaurantId);
    setCheckoutRestaurantId(restaurantId);
    setCurrentPage('checkout');
  };

  // ============================================
  // AUTH HANDLERS - FIXED
  // ============================================

  const handleLoginClick = () => {
    console.log('Navigating to login page');
    setCurrentPage('login');
  };

  const handleSignUpClick = () => {
    console.log('Navigating to signup page');
    setCurrentPage('signup');
  };

  const handleProfileClick = () => {
    console.log('Navigating to profile page');
    setCurrentPage('profile');
  };

  const handleOrdersClick = () => {
    console.log('Navigating to orders page');
    // TODO: Implement orders page
    alert('Orders page coming soon!');
  };

  const handleLoginSuccess = async (userData) => {
    console.log('Login successful:', userData);
    setIsLoggedIn(true);
    setUser(authService.getUser());
    setCurrentPage('home'); // Go back to home page after login
  };

  const handleSignUpSuccess = async (userData) => {
    console.log('Sign up successful:', userData);
    setIsLoggedIn(true);
    setUser(authService.getUser());
    setCurrentPage('home'); // Go back to home page after signup
  };

  // Restaurant Partner Authentication Handlers
  const handleRestaurantLoginSuccess = async (userData) => {
    console.log('Restaurant partner login successful:', userData);
    setIsLoggedIn(true);
    setUser(authService.getUser());
    
    // Get restaurant data from authService or use provided data
    const restaurantData = authService.getRestaurantData() || userData.restaurant;
    
    if (restaurantData) {
      setSelectedRestaurant(restaurantData);
    } else {
      // Fallback to mock data if backend doesn't return restaurant yet
      setSelectedRestaurant({
        id: 1,
        name: userData.businessName || "Rice & Beyond",
        description: "Food • Restaurant",
        address: "Dhaka, Bangladesh",
        rating: 4.8,
        total_rated: 1732,
        total_reviews: 1732,
        min_order: 50,
        image_url: null,
        percentage: 10,
        opening_time: "10:00 AM",
        closing_time: "11:00 PM",
        phone: "+880123456789"
      });
    }
    
    // Sync any local cart items to backend
    try {
      await cartApiService.syncCartAfterLogin();
    } catch (error) {
      console.error('Cart sync error:', error);
    }
    
    setCurrentPage('business-welcome'); // ← CHANGED: was 'business-dashboard'
  };

  const handleRestaurantSignUpSuccess = async (userData) => {
    console.log('Restaurant partner signup successful:', userData);
    setIsLoggedIn(true);
    setUser(authService.getUser());
    
    // Get restaurant data from authService or use provided data
    const restaurantData = authService.getRestaurantData() || userData.restaurant;
    
    if (restaurantData) {
      setSelectedRestaurant(restaurantData);
    } else {
      // Fallback to mock data if backend doesn't return restaurant yet
      setSelectedRestaurant({
        id: 1,
        name: userData.businessName || "Rice & Beyond",
        description: "Food • Restaurant",
        address: "Dhaka, Bangladesh",
        rating: 4.8,
        total_rated: 1732,
        total_reviews: 1732,
        min_order: 50,
        image_url: null,
        percentage: 10,
        opening_time: "10:00 AM",
        closing_time: "11:00 PM",
        phone: "+880123456789"
      });
    }
    
    // Sync any local cart items to backend
    try {
      await cartApiService.syncCartAfterLogin();
    } catch (error) {
      console.error('Cart sync error:', error);
    }
    
    setCurrentPage('business-welcome'); // ← CHANGED: was 'business-dashboard'
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      setIsLoggedIn(false);
      setUser(null);
      setSelectedRestaurant(null); // Clear restaurant data
      setCartItems([]);
      cartService.clearCart();
      setCurrentPage('home');
      console.log('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if API call fails
      setIsLoggedIn(false);
      setUser(null);
      setSelectedRestaurant(null);
      setCartItems([]);
      cartService.clearCart();
      setCurrentPage('home');
    }
  };

  const handleSwitchToLogin = () => {
    setCurrentPage('login');
  };

  const handleSwitchToSignUp = () => {
    setCurrentPage('signup');
  };

  // Restaurant handlers
  const handleRestaurantLoginClick = () => {
    setCurrentPage('restaurant-login');
  };

  const handleSwitchToRestaurantSignUp = () => {
    setCurrentPage('restaurant-signup');
  };

  const handleSwitchToRestaurantLogin = () => {
    setCurrentPage('restaurant-login');
  };

  // Rider handlers
  const handleRiderSignUpClick = () => {
    setCurrentPage('rider-signup');
  };

  const handleRiderOnBoardingClick = () => {
    setCurrentPage('rider-onboarding');
  };

  const handleRiderOnBoardingCompletion = () => {
    console.log('Rider onboarding completed');
    alert('Onboarding completed! Welcome to foodpanda! 🎉');
    setCurrentPage('home');
  };

  // Handle Place Order
  const handlePlaceOrder = (orderData) => {
    console.log('Order placed:', orderData);
    
    // Clear cart items for this restaurant
    const updatedCart = cartItems.filter(
      item => item.restaurantId !== checkoutRestaurantId
    );
    setCartItems(updatedCart);
    
    // Show success message
    alert('Order placed successfully! 🎉');
    
    // Go back to home
    setCurrentPage('home');
    setCheckoutRestaurantId(null);
    setSelectedRestaurant(null);
  };

  // ============================================
  // LOADING STATE
  // ============================================

  if (isInitializing) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{ fontSize: '48px' }}>🔄</div>
        <p style={{ fontSize: '18px', color: '#6b7280' }}>Loading...</p>
      </div>
    );
  }

  // ============================================
  // RENDER - Show different pages based on currentPage state
  // ============================================

  return (
    <div className="App">
      {/* LOGIN PAGE */}
      {currentPage === 'login' && (
        <SignIn
          onSwitchToSignUp={handleSwitchToSignUp}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {/* SIGNUP PAGE */}
      {currentPage === 'signup' && (
        <SignUp
          onSwitchToSignIn={handleSwitchToLogin}
          onSignUpSuccess={handleSignUpSuccess}
        />
      )}

      {/* HOME PAGE */}
      {currentPage === 'home' && (
        <Homepage
          isLoggedIn={isLoggedIn}
          user={user}
          cartItems={cartItems}
          setCartItems={setCartItems}
          onAddToCart={handleAddToCart}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onLoginClick={handleLoginClick}
          onSignUpClick={handleSignUpClick}
          onRestaurantSignUpClick={handleSwitchToRestaurantSignUp}
          onLogout={handleLogout}
          onRestaurantClick={handleRestaurantClick}
          onBusinessDashboardClick={handleBusinessDashboardClick}
          onCheckout={handleCheckout}
          onProfileClick={handleProfileClick}
          onOrdersClick={handleOrdersClick}
        />
      )}

      {/* PROFILE PAGE */}
      {currentPage === 'profile' && (
        <Profile
          isLoggedIn={isLoggedIn}
          user={user}
          cartItems={cartItems}
          onBack={handleBackToHome}
          onLoginClick={handleLoginClick}
          onSignUpClick={handleSignUpClick}
          onLogout={handleLogout}
        />
      )}

      {/* RESTAURANT DETAIL PAGE */}
      {currentPage === 'restaurant' && selectedRestaurant && (
        <RestaurantDetail
          restaurant={selectedRestaurant}
          onBack={handleBackToHome}
          onAddToCart={handleAddToCart}
          cartItems={cartItems}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onCheckout={handleCheckout}
          isLoggedIn={isLoggedIn}
          user={user}
          onLoginClick={handleLoginClick}
          onSignUpClick={handleSignUpClick}
          onLogout={handleLogout}
        />
      )}

      {/* BUSINESS WELCOME PAGE */}
      {currentPage === 'business-welcome' && selectedRestaurant && (
        <BusinessWelcome
          user={user}
          restaurant={selectedRestaurant}
          onEnterDashboard={() => setCurrentPage('business-dashboard')}
          onLogout={handleLogout}
        />
      )}

      {/* BUSINESS DASHBOARD PAGE */}
      {currentPage === 'business-dashboard' && selectedRestaurant && (
        <BusinessDashboard
          restaurant={selectedRestaurant}
          onBack={() => setCurrentPage('business-welcome')}
          isLoggedIn={isLoggedIn}
          user={user}
          onLoginClick={handleLoginClick}
          onSignUpClick={handleSignUpClick}
          onLogout={handleLogout}
          onNavigateToOrders={handleNavigateToOrders}
        />
      )}

      {/* ORDERS PAGE */}
      {currentPage === 'orders' && (
        <Orders
          isLoggedIn={isLoggedIn}
          user={user}
          onLogout={handleLogout}
          onNavigateToMenu={handleNavigateToMenu}
          onNavigateToOrderHistory={handleNavigateToOrderHistory}
        />
      )}

      {/* ORDER HISTORY PAGE */}
      {currentPage === 'order-history' && (
        <OrderHistory
          isLoggedIn={isLoggedIn}
          user={user}
          onLogout={handleLogout}
          onNavigateToMenu={handleNavigateToMenu}
          onNavigateToOrders={handleNavigateToOrders}
        />
      )}

      {/* CHECKOUT PAGE */}
      {currentPage === 'checkout' && checkoutRestaurantId && (
        <Checkout
          restaurant={
            // Find restaurant data from selectedRestaurant or cart items
            selectedRestaurant || 
            (cartItems.find(item => item.restaurantId === checkoutRestaurantId) && {
              id: checkoutRestaurantId,
              name: cartItems.find(item => item.restaurantId === checkoutRestaurantId).restaurant,
              image_url: cartItems.find(item => item.restaurantId === checkoutRestaurantId).restaurantImage
            })
          }
          cartItems={cartItems.filter(item => item.restaurantId === checkoutRestaurantId)}
          allCartItems={cartItems}
          onBack={selectedRestaurant ? handleBackToRestaurant : handleBackToHome}
          isLoggedIn={isLoggedIn}
          user={user}
          onLoginClick={handleLoginClick}
          onSignUpClick={handleSignUpClick}
          onLogout={handleLogout}
          onPlaceOrder={handlePlaceOrder}
          onCheckout={handleCheckout}
        />
      )}

      {/* RESTAURANT LOGIN PAGE */}
      {currentPage === 'restaurant-login' && (
        <RestaurantLogin
          onSwitchToSignUp={handleSwitchToRestaurantSignUp}
          onLoginSuccess={handleRestaurantLoginSuccess}
        />
      )}

      {/* RESTAURANT SIGNUP PAGE */}
      {currentPage === 'restaurant-signup' && (
        <RestaurantSignUp
          onSwitchToLogin={handleSwitchToRestaurantLogin}
          onRiderSignUp={handleRiderSignUpClick}
          onSignUpSuccess={handleRestaurantSignUpSuccess}
        />
      )}

      {/* RIDER SIGNUP PAGE */}
      {currentPage === 'rider-signup' && (
        <RiderSignUp
          onSignUpSuccess={handleLoginSuccess}
          onRiderOnBoarding={handleRiderOnBoardingClick}
        />
      )}

      {/* RIDER ONBOARDING PAGE */}
      {currentPage === 'rider-onboarding' && (
        <RiderOnBoarding
          onCompletion={handleRiderOnBoardingCompletion}
        />
      )}
    </div>
  );
}

export default App;