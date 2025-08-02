import React, { useState } from 'react'
import './LoginForm.css'
import { FaUserAlt, FaLock, FaEdit, FaTimes, FaCheck, FaArrowLeft } from "react-icons/fa";
import { useAuth } from '../contexts/AuthContext';

const LoginForm = ({ onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, signup, resetPassword } = useAuth();

  const toggleForm = (e) => {
    e.preventDefault();
    setIsLogin(!isLogin);
    setError('');
    setSuccessMessage('');
    setIsForgotPassword(false);
    setEmail('');
    setPassword('');
    setUsername('');
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email first');
      return;
    }
    setIsForgotPassword(true);
    setError('');
    setSuccessMessage('');
  };

  const handleBackToLogin = (e) => {
    e.preventDefault();
    setIsForgotPassword(false);
    setError('');
    setSuccessMessage('');
  };

  // Close modal when clicking outside the form
  const handleBackdropClick = (e) => {
    if (e.target.className === 'backdrop') {
      onClose();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isForgotPassword) {
      try {
        setError('');
        setLoading(true);
        await resetPassword(email);
        setSuccessMessage('Password reset email sent! Check your inbox.');
      } catch (error) {
        setError('Failed to send reset email. Please check your email address.');
      }
      setLoading(false);
      return;
    }

    // Enforce minimum security requirements
    if (password.length < 6) {
      return setError('Password must be at least 6 characters');
    }

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
      
      onClose();
    } catch (error) {
      setError('Failed to ' + (isLogin ? 'sign in' : 'create account'));
      console.log(error);
    }
    
    setLoading(false);
  };

  return (
    <div className='backdrop' onClick={handleBackdropClick}>
      <div className='wrapper'>
        {isForgotPassword ? (
          <form onSubmit={handleSubmit}>
            <div>
              <h1>Reset Password</h1>
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
              
              {error && <div className="error"><FaTimes /> {error}</div>}
              {successMessage && <div className="success"><FaCheck /> {successMessage}</div>}
              
              <button disabled={loading} type="submit" className='btn'>
                {loading ? 'Sending...' : 'Send Reset Email'}
              </button>
              
              <div className='back-to-login'>
                <a href="#" onClick={handleBackToLogin}>
                  <FaArrowLeft /> Back to Login
                </a>
              </div>
            </div>
          </form>
        ) : isLogin ? (
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
                <a href="#" onClick={handleForgotPassword}>Forgot password?</a>
              </div>
              {error && <div className="error"><FaTimes /> {error}</div>}
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
              {error && <div className="error"><FaTimes/> {error}</div>}
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