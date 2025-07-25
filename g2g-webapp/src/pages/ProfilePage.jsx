import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import "./ProfilePage.css";

const ProfilePage = () => {
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/"); // Redirect to home after logout
    } catch (error) {
      console.log("Failed to logout:", error);
    }
  };

  // Redirect if not logged in
  if (!currentUser) {
    navigate("/");
    return null;
  }

  return (
    <div className="profile-page">
      <div className="button-container">
        <button className="btn">Profile</button>
        <button className="btn-red" onClick={handleLogout}>
          Logout
        </button>
      </div>
      <div className="container">
        <div className="profile-info">
          <div className="user-info">
          <div className="info-item">
            <label>Username:</label>
            <span>{userProfile?.username || "N/A"}</span>
          </div>
          <div className="info-item">
            <label>Email:</label>
            <span>{currentUser?.email}</span>
          </div>
          <div className="info-item">
            <label>Member Since:</label>
            <span>
              {userProfile?.createdAt
                ? new Date(
                    userProfile.createdAt.seconds * 1000
                  ).toLocaleDateString()
                : "N/A"}
            </span>
          </div>
            
          </div>
          
          <div className="specs-container">
            <div className="specs-info">
              <div className="specs-item">
                <label>CPU:</label>
                <input type="text" placeholder="CPU" />
              </div>
              <div className="specs-item">
                <label>GPU:</label>
                <input type="text" placeholder="GPU" />
              </div>
              <div className="specs-item">
                <label>RAM:</label>
                <input type="text" placeholder="RAM" />
              </div>
              <div className="specs-item">
                <label>Resolution:</label>
                <input type="text" placeholder="Resolution" />
              </div>
              
            </div>
            <button className="btn-specs">Add Specs</button>
            <button className="btn-specs">Edit Specs</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
