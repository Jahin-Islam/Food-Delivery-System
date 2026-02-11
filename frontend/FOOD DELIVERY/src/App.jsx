import { useState, useEffect } from 'react';
import Homepage from './homepage/homepage.jsx';
import RestaurantDetail from './homepage/RestaurantDetail.jsx';
import Checkout from './homepage/Checkout.jsx';
import SignIn from './log in and sign up/log_in_page.jsx';
import SignUp from './log in and sign up/sign_up_page.jsx';
import RestaurantLogin from './homepage/RestaurantLogIn.jsx';
import RestaurantSignUp from './homepage/RestaurantSignUp.jsx';
import RiderSignUp from './homepage/RiderSignUp.jsx';
import RiderOnBoarding from './homepage/RiderOnBoarding.jsx';
import authService from './Authservice.js';
import cartService from './Cartservice.js';

function App() {
  const [currentPage, setCurrentPage] = useState('home'); // 'home', 'restaurant', 'checkout', 'login', 'signup', 'restaurant-login', 'restaurant-signup', 'rider-signup', 'rider-onboarding'
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

  const handleRestaurantSignUpClick = () => {
    console.log('Restaurant sign up clicked');
    setCurrentPage('restaurant-signup');
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

  const handleLogout = async () => {
    try {
      await authService.logout();
      setIsLoggedIn(false);
      setUser(null);
      setCartItems([]);
      cartService.clearCart();
      setCurrentPage('home');
      console.log('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
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
          onRestaurantSignUpClick={handleRestaurantSignUpClick}
          onLogout={handleLogout}
          onRestaurantClick={handleRestaurantClick}
          onCheckout={handleCheckout}
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
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {/* RESTAURANT SIGNUP PAGE */}
      {currentPage === 'restaurant-signup' && (
        <RestaurantSignUp
          onSwitchToLogin={handleSwitchToRestaurantLogin}
          onRiderSignUp={handleRiderSignUpClick}
          onSignUpSuccess={handleLoginSuccess}
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