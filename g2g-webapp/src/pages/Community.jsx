import React, { useState, useEffect, useRef } from "react";
import { FaRegUser, FaUsers, FaComments, FaPaperPlane } from "react-icons/fa";
import { GiRank1, GiRank2, GiRank3 } from "react-icons/gi";
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
import { useOnlineUsers } from '../hooks/useOnlineUsers';

const Community = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [todayMessagesCount, setTodayMessagesCount] = useState(0);
  const [contributors, setContributors] = useState([]);
  const [loadingContributors, setLoadingContributors] = useState(true);
  const [registeredUsersCount, setRegisteredUsersCount] = useState(0);
  const messagesEndRef = useRef(null);
  const { currentUser, userProfile } = useAuth();
  const { onlineCount: onlineUsersCount, error: onlineUsersError } = useOnlineUsers();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Keep chat history under 1000 messages for performance
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

  // Listen for real-time chat messages
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

  // Function to calculate rank based on submission count
  const calculateRank = (count) => {
    if (count >= 1000) return "gold";
    if (count >= 100) return "silver";
    return "bronze";
  };

  // Function to get rank icon
  const getRankIcon = (rank) => {
    switch (rank) {
      case "gold":
        return <GiRank3 />;
      case "silver":
        return <GiRank2 />;
      case "bronze":
      default:
        return <GiRank1 />;
    }
  };

  // Function to get rank priority for sorting
  const getRankPriority = (rank) => {
    switch (rank) {
      case "gold":
        return 3;
      case "silver":
        return 2;
      case "bronze":
      default:
        return 1;
    }
  };

  // Get contributors with submissions
  const fetchContributors = async () => {
    try {
      setLoadingContributors(true);
      
      const usersQuery = query(
        collection(db, "users"),
        where("benchmarker", "==", "yes")
      );
      
      const usersSnapshot = await getDocs(usersQuery);
      const contributorsData = [];
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        
        // Check if user has any submissions in users_benchmarks
        const submissionsQuery = query(
          collection(db, "users_benchmarks"),
          where("userId", "==", userDoc.id)
        );
        
        const submissionsSnapshot = await getDocs(submissionsQuery);
        
        // Only include contributors who have submissions
        if (submissionsSnapshot.size > 0) {
          const submissionCount = submissionsSnapshot.size;
          const rank = calculateRank(submissionCount);
          
          contributorsData.push({
            id: userDoc.id,
            username: userData.username,
            rank: rank,
            submissionCount: submissionCount,
            rankPriority: getRankPriority(rank)
          });
        }
      }
      
      // Sort by rank priority (gold first), then by submission count
      contributorsData.sort((a, b) => {
        if (a.rankPriority !== b.rankPriority) {
          return b.rankPriority - a.rankPriority;
        }
        return b.submissionCount - a.submissionCount;
      });
      
      setContributors(contributorsData);
    } catch (error) {
      console.error("Error fetching contributors:", error);
    } finally {
      setLoadingContributors(false);
    }
  };

  useEffect(() => {
    fetchContributors();
  }, []);

  // fetch total registered users count
  const fetchRegisteredUsersCount = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, "users"));
      setRegisteredUsersCount(usersSnapshot.size);
    } catch (error) {
      console.error("Error fetching registered users count:", error);
    }
  };

  useEffect(() => {
    fetchRegisteredUsersCount();
  }, []);

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    if (!currentUser) {
      alert('Please log in to send messages');
      return;
    }

    try {
      await addDoc(collection(db, 'chatMessages'), {
        text: message.trim(),
        username: userProfile?.username,
        uid: currentUser.uid,
        timestamp: serverTimestamp()
      });
      
      setMessage("");
      
      // Clean up old messages after sending
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
              {loadingContributors ? (
                <div className="loading-contributors">
                  <div className="contributor-skeleton">Loading contributors...</div>
                </div>
              ) : contributors.length === 0 ? (
                <div className="no-contributors">
                  <div className="empty-state">
                    <FaUsers size={32} />
                    <p>No active contributors yet</p>
                  </div>
                </div>
              ) : (
                contributors.map((contributor) => (
                  <div key={contributor.id} className="contributor-item">
                    <div className="contributor-avatar">
                      <FaRegUser />
                    </div>
                    <div className="contributor-info">
                      <div className="contributor-name">{contributor.username}</div>
                      <div className="contributor-stats">
                        {contributor.submissionCount} submissions
                      </div>
                    </div>
                    <div className="contributor-badge">
                      {getRankIcon(contributor.rank)}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="contributors-info">
              <h4>How to Contribute</h4>
              <ul>
                <li>Share your benchmark results</li>
                <li>Help test new hardware</li>
                <li>Help to improve accuracy</li>
              </ul>
              <div className="rank-info">
                <h4>Contributor Ranks</h4>
                <div className="rank-legend">
                  <div className="rank-item">
                    <GiRank1 /> Bronze: 1-99 submissions
                  </div>
                  <div className="rank-item">
                    <GiRank2 /> Silver: 100-999 submissions
                  </div>
                  <div className="rank-item">
                    <GiRank3 /> Gold: 1000+ submissions
                  </div>
                </div>
              </div>
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
                  <div className="stat-number">{formatCount(registeredUsersCount)}</div>
                  <div className="stat-label">Registered Members</div>
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
                <li>Maintain a welcoming environment free from discriminatory language or harassment</li>
                <li>Keep discussions relevant to gaming and technology</li>
                <li>Violation of community guidelines may result in temporary or permanent account suspension</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Community;
