import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navbar from './Components/Navbar'
import LoginForm from './Components/LoginForm'
import Home from './pages/Home'
import ProfilePage from './pages/ProfilePage'
import Fps from './pages/Fps'
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
            <Route path="/" element={<Home onLoginClick={toggleLoginForm} />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/fps" element={<Fps />} />
          </Routes>
          {showLoginForm && <LoginForm onClose={closeLoginForm}/>}
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App