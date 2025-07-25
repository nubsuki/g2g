import React from 'react'
import { Link } from 'react-router-dom'
import './Navbar.css'
import { useAuth } from '../contexts/AuthContext'

const Navbar = ({ onLoginClick }) => {
  const { currentUser, userProfile, logout } = useAuth();

  const handleLoginClick = (e) => {
    e.preventDefault();
    onLoginClick();
  };

  const handleLogout = async (e) => {
    e.preventDefault();
    try {
      await logout();
    } catch (error) {
      console.log('Failed to logout:', error);
    }
  };

  return (
    <header className='header'>
      <Link to="/" className='logo'>G2G</Link>
      <nav className='navbar'>
        <Link to="/">Home</Link>
        {currentUser ? (
          <>
            <Link to="/profile" className='username-link'>
              {userProfile?.username || 'User'}
            </Link>
            <a href='#' onClick={handleLogout}>Logout</a>
          </>
        ) : (
          <a href='#' onClick={handleLoginClick}>Login</a>
        )}
      </nav>
    </header>
  )
}

export default Navbar