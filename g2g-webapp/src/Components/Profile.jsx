import React from 'react'
import './Profile.css'
import { useAuth } from '../contexts/AuthContext'

const Profile = ({ onClose }) => {
  const { currentUser, userProfile, logout } = useAuth();

  const handleBackdropClick = (e) => {
    if (e.target.className === 'profile-backdrop') {
      onClose();
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      onClose(); // Close profile modal after logout
    } catch (error) {
      console.log('Failed to logout:', error);
    }
  };

  return (
    <div className='profile-backdrop' onClick={handleBackdropClick}>
      <div className='profile-wrapper'>
        <div className='profile-header'>
          <h2>User Profile</h2>
          <button className='close-btn' onClick={onClose}>×</button>
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

export default Profile 