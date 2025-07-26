"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, onSnapshot, DocumentData } from "firebase/firestore"; // Import DocumentData
import { auth, db } from "@/lib/firebase/config";
import { UserProfile } from "@/lib/types/auth";

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const unsubscribeDoc = onSnapshot(
          userDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              // Explicitly type the data and merge with uid
              const userData = docSnap.data() as DocumentData; // Get raw data
              setUserProfile({ 
                uid: firebaseUser.uid, 
                ...userData 
              } as UserProfile); // Cast to UserProfile
            } else {
               // Handle case where user document doesn't exist yet
               // (e.g., right after sign-up but before profile completion)
               setUserProfile(null); 
            }
            setUser(firebaseUser);
            setLoading(false);
          },
          (err) => {
            console.error("Error fetching user profile:", err);
            // Ensure state is updated even on error
            setUser(firebaseUser); 
            setUserProfile(null); 
            setLoading(false);
          }
        );
        // Return the doc unsubscribe function correctly
        return () => unsubscribeDoc(); 
      } else {
        setUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    });

    // Return the auth unsubscribe function
    return () => unsubscribeAuth(); 
  }, []);

  return (
    <AuthContext.Provider value={{ user, userProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};