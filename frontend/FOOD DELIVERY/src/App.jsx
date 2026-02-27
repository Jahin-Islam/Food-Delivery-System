import { useState, useEffect, useCallback } from 'react';
import Homepage from './homepage/homepage.jsx';
import RestaurantDetail from './homepage/RestaurantDetail.jsx';
import BusinessDashboard from './business onwer page/Businessdashboard.jsx';
import BusinessWelcome from './business onwer page/BusinessWelcome.jsx';
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

const BUSINESS_PAGES = new Set(['business-welcome','business-dashboard','orders','order-history']);

function App() {
  const [currentPage,          setCurrentPage]          = useState('home');
  const [selectedRestaurant,   setSelectedRestaurant]   = useState(null);
  const [checkoutRestaurantId, setCheckoutRestaurantId] = useState(null);
  const [isLoggedIn,           setIsLoggedIn]           = useState(false);
  const [user,                 setUser]                 = useState(null);
  const [cartItems,            setCartItems]            = useState([]);
  const [isInitializing,       setIsInitializing]       = useState(true);

  // Push a history entry and change page
  const push = useCallback((page, extra = {}) => {
    window.history.pushState({ page, ...extra }, '', '#' + page);
    setCurrentPage(page);
  }, []);

  // Browser back/forward
  useEffect(() => {
    const onPop = (e) => {
      const state = e.state;
      const dest  = state?.page ?? 'home';

      // If on a business page and pressing back to non-business, stay in dashboard
      if (BUSINESS_PAGES.has(currentPage) && !BUSINESS_PAGES.has(dest) && dest !== 'home') {
        setCurrentPage('business-dashboard');
        return;
      }

      setCurrentPage(dest);
      if (state?.restaurant)           setSelectedRestaurant(state.restaurant);
      if ('checkoutRestaurantId' in (state ?? {})) setCheckoutRestaurantId(state.checkoutRestaurantId);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [currentPage]);

  // Initialize
  useEffect(() => {
    const init = async () => {
      try {
        const authState = await authService.initialize();
        setIsLoggedIn(authState.isAuthenticated);
        setUser(authState.user);
        if (authState.isAuthenticated) {
          const items = await cartApiService.getAllCarts();
          setCartItems(items);
          cartService.saveCart(items);
        } else {
          setCartItems(cartService.loadCart());
        }
      } catch (err) {
        console.error('Init error:', err);
        setCartItems(cartService.loadCart());
      } finally {
        setIsInitializing(false);
        // Seed history so back button works from first page
        window.history.replaceState({ page: 'home' }, '', '#home');
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!isInitializing && !isLoggedIn) cartService.saveCart(cartItems);
  }, [cartItems, isInitializing, isLoggedIn]);

  const reloadBackendCart = async () => {
    try {
      const items = await cartApiService.getAllCarts();
      setCartItems(items);
      cartService.saveCart(items);
    } catch (e) { console.error(e); }
  };

  // Cart ops
  const handleAddToCart = async (newItem) => {
    if (isLoggedIn && newItem.restaurantId) {
      try {
        await cartApiService.addToCart(newItem.restaurantId, { food_id: newItem.foodId ?? newItem.food_id, quantity: newItem.quantity ?? 1 });
        await reloadBackendCart(); return;
      } catch (e) { console.error(e); }
    }
    setCartItems(prev => {
      const idx = prev.findIndex(i => i.foodId === newItem.foodId && i.restaurantId === newItem.restaurantId);
      if (idx !== -1) { const u=[...prev]; u[idx]={...u[idx],quantity:u[idx].quantity+1}; return u; }
      return [...prev, { ...newItem, quantity: newItem.quantity ?? 1 }];
    });
  };

  const handleUpdateQuantity = async (itemId, qty) => {
    if (qty <= 0) { handleRemoveItem(itemId); return; }
    const item = cartItems.find(i => i.id === itemId);
    if (isLoggedIn && item?.restaurantId) {
      try { await cartApiService.updateCartItem(item.restaurantId, item.foodId??item.food_id, qty); await reloadBackendCart(); return; }
      catch (e) { console.error(e); }
    }
    setCartItems(prev => prev.map(i => i.id===itemId ? {...i,quantity:qty} : i));
  };

  const handleRemoveItem = async (itemId) => {
    const item = cartItems.find(i => i.id === itemId);
    if (isLoggedIn && item?.restaurantId) {
      try { await cartApiService.removeFromCart(item.restaurantId, item.foodId??item.food_id); await reloadBackendCart(); return; }
      catch (e) { console.error(e); }
    }
    setCartItems(prev => prev.filter(i => i.id !== itemId));
  };

  // Navigation helpers
  const goHome = useCallback(() => {
    setSelectedRestaurant(null);
    setCheckoutRestaurantId(null);
    window.history.pushState({ page:'home' }, '', '#home');
    setCurrentPage('home');
  }, []);

  const goToRestaurant = useCallback((restaurant) => {
    setSelectedRestaurant(restaurant);
    window.history.pushState({ page:'restaurant', restaurant }, '', '#restaurant');
    setCurrentPage('restaurant');
  }, []);

  const goToCheckout = useCallback((restaurantId) => {
    setCheckoutRestaurantId(restaurantId);
    window.history.pushState({ page:'checkout', checkoutRestaurantId: restaurantId }, '', '#checkout');
    setCurrentPage('checkout');
  }, []);

  // Auth
  const handleLoginSuccess = async () => {
    setIsLoggedIn(true); setUser(authService.getUser());
    try { await cartApiService.syncCartAfterLogin(); } catch(e){}
    await reloadBackendCart();
    goHome();
  };

  const handleSignUpSuccess = async () => {
    setIsLoggedIn(true); setUser(authService.getUser());
    try { await cartApiService.syncCartAfterLogin(); } catch(e){}
    await reloadBackendCart();
    goHome();
  };

  const handleRestaurantLoginSuccess = async (userData) => {
    setIsLoggedIn(true); setUser(authService.getUser());
    const r = authService.getRestaurantData() ?? userData?.restaurant ?? { id:1, name:userData?.businessName??'My Restaurant', address:'Dhaka, Bangladesh', rating:4.8 };
    setSelectedRestaurant(r);
    window.history.pushState({ page:'business-welcome', restaurant:r }, '', '#business-welcome');
    setCurrentPage('business-welcome');
  };

  const handleRestaurantSignUpSuccess = async (userData) => {
    setIsLoggedIn(true); setUser(authService.getUser());
    const r = authService.getRestaurantData() ?? userData?.restaurant ?? { id:1, name:userData?.businessName??'My Restaurant', address:'Dhaka, Bangladesh', rating:4.8 };
    setSelectedRestaurant(r);
    window.history.pushState({ page:'business-welcome', restaurant:r }, '', '#business-welcome');
    setCurrentPage('business-welcome');
  };

  const handleLogout = async () => {
    try { await authService.logout(); } catch(e){}
    setIsLoggedIn(false); setUser(null); setSelectedRestaurant(null);
    setCartItems([]); cartService.clearCart();
    goHome();
  };

  const handlePlaceOrder = () => {
    setCartItems(prev => prev.filter(i => i.restaurantId !== checkoutRestaurantId));
    alert('Order placed successfully! 🎉');
    goHome();
  };

  if (isInitializing) return (
    <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',flexDirection:'column',gap:20}}>
      <div style={{fontSize:48}}>🐼</div>
      <p style={{fontSize:18,color:'#6b7280'}}>Loading foodpanda…</p>
    </div>
  );

  // Common props for every page that contains a Header
  const H = {
    isLoggedIn, user,
    onLoginClick:   () => push('login'),
    onSignUpClick:  () => push('signup'),
    onLogout:       handleLogout,
    onProfileClick: () => push('profile'),
    onOrdersClick:  () => alert('Orders coming soon!'),
    onLogoClick:    goHome,
  };

  return (
    <div className="App">

      {currentPage === 'login' && (
        <SignIn onSwitchToSignUp={() => push('signup')} onLoginSuccess={handleLoginSuccess} />
      )}

      {currentPage === 'signup' && (
        <SignUp onSwitchToSignIn={() => push('login')} onSignUpSuccess={handleSignUpSuccess} />
      )}

      {currentPage === 'home' && (
        <Homepage
          {...H}
          cartItems={cartItems} setCartItems={setCartItems}
          onAddToCart={handleAddToCart} onUpdateQuantity={handleUpdateQuantity} onRemoveItem={handleRemoveItem}
          onRestaurantSignUpClick={() => push('restaurant-signup')}
          onRestaurantClick={goToRestaurant}
          onBusinessDashboardClick={(r) => { setSelectedRestaurant(r); push('business-dashboard'); }}
          onCheckout={goToCheckout}
        />
      )}

      {currentPage === 'profile' && (
        <Profile {...H} cartItems={cartItems} onBack={goHome} />
      )}

      {currentPage === 'restaurant' && selectedRestaurant && (
        <RestaurantDetail
          {...H}
          restaurant={selectedRestaurant}
          onBack={goHome}
          onAddToCart={handleAddToCart}
          cartItems={cartItems}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onCheckout={goToCheckout}
          onNavigateToRestaurant={goToRestaurant}
        />
      )}

      {currentPage === 'business-welcome' && selectedRestaurant && (
        <BusinessWelcome
          user={user} restaurant={selectedRestaurant}
          onEnterDashboard={() => push('business-dashboard')}
          onLogout={handleLogout}
        />
      )}

      {currentPage === 'business-dashboard' && selectedRestaurant && (
        <BusinessDashboard
          {...H} restaurant={selectedRestaurant}
          onBack={() => push('business-welcome')}
          onNavigateToOrders={() => push('orders')}
        />
      )}

      {currentPage === 'orders' && (
        <Orders {...H}
          onNavigateToMenu={() => push('business-dashboard')}
          onNavigateToOrderHistory={() => push('order-history')}
        />
      )}

      {currentPage === 'order-history' && (
        <OrderHistory {...H}
          onNavigateToMenu={() => push('business-dashboard')}
          onNavigateToOrders={() => push('orders')}
        />
      )}

      {currentPage === 'checkout' && checkoutRestaurantId && (
        <Checkout
          {...H}
          restaurant={selectedRestaurant ?? (() => { const f=cartItems.find(i=>i.restaurantId===checkoutRestaurantId); return f?{id:checkoutRestaurantId,name:f.restaurant,image_url:f.image}:null; })()}
          cartItems={cartItems.filter(i => i.restaurantId === checkoutRestaurantId)}
          allCartItems={cartItems}
          onBack={() => selectedRestaurant ? goToRestaurant(selectedRestaurant) : goHome()}
          onPlaceOrder={handlePlaceOrder}
          onCheckout={goToCheckout}
        />
      )}

      {currentPage === 'restaurant-login' && (
        <RestaurantLogin
          onSwitchToSignUp={() => push('restaurant-signup')}
          onLoginSuccess={handleRestaurantLoginSuccess}
        />
      )}

      {currentPage === 'restaurant-signup' && (
        <RestaurantSignUp
          onSwitchToLogin={() => push('restaurant-login')}
          onRiderSignUp={() => push('rider-signup')}
          onSignUpSuccess={handleRestaurantSignUpSuccess}
        />
      )}

      {currentPage === 'rider-signup' && (
        <RiderSignUp onSignUpSuccess={handleLoginSuccess} onRiderOnBoarding={() => push('rider-onboarding')} />
      )}

      {currentPage === 'rider-onboarding' && (
        <RiderOnBoarding onCompletion={() => { alert('Welcome! 🎉'); goHome(); }} />
      )}

    </div>
  );
}

export default App;