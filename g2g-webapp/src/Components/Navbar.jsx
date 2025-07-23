import React from 'react'
import './Navbar.css'
import g2gLogo from '../assets/g2glogo2.png'

const Navbar = () => {
  return (
    <header className='header'>
      <a href='#' className='logo'>
        <img src={g2gLogo} alt="G2G Logo" />From Gamers To Gamers
      </a>
      <nav className='navbar'>
        <a href='#'>Home</a>
        <a href='#'>About</a>
        <a href='#'>Login</a>
      </nav>

    </header>
  )
}

export default Navbar