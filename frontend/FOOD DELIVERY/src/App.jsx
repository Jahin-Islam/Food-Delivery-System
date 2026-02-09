import { useState, useEffect } from 'react';
import SignIn from './log in and sign up/log_in_page.jsx';
import SignUp from './log in and sign up/sign_up_page.jsx';
import Homepage from './homepage/homepage.jsx';
import RestaurantDetail from './homepage/RestaurantDetail.jsx';
import RestaurantPartnerSignUp from './homepage/RestaurantSignUp.jsx';
import RestaurantLogIn from './homepage/RestaurantLogIn.jsx';
import RiderSignUp  from './homepage/RiderSignUp.jsx';
import RiderOnBoarding from './homepage/RiderOnBoarding.jsx';
import authService from './Authservice.js';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState("home");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);

  // Check authentication status on app load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          const userData = authService.getUser();
          if (userData) {
            setUser(userData);
            setIsLoggedIn(true);
          } else {
            // Try to fetch user data
            const currentUser = await authService.getCurrentUser();
            if (currentUser) {
              setUser(currentUser);
              setIsLoggedIn(true);
              authService.saveUser(currentUser);
            }
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
        authService.clearTokens();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Handle successful login
  const handleLoginSuccess = async (userData) => {
    setUser(userData);
    setIsLoggedIn(true);
    setCurrentPage("home");
  };

  // Handle successful signup
  const handleSignUpSuccess = async (userData) => {
    setUser(userData);
    setIsLoggedIn(true);
    setCurrentPage("home");
  };

  // Handle logout
  const handleLogout = () => {
    authService.logout();
    setIsLoggedIn(false);
    setUser(null);
    setCartItems([]);
    setCurrentPage("home");
  };

  // Navigate to different pages
  const navigateTo = (page) => {
    setCurrentPage(page);
  };

  // Handle restaurant click
  const handleRestaurantClick = (restaurant) => {
    setSelectedRestaurant(restaurant);
    setCurrentPage("restaurant-detail");
  };

  // Handle back from restaurant detail
  const handleBackToHome = () => {
    setSelectedRestaurant(null);
    setCurrentPage("home");
  };

  // Handle add to cart from restaurant detail
  const handleAddToCart = (item) => {
    if (!isLoggedIn) {
      alert('Please login to add items to cart');
      navigateTo("signin");
      return;
    }

    const newItem = {
      id: `${item.id}-${Date.now()}`,
      name: item.name,
      restaurant: item.restaurantName,
      price: item.price,
      quantity: item.quantity || 1,
      emoji: item.image
    };
    
    setCartItems([...cartItems, newItem]);
  };

  // Show loading screen while checking auth
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '24px',
        color: '#db2777'
      }}>
        Loading...
      </div>
    );
  }

  // Render the appropriate page
  const renderPage = () => {
    switch (currentPage) {
      case "signin":
        return (
          <SignIn
            onSwitchToSignUp={() => navigateTo("signup")}
            onLoginSuccess={handleLoginSuccess}
          />
        );
      case "signup":
        return (
          <SignUp
            onSwitchToSignIn={() => navigateTo("signin")}
            onSignUpSuccess={handleSignUpSuccess}
          />
        );
      case "restaurant-signup":
        return (
          <RestaurantPartnerSignUp
            onSwitchToLogin={() => navigateTo("restaurant-signin")}
            onRiderSignUp={() => navigateTo("rider-signup")}
            onSignUpSuccess={handleSignUpSuccess}
          />
        );
      case "restaurant-signin":
        return (
          <RestaurantLogIn
            onSwitchToSignUp={() => navigateTo("restaurant-signup")}
            onLoginSuccess={handleLoginSuccess}
          />
        );
      case "rider-onboarding":
        return (
          <RiderOnBoarding
            onCompletion={() => navigateTo("home")}
          />
        );
      case "rider-signup":
        return (
          <RiderSignUp
            onSignUpSuccess={handleSignUpSuccess}
            onRiderOnBoarding={() => navigateTo("rider-onboarding")}
          />
        );
      case "restaurant-detail":
        return (
          <RestaurantDetail
            restaurant={selectedRestaurant}
            onBack={handleBackToHome}
            onAddToCart={handleAddToCart}
            isLoggedIn={isLoggedIn}
          />
        );
      case "home":
      default:
        return (
          <Homepage
            isLoggedIn={isLoggedIn}
            user={user}
            cartItems={cartItems}
            setCartItems={setCartItems}
            onLoginClick={() => navigateTo("signin")}
            onSignUpClick={() => navigateTo("signup")}
            onRestaurantSignUpClick={() => navigateTo("restaurant-signup")}
            onLogout={handleLogout}
            onRestaurantClick={handleRestaurantClick}
          />
        );
    }
  };
 
  return renderPage();
}

export default App;