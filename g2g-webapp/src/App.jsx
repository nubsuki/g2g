import React, { useState } from 'react'
import Navbar from './Components/Navbar'
import LoginForm from './Components/LoginForm'

const App = () => {
  const [showLoginForm, setShowLoginForm] = useState(false);

  const toggleLoginForm = () => {
    setShowLoginForm(!showLoginForm);
  };

  const closeLoginForm = () => {
    setShowLoginForm(false);
  };

  return (
    <div>
      <Navbar onLoginClick={toggleLoginForm}/>
      {showLoginForm && <LoginForm onClose={closeLoginForm}/>}
    </div>
  )
}

export default App