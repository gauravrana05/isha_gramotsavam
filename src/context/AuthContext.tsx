"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import { doc, onSnapshot, DocumentData } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import { UserProfile } from "@/lib/types/user";

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setUserProfile(null);
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  };

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
              profileCreationTimeout = setTimeout(async () => {
                console.warn("Profile creation timed out. Creating fallback profile...");
                
                // Create a basic user profile if Cloud Function didn't create it
                try {
                  const { doc, setDoc, serverTimestamp } = await import("firebase/firestore");
                  const { db } = await import("@/lib/firebase/config");
                  
                  const fallbackProfile = {
                    uid: firebaseUser.uid,
                    firstName: "",
                    lastName: "",
                    phoneNumber: firebaseUser.phoneNumber || "",
                    whatsappNumber: firebaseUser.phoneNumber || "",
                    dob: "",
                    gender: "",
                    panchayat: "",
                    taluk: "",
                    district: "",
                    state: "",
                    pincode: "",
                    instagramHandle: "",
                    preferredLanguage: "",
                    role: "public",
                    currentTeamId: null,
                    isProfileComplete: false,
                    isVerified: false,
                    documents: {
                      profilePhoto: {
                        storagePath: "",
                        verified: false,
                        uploadedAt: null,
                        uploadedBy: null
                      },
                      aadhaarFront: {
                        storagePath: "",
                        verified: false,
                        uploadedAt: null,
                        uploadedBy: null
                      },
                      aadhaarBack: {
                        storagePath: "",
                        verified: false,
                        uploadedAt: null,
                        uploadedBy: null
                      }
                    },
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                  };
                  
                  await setDoc(doc(db, "users", firebaseUser.uid), fallbackProfile);
                  console.log("Fallback profile created successfully");
                  
                  // The onSnapshot listener will pick up the new document
                } catch (error) {
                  console.error("Failed to create fallback profile:", error);
                  setLoading(false);
                  setUserProfile(null);
                }
              }, 5000); // 5-second timeout
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
    <AuthContext.Provider value={{ user, userProfile, loading, logout }}>
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
