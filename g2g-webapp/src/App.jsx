import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navbar from './Components/Navbar'
import LoginForm from './Components/LoginForm'
import BannedScreen from './Components/BannedScreen'
import Home from './pages/Home'
import ProfilePage from './pages/ProfilePage'
import Fps from './pages/Fps'
import Admin from './pages/Admin'
import Community from './pages/Community'
import { AuthProvider, useAuth } from './contexts/AuthContext'

const AppContent = () => {
  const [showLoginForm, setShowLoginForm] = useState(false);
  const { isBanned } = useAuth();

  const toggleLoginForm = () => {
    setShowLoginForm(!showLoginForm);
  };

  const closeLoginForm = () => {
    setShowLoginForm(false);
  };

  // Show banned screen if user is banned
  if (isBanned) {
    return <BannedScreen />;
  }

  return (
    <Router>
      <div>
        <Navbar onLoginClick={toggleLoginForm} />
        <Routes>
          <Route path="/" element={<Home onLoginClick={toggleLoginForm} />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/fps" element={<Fps />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/community" element={<Community />} />
        </Routes>
        {showLoginForm && <LoginForm onClose={closeLoginForm}/>}
      </div>
    </Router>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App