import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isBanned, setIsBanned] = useState(false);

  async function checkUsernameExists(username) {
    try {
      const usernameDoc = await getDoc(doc(db, 'usernames', username));
      return usernameDoc.exists();
    } catch (error) {
      console.log('Error checking username:', error);
      return false;
    }
  }
  
  //Creates a user profile document in Firestore with default role and metadata

  async function createUserProfile(user, additionalData = {}) {
    if (!user) return;
    
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      const { email, uid } = user;
      const createdAt = new Date();
      const { username } = additionalData;
      
      try {
        // Create user document
        await setDoc(userRef, {
          uid,
          email,
          username,
          role: 'user',
          createdAt
        });
        
        // Create username document for uniqueness checking
        if (username) {
          await setDoc(doc(db, 'usernames', username), {
            uid,
            createdAt
          });
        }
      } catch (error) {
        console.log('Error creating user profile:', error);
      }
    }
    
    return userRef;
  }

  async function getUserProfile(user) {
    if (!user) return null;
    
    try {
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        return { id: userDoc.id, ...userDoc.data() };
      }
    } catch (error) {
      console.log('Error getting user profile:', error);
    }
    
    return null;
  }

  async function signup(email, password, username) {
    // Ensure username uniqueness across the platform
    const usernameExists = await checkUsernameExists(username);
    if (usernameExists) {
      throw new Error('Username already exists');
    }

    const result = await createUserWithEmailAndPassword(auth, email, password);
    await createUserProfile(result.user, { username });
    return result;
  }

  async function login(email, password) {
    const result = await signInWithEmailAndPassword(auth, email, password);
    
    // Check if user is banned after successful authentication
    const profile = await getUserProfile(result.user);
    if (profile?.role === 'banned') {
      // Sign out the user immediately if they're banned
      await signOut(auth);
      throw new Error('BANNED_USER');
    }
    
    return result;
  }

  function logout() {
    setUserProfile(null);
    setIsBanned(false);
    return signOut(auth);
  }

  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Load user profile data to access role and username
        const profile = await getUserProfile(user);
        setUserProfile(profile);
        
        // Check if user is banned
        if (profile?.role === 'banned') {
          setIsBanned(true);
          // Automatically log out banned users
          await signOut(auth);
          setCurrentUser(null);
          setUserProfile(null);
        } else {
          setIsBanned(false);
        }
      } else {
        setUserProfile(null);
        setIsBanned(false);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userProfile,
    isBanned,
    login,
    signup,
    logout,
    resetPassword,
    createUserProfile,
    getUserProfile,
    checkUsernameExists
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 