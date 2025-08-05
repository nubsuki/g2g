import { useState, useEffect, useRef, useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL;

export const useOnlineUsers = () => {
  const [onlineCount, setOnlineCount] = useState(0);
  const [error, setError] = useState(null);
  const heartbeatIntervalRef = useRef(null);
  const sessionIdRef = useRef(null);

  const getUserAgent = () => {
    return navigator.userAgent || 'unknown';
  };

  const sendHeartbeat = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/online-users/heartbeat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAgent: getUserAgent()
        })
      });

      if (response.ok) {
        const data = await response.json();
        setOnlineCount(data.online_count);
        sessionIdRef.current = data.session_id;
        setError(null);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err) {
      console.error('Heartbeat failed:', err);
      setError(err.message);
    }
  }, []);

  const sendLeave = useCallback(async () => {
    try {
      await fetch(`${API_BASE_URL}/online-users/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAgent: getUserAgent()
        })
      });
    } catch (err) {
      console.error('Leave request failed:', err);
    }
  }, []);

  const getOnlineCount = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/online-users/count`);
      if (response.ok) {
        const data = await response.json();
        setOnlineCount(data.online_count);
        setError(null);
      }
    } catch (err) {
      console.error('Get count failed:', err);
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    // Initial heartbeat and count
    sendHeartbeat();
    getOnlineCount();

    // Set up heartbeat interval
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, 30000);

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        sendLeave();
      } else {
        sendHeartbeat();
      }
    };

    // Handle page unload
    const handleBeforeUnload = () => {
      sendLeave();
    };

    // Handle window focus/blur
    const handleFocus = () => sendHeartbeat();
    const handleBlur = () => sendLeave();

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    // Cleanup
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      
      sendLeave();
      
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [sendHeartbeat, sendLeave, getOnlineCount]);

  return {
    onlineCount,
    error,
    sessionId: sessionIdRef.current
  };
}; 