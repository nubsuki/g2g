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

  async function checkUsernameExists(username) {
    const q = query(collection(db, 'users'), where('username', '==', username));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  }
  
  //Creates a user profile document in Firestore with default role and metadata

  async function createUserProfile(user, additionalData = {}) {
    if (!user) return;
    
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      const { email, uid } = user;
      const createdAt = new Date();
      
      try {
        await setDoc(userRef, {
          uid,
          email,
          role: 'user',
          createdAt
        });
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

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    setUserProfile(null);
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
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userProfile,
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