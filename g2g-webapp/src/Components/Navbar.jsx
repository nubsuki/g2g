import React from 'react'
import './Navbar.css'
import { useAuth } from '../contexts/AuthContext'

const Navbar = ({ onLoginClick, onProfileClick }) => {
  const { currentUser, userProfile, logout } = useAuth();

  const handleLoginClick = (e) => {
    e.preventDefault();
    onLoginClick();
  };

  const handleProfileClick = (e) => {
    e.preventDefault();
    onProfileClick();
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
      <a href='#' className='logo'>G2G</a>
      <nav className='navbar'>
        <a href='#'>Home</a>
        <a href='#'>About</a>
        {currentUser ? (
          <>
            <a href='#' onClick={handleProfileClick} className='username-link'>
              {userProfile?.username || 'User'}
            </a>
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