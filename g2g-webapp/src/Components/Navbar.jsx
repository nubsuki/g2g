import React from 'react'
import { Link } from 'react-router-dom'
import './Navbar.css'
import { useAuth } from '../contexts/AuthContext'

const Navbar = ({ onLoginClick }) => {
  const { currentUser, userProfile } = useAuth();

  const handleLoginClick = (e) => {
    e.preventDefault();
    onLoginClick();
  };

  return (
    <header className='header'>
      <Link to="/" className='logo'>G2G</Link>
      <nav className='navbar'>
        <Link to="/">Home</Link>
        {currentUser ? (
          <Link to="/profile" className='username-link'>
            {userProfile?.username || 'User'}
          </Link>
        ) : (
          <a href='#' onClick={handleLoginClick}>Login</a>
        )}
      </nav>
    </header>
  )
}

export default Navbar