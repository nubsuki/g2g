import React from "react";
import "./Fps.css";

const Fps = () => {
  return (
    <div className="fps-page">
      <div className="fps-container">
        <div className="fps-header">
          <h1>Calculate FPS</h1>
          <p>Enter a game name to predict your FPS performance</p>
        </div>
        
        <div className="fps-content">
          {/* Input Section */}
          <div className="input-section">
            <div className="game-input-container">
              <input 
                type="text" 
                placeholder="Enter Game Name (e.g., Cyberpunk 2077)" 
                className="game-input"
              />
              <button className="calculate-btn">
                <span>Calculate FPS</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13.3 17.275q-.3.3-.725.3t-.725-.3L8.7 14.125q-.3-.3-.3-.713t.3-.712q.3-.3.725-.3t.725.3L12 14.55l5.85-5.85q.3-.3.725-.3t.725.3q.3.3.3.713t-.3.712L13.3 17.275Z"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Results Grid */}
          <div className="results-grid">
            {/* Game Information Card */}
            <div className="info-card game-info-card">
              <div className="card-header">
                <h3>Game Information</h3>
              </div>
              <div className="card-content">
                <div className="info-item">
                  <span className="label">Game Name:</span>
                  <span className="value">-</span>
                </div>
                <div className="info-section">
                  <h4>System Requirements</h4>
                  <div className="requirements-grid">
                    <div className="req-item">
                      <span className="req-label">CPU:</span>
                      <span className="req-value">-</span>
                    </div>
                    <div className="req-item">
                      <span className="req-label">GPU:</span>
                      <span className="req-value">-</span>
                    </div>
                    <div className="req-item">
                      <span className="req-label">RAM:</span>
                      <span className="req-value">-</span>
                    </div>
                    <div className="req-item">
                      <span className="req-label">OS:</span>
                      <span className="req-value">-</span>
                    </div>
                    <div className="req-item">
                      <span className="req-label">Storage:</span>
                      <span className="req-value">-</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* FPS Prediction Card */}
            <div className="info-card fps-prediction-card">
              <div className="card-header">
                <h3>FPS Prediction</h3>
              </div>
              <div className="card-content">
                <div className="fps-display">
                  <div className="fps-number">
                    <span className="fps-value">--</span>
                    <span className="fps-unit">FPS</span>
                  </div>
                  <div className="confidence-bar">
                    <div className="confidence-fill"></div>
                  </div>
                  <span className="confidence-text">Model Confidence: --%</span>
                </div>
                
                <div className="performance-details">
                  <div className="detail-item">
                    <span className="detail-label">Performance Mode:</span>
                    <span className="detail-value">-</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">CPU Score:</span>
                    <span className="detail-value">-</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">GPU Score:</span>
                    <span className="detail-value">-</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Card */}
            <div className="info-card stats-card">
              <div className="card-header">
                <h3>Database Stats</h3>
              </div>
              <div className="card-content">
                <div className="stat-item">
                  <span className="stat-value">-</span>
                  <span className="stat-label">Games Available</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">-</span>
                  <span className="stat-label">Benchmarks</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">--%</span>
                  <span className="stat-label">Model Accuracy</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Fps;