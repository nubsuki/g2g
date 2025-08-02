import React, { useState, useEffect, useRef } from "react";
import { FaRegUser, FaUsers, FaComments, FaPaperPlane } from "react-icons/fa";
import "./Community.css";

const Community = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    { id: 1, user: "GamerPro", text: "Anyone know good budget GPU recommendations?", time: "2 min ago" },
    { id: 2, user: "TechEnthusiast", text: "RTX 4060 is pretty solid for 1080p gaming!", time: "5 min ago" },
    { id: 3, user: "PCBuilder", text: "Check out the AMD RX 7600 too, great value", time: "8 min ago" },
    { id: 4, user: "GameOptimizer", text: "What's your budget and target resolution?", time: "12 min ago" },
    { id: 5, user: "FrameChaser", text: "Just upgraded to RTX 4070, getting amazing performance!", time: "15 min ago" },
  ]);

  const handleSendMessage = () => {
    if (message.trim()) {
      setMessages(prev => [{
        id: prev.length + 1,
        user: "You",
        text: message,
        time: "now"
      }, ...prev]);
      setMessage("");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <div className="community-page">
      <div className="community-container">
        {/* Main Content - Three Column Layout */}
        <div className="community-content">
          {/* Chat Section */}
          <div className="chat-section">
            <div className="chat-header">
              <div className="chat-title">
                <FaComments />
                <span>Live Chat</span>
              </div>
              <div className="online-indicator">
                <div className="online-dot"></div>
                <span>234 online</span>
              </div>
            </div>

            <div className="messages-container">
              {messages.map((msg) => (
                <div key={msg.id} className="message-item">
                  <div className="message-avatar">
                    <FaRegUser />
                  </div>
                  <div className="message-content">
                    <div className="message-header">
                      <span className="message-user">{msg.user}</span>
                      <span className="message-time">{msg.time}</span>
                    </div>
                    <div className="message-text">{msg.text}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="message-input-container">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="message-input"
              />
              <button 
                onClick={handleSendMessage}
                className="send-button"
                disabled={!message.trim()}
              >
                <FaPaperPlane />
              </button>
            </div>
          </div>

          {/* Contributors Section */}
          <div className="contributors-section">
            <div className="contributors-header">
              <div className="contributors-title">
                <FaUsers />
                <span>Contributors</span>
              </div>
              <div className="contributors-count">12 active</div>
            </div>

            <div className="contributors-list">
              <div className="contributor-item">
                <div className="contributor-avatar">
                  <FaRegUser />
                </div>
                <div className="contributor-info">
                  <div className="contributor-name">GameMaster</div>
                </div>
                <div className="contributor-badge">🏆</div>
              </div>

              <div className="contributor-item">
                <div className="contributor-avatar">
                  <FaRegUser />
                </div>
                <div className="contributor-info">
                  <div className="contributor-name">TechGuru</div>
                </div>
                <div className="contributor-badge">⚡</div>
              </div>

              <div className="contributor-item">
                <div className="contributor-avatar">
                  <FaRegUser />
                </div>
                <div className="contributor-info">
                  <div className="contributor-name">BenchmarkPro</div>
                </div>
                <div className="contributor-badge">📊</div>
              </div>

              <div className="contributor-item">
                <div className="contributor-avatar">
                  <FaRegUser />
                </div>
                <div className="contributor-info">
                  <div className="contributor-name">OptimizeThis</div>
                </div>
                <div className="contributor-badge">🚀</div>
              </div>

              <div className="contributor-item">
                <div className="contributor-avatar">
                  <FaRegUser />
                </div>
                <div className="contributor-info">
                  <div className="contributor-name">FrameSeeker</div>
                </div>
                <div className="contributor-badge">🎮</div>
              </div>
            </div>

            <div className="contributors-info">
              <h4>How to Contribute</h4>
              <ul>
                <li>Share your benchmark results</li>
                <li>Help test new hardware</li>
                <li>Help to improve accuracy</li>
              </ul>
            </div>
          </div>

          {/* Stats Sidebar */}
          <div className="community-stats">
            <div className="stats-header">
              <h3>Community Stats</h3>
            </div>
            
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">
                  <FaUsers />
                </div>
                <div className="stat-content">
                  <div className="stat-number">1,247</div>
                  <div className="stat-label">Active Members</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon online">
                  <FaRegUser />
                </div>
                <div className="stat-content">
                  <div className="stat-number">234</div>
                  <div className="stat-label">Online Now</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">
                  <FaComments />
                </div>
                <div className="stat-content">
                  <div className="stat-number">15.2k</div>
                  <div className="stat-label">Messages Today</div>
                </div>
              </div>
            </div>

            <div className="community-info">
              <h4>Community Guidelines</h4>
              <ul>
                <li>Be respectful to all members</li>
                <li>Stay on topic about gaming</li>
                <li>No spam or excessive promotion</li>
                <li>Help others learn and improve</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Community;
