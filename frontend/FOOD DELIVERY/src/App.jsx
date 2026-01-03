import { useState } from 'react';
import SignIn from './log in and sign up/log_in_page.jsx';
import SignUp from './log in and sign up/sign_up_page.jsx';
import Homepage from './homepage/homepage.jsx';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState('signup');

  return (
    <>
      {currentView === 'signin' ? (
        <SignIn onSwitchToSignUp={() => setCurrentView('signup')} />
      ) : (
        <SignUp onSwitchToSignIn={() => setCurrentView('signin')} />
      )}
      {/* <Homepage/> */}
    </>
  );
}

export default App;