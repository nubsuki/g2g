import React, { useState } from 'react'
import './LoginForm.css'
import { FaUserAlt, FaLock, FaEdit, FaTimes } from "react-icons/fa";
import { useAuth } from '../contexts/AuthContext';

const LoginForm = ({ onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, signup } = useAuth();

  const toggleForm = (e) => {
    e.preventDefault();
    setIsLogin(!isLogin);
    setError('');
    // Clear fields when switching forms
    setEmail('');
    setPassword('');
    setUsername('');
  };

  const handleBackdropClick = (e) => {
    if (e.target.className === 'backdrop') {
      onClose();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password.length < 6) {
      return setError('Password must be at least 6 characters');
    }

    // Validate username for registration
    if (!isLogin && username.length < 3) {
      return setError('Username must be at least 3 characters');
    }

    try {
      setError('');
      setLoading(true);
      
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, password, username);
      }
      
      onClose(); // Close modal on successful auth
    } catch (error) {
      setError('Failed to ' + (isLogin ? 'sign in' : 'create account'));
      console.log(error);
    }
    
    setLoading(false);
  };

  return (
    <div className='backdrop' onClick={handleBackdropClick}>
      <div className='wrapper'>
        {isLogin ? (
          <form onSubmit={handleSubmit}>
            <div>
              <h1>Login</h1>
              <div className='input-box'>
                <input 
                  type="email" 
                  placeholder='Email' 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <FaUserAlt className='icon'/>
              </div>
              <div className='input-box'>
                <input 
                  type="password" 
                  placeholder='Password' 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <FaLock className='icon'/>
              </div>
              <div className='remember-forgot'>
                <label><input type="checkbox"/> Remember me</label>
                <a href="#">Forgot password?</a>
              </div>
              {error && <div className="error"><FaTimes />{error}</div>}
              <button disabled={loading} type="submit" className='btn'>
                {loading ? 'Loading...' : 'Login'}
              </button>
              <div className='register-link'>
                <p>Don't have an account? <a href="#" onClick={toggleForm}>Register</a></p>
              </div>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit}>
            <div>
              <h1>Register</h1>
              <div className='input-box'>
                <input 
                  type="text" 
                  placeholder='Username' 
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
                <FaEdit className='icon'/>
              </div>
              <div className='input-box'>
                <input 
                  type="email" 
                  placeholder='Email' 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <FaUserAlt className='icon'/>
              </div>
              <div className='input-box'>
                <input 
                  type="password" 
                  placeholder='Password' 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <FaLock className='icon'/>
              </div>
              {error && <div className="error"><FaTimes/>{error}</div>}
              <button disabled={loading} type="submit" className='btn'>
                {loading ? 'Loading...' : 'Register'}
              </button>
              <div className='register-link'>
                <p>Already have an account? <a href="#" onClick={toggleForm}>Login</a></p>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
export default LoginForm