import React, { useState } from 'react'
import './LoginForm.css'
import { FaUserAlt, FaLock} from "react-icons/fa";

const LoginForm = ({ onClose }) => {
  const [isLogin, setIsLogin] = useState(true);

  const toggleForm = (e) => {
    e.preventDefault();
    setIsLogin(!isLogin);
  };

  const handleBackdropClick = (e) => {
    if (e.target.className === 'backdrop') {
      onClose();
    }
  };

  return (
    <div className='backdrop' onClick={handleBackdropClick}>
      <div className='wrapper'>
        {isLogin ? (
          <form action="login">
            <div>
              <h1>Login</h1>
              <div className='input-box'>
                <input type="text" placeholder='Username' required/>
                <FaUserAlt className='icon'/>
              </div>
              <div className='input-box'>
                <input type="password" placeholder='Password' required/>
                <FaLock className='icon'/>
              </div>
              <div className='remember-forgot'>
                <label><input type="checkbox"/> Remember me</label>
                <a href="#">Forgot password?</a>
              </div>
              <button type="submit" className='btn'>Login</button>
              <div className='register-link'>
                <p>Don't have an account? <a href="#" onClick={toggleForm}>Register</a></p>
              </div>
            </div>
          </form>
        ) : (
          <form action="register">
            <div>
              <h1>Register</h1>
              <div className='input-box'>
                <input type="text" placeholder='Username' required/>
                <FaUserAlt className='icon'/>
              </div>
              <div className='input-box'>
                <input type="password" placeholder='Password' required/>
                <FaLock className='icon'/>
              </div>
              <button type="submit" className='btn'>Register</button>
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