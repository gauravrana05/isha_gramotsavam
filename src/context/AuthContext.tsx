"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, onSnapshot, DocumentData } from "firebase/firestore";
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
    let unsubscribeFromDoc: (() => void) | undefined;
    let profileCreationTimeout: NodeJS.Timeout | undefined;


    const unsubscribeFromAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (unsubscribeFromDoc) {
        unsubscribeFromDoc();
      }
      if (profileCreationTimeout) {
        clearTimeout(profileCreationTimeout);
      }

      if (firebaseUser) {
        setUser(firebaseUser);
        const userDocRef = doc(db, "users", firebaseUser.uid);
        
        unsubscribeFromDoc = onSnapshot(
          userDocRef,
          (docSnap) => {
            // If a timeout was set, clear it because we've received a snapshot
            if (profileCreationTimeout) {
              clearTimeout(profileCreationTimeout);
            }

            if (docSnap.exists()) {
              // The user profile exists, update the state
              const userData = docSnap.data() as DocumentData;
              setUserProfile({ uid: firebaseUser.uid, ...userData } as UserProfile);
              setLoading(false);
            } else {
              // The user is new and the profile is being created by the backend trigger.
              // We'll show a loading state and wait.
              console.log("New user detected. Waiting for server-side profile creation...");
              setLoading(true);
              // Set a timeout to prevent infinite loading if profile creation fails
              profileCreationTimeout = setTimeout(() => {
                console.error("Profile creation timed out. User document not found.");
                setLoading(false);
                setUserProfile(null);
              }, 10000); // 10-second timeout
            }
          },
          (err) => {
            console.error("Error listening to user profile:", err);
            setUserProfile(null);
            setLoading(false);
          }
        );
      } else {
        // User is signed out
        setUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    });

    // Cleanup subscriptions on component unmount
    return () => {
      unsubscribeFromAuth();
      if (unsubscribeFromDoc) {
        unsubscribeFromDoc();
      }
       if (profileCreationTimeout) {
        clearTimeout(profileCreationTimeout);
      }
    };
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
