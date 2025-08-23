import React from 'react';
import { FaBan } from 'react-icons/fa';
import './BannedScreen.css';

const BannedScreen = () => {
  return (
    <div className="banned-screen">
      <div className="banned-container">
        <div className="banned-content">
          <div className="banned-icon">
            <FaBan />
          </div>
          <h1>Access Denied</h1>
          <h2>Account Suspended</h2>
          <p>
            Your account has been suspended by an administrator. 
            You are no longer able to access this platform.
          </p>
          <p>
            If you believe this is an error, please contact support.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BannedScreen;
