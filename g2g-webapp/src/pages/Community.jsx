import React, { useState, useEffect, useRef } from "react";
import { FaRegUser, FaUsers, FaComments, FaPaperPlane } from "react-icons/fa";
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  orderBy, 
  query, 
  serverTimestamp,
  doc,
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import "./Community.css";

const Community = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [onlineUsersCount, setOnlineUsersCount] = useState(0);
  const messagesEndRef = useRef(null);
  const { currentUser, userProfile } = useAuth();

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Track user's online status
  useEffect(() => {
    if (!currentUser) return;

    const setUserOnline = async () => {
      try {
        await setDoc(doc(db, 'onlineUsers', currentUser.uid), {
          uid: currentUser.uid,
          username: userProfile?.username || currentUser.email.split('@')[0],
          lastSeen: serverTimestamp(),
          isOnline: true
        });
      } catch (error) {
        console.error("Error setting user online:", error);
      }
    };

    const setUserOffline = async () => {
      try {
        await deleteDoc(doc(db, 'onlineUsers', currentUser.uid));
      } catch (error) {
        console.error("Error setting user offline:", error);
      }
    };

    // Set user as online when component mounts
    setUserOnline();

    // Handle visibility change (tab switching)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setUserOffline();
      } else {
        setUserOnline();
      }
    };

    // Handle page unload
    const handleBeforeUnload = () => {
      setUserOffline();
    };

    // Handle focus/blur events
    const handleFocus = () => setUserOnline();
    const handleBlur = () => setUserOffline();

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    // Heartbeat to keep user status updated
    const heartbeatInterval = setInterval(() => {
      if (!document.hidden) {
        setUserOnline();
      }
    }, 30000); // Update every 30 seconds

    // Cleanup function
    return () => {
      setUserOffline();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      clearInterval(heartbeatInterval);
    };
  }, [currentUser, userProfile]);

  // Listen to online users count
  useEffect(() => {
    const onlineUsersQuery = collection(db, 'onlineUsers');

    const unsubscribe = onSnapshot(onlineUsersQuery, (snapshot) => {
      setOnlineUsersCount(snapshot.size);
    }, (error) => {
      console.error("Error fetching online users:", error);
    });

    return () => unsubscribe();
  }, []);

  // Real-time listener for messages
  useEffect(() => {
    const messagesQuery = query(
      collection(db, 'chatMessages'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messageList = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        messageList.push({
          id: doc.id,
          user: data.username || 'Anonymous',
          text: data.text,
          timestamp: data.timestamp,
          uid: data.uid,
          time: formatTime(data.timestamp)
        });
      });
      setMessages(messageList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching messages:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Format timestamp for display
  const formatTime = (timestamp) => {
    if (!timestamp) return 'now';
    
    const messageTime = timestamp.toDate();
    const now = new Date();
    const diffInSeconds = Math.floor((now - messageTime) / 1000);
    
    if (diffInSeconds < 60) return 'now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    
    return messageTime.toLocaleDateString();
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    if (!currentUser) {
      alert('Please log in to send messages');
      return;
    }

    try {
      await addDoc(collection(db, 'chatMessages'), {
        text: message.trim(),
        username: userProfile?.username || currentUser.email.split('@')[0],
        uid: currentUser.uid,
        timestamp: serverTimestamp()
      });
      
      setMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      alert('Failed to send message. Please try again.');
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
                <span>{onlineUsersCount} online</span>
              </div>
            </div>

            <div className="messages-container">
              {loading ? (
                <div className="loading-messages">Loading messages...</div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <div key={msg.id} className={`message-item ${msg.uid === currentUser?.uid ? 'own-message' : ''}`}>
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
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            <div className="message-input-container">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={currentUser ? "Type your message..." : "Please log in to chat"}
                className="message-input"
                disabled={!currentUser}
              />
              <button 
                onClick={handleSendMessage}
                className="send-button"
                disabled={!message.trim() || !currentUser}
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
