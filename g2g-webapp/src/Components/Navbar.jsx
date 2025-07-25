import React from 'react'
import './Navbar.css'
import g2gLogo from '../assets/logo.png'

const Navbar = () => {
  return (
    <header className='header'>
      <a href='#' className='logo'>G2G</a>
      <nav className='navbar'>
        <a href='#'>Home</a>
        <a href='#'>About</a>
        <a href='#'>Login</a>
      </nav>

    </header>
  )
}

export default Navbar