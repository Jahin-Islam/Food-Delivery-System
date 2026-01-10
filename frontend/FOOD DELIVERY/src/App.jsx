import { useState } from 'react';
import SignIn from './log in and sign up/log_in_page.jsx';
import SignUp from './log in and sign up/sign_up_page.jsx';
import Homepage from './homepage/homepage.jsx';
import './App.css';
function App() {
  const [currentPage, setCurrentPage] = useState("home"); // 'home', 'signin', 'signup'
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cartItems, setCartItems] = useState([]);

  // Handle successful login
  const handleLoginSuccess = (userData) => {
    setIsLoggedIn(true);
    setCurrentPage("home");
    // You can store user data here if needed
  };

  // Handle successful signup
  const handleSignUpSuccess = (userData) => {
    setIsLoggedIn(true);
    setCurrentPage("home");
    // You can store user data here if needed
  };

  // Handle logout
  const handleLogout = () => {
    setIsLoggedIn(false);
    setCartItems([]);
    setCurrentPage("home");
  };

  // Navigate to different pages
  const navigateTo = (page) => {
    setCurrentPage(page);
  };

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
      case "home":
      default:
        return (
          <Homepage
            isLoggedIn={isLoggedIn}
            cartItems={cartItems}
            setCartItems={setCartItems}
            onLoginClick={() => navigateTo("signin")}
            onSignUpClick={() => navigateTo("signup")}
            onLogout={handleLogout}
          />
        );
    }
  };

  return <div className="app">{renderPage()}</div>;
}

export default App;