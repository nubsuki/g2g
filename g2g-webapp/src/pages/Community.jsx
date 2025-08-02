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
  deleteDoc,
  getDocs,
  where,
  limit,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import "./Community.css";

const Community = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [onlineUsersCount, setOnlineUsersCount] = useState(0);
  const [todayMessagesCount, setTodayMessagesCount] = useState(0);
  const messagesEndRef = useRef(null);
  const { currentUser, userProfile } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  /**
   * Maintains performance by limiting chat history to 1000 messages
   * Prevents database costs and UI lag from unlimited message accumulation
   */
  const cleanupOldMessages = async () => {
    try {
      const allMessagesQuery = query(collection(db, 'chatMessages'));
      const allMessagesSnapshot = await getDocs(allMessagesQuery);
      
      if (allMessagesSnapshot.size > 1000) {
        const oldestMessagesQuery = query(
          collection(db, 'chatMessages'),
          orderBy('timestamp', 'asc'),
          limit(allMessagesSnapshot.size - 1000)
        );
        
        const oldestMessagesSnapshot = await getDocs(oldestMessagesQuery);
        const deletePromises = oldestMessagesSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
        
        console.log(`Cleaned up ${oldestMessagesSnapshot.size} old messages`);
      }
    } catch (error) {
      console.error("Error cleaning up old messages:", error);
    }
  };

  const countTodayMessages = async () => {
    try {
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      const todayMessagesQuery = query(
        collection(db, 'chatMessages'),
        where('timestamp', '>=', Timestamp.fromDate(startOfToday)),
        where('timestamp', '<', Timestamp.fromDate(endOfToday))
      );

      const todayMessagesSnapshot = await getDocs(todayMessagesQuery);
      setTodayMessagesCount(todayMessagesSnapshot.size);
    } catch (error) {
      console.error("Error counting today's messages:", error);
    }
  };

  /**
   * Implements real-time online presence tracking
   * Updates user status based on tab visibility, focus, and browser events
   * Uses heartbeat mechanism to maintain accurate online counts
   */
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

    setUserOnline();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setUserOffline();
      } else {
        setUserOnline();
      }
    };

    const handleBeforeUnload = () => {
      setUserOffline();
    };

    const handleFocus = () => setUserOnline();
    const handleBlur = () => setUserOffline();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    // Periodic heartbeat to maintain accurate presence status
    const heartbeatInterval = setInterval(() => {
      if (!document.hidden) {
        setUserOnline();
      }
    }, 30000);

    return () => {
      setUserOffline();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      clearInterval(heartbeatInterval);
    };
  }, [currentUser, userProfile]);

  useEffect(() => {
    const onlineUsersQuery = collection(db, 'onlineUsers');

    const unsubscribe = onSnapshot(onlineUsersQuery, (snapshot) => {
      setOnlineUsersCount(snapshot.size);
    }, (error) => {
      console.error("Error fetching online users:", error);
    });

    return () => unsubscribe();
  }, []);

  /**
   * Real-time message synchronization using Firestore snapshots
   * Messages are ordered chronologically for natural chat flow
   */
  useEffect(() => {
    const messagesQuery = query(
      collection(db, 'chatMessages'),
      orderBy('timestamp', 'asc')
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
      
      countTodayMessages();
    }, (error) => {
      console.error("Error fetching messages:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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

  // Format large numbers for better UI display
  const formatCount = (count) => {
    if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'k';
    }
    return count.toString();
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
      
      // Trigger background cleanup to maintain performance
      setTimeout(cleanupOldMessages, 1000);
      
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
        <div className="community-content">
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

          <div className="contributors-section">
            <div className="contributors-header">
              <div className="contributors-title">
                <FaUsers />
                <span>Contributors</span>
              </div>
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
                  <div className="stat-number">{formatCount(todayMessagesCount)}</div>
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
