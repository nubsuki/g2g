import React, { useState } from 'react'
import Navbar from './Components/Navbar'
import LoginForm from './Components/LoginForm'
import Profile from './Components/Profile'
import { AuthProvider } from './contexts/AuthContext'

const App = () => {
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const toggleLoginForm = () => {
    setShowLoginForm(!showLoginForm);
  };

  const closeLoginForm = () => {
    setShowLoginForm(false);
  };

  const toggleProfile = () => {
    setShowProfile(!showProfile);
  };

  const closeProfile = () => {
    setShowProfile(false);
  };

  return (
    <AuthProvider>
      <div>
        <Navbar 
          onLoginClick={toggleLoginForm}
          onProfileClick={toggleProfile}
        />
        {showLoginForm && <LoginForm onClose={closeLoginForm}/>}
        {showProfile && <Profile onClose={closeProfile}/>}
      </div>
    </AuthProvider>
  )
}

export default App