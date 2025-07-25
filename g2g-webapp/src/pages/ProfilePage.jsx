import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import './ProfilePage.css'

const ProfilePage = () => {
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/'); // Redirect to home after logout
    } catch (error) {
      console.log('Failed to logout:', error);
    }
  };

  // Redirect if not logged in
  if (!currentUser) {
    navigate('/');
    return null;
  }

  return (
    <div className='profile-page'>
      <div className='profile-container'>
        <div className='profile-header'>
          <h1>User Profile</h1>
        </div>
        
        <div className='profile-content'>
          <div className='profile-info'>
            <div className='info-item'>
              <label>Username:</label>
              <span>{userProfile?.username || 'N/A'}</span>
            </div>
            
            <div className='info-item'>
              <label>Email:</label>
              <span>{currentUser?.email}</span>
            </div>
            
            <div className='info-item'>
              <label>Role:</label>
              <span>{userProfile?.role || 'user'}</span>
            </div>
            
            <div className='info-item'>
              <label>Member Since:</label>
              <span>
                {userProfile?.createdAt 
                  ? new Date(userProfile.createdAt.seconds * 1000).toLocaleDateString()
                  : 'N/A'
                }
              </span>
            </div>
          </div>
          
          <div className='profile-actions'>
            <button className='btn-secondary'>Edit Profile</button>
            <button className='btn-danger' onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage 