import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navbar from './Components/Navbar'
import LoginForm from './Components/LoginForm'
import Home from './pages/Home'
import ProfilePage from './pages/ProfilePage'
import { AuthProvider } from './contexts/AuthContext'

const App = () => {
  const [showLoginForm, setShowLoginForm] = useState(false);

  const toggleLoginForm = () => {
    setShowLoginForm(!showLoginForm);
  };

  const closeLoginForm = () => {
    setShowLoginForm(false);
  };

  return (
    <AuthProvider>
      <Router>
        <div>
          <Navbar onLoginClick={toggleLoginForm} />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
          {showLoginForm && <LoginForm onClose={closeLoginForm}/>}
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App