"use client";

import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase/config";
import { collection, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function FirebaseTestPage() {
  const [firebaseStatus, setFirebaseStatus] = useState<string>("Testing...");
  const [authStatus, setAuthStatus] = useState<string>("Checking auth...");
  const [firestoreStatus, setFirestoreStatus] = useState<string>("Testing Firestore...");

  useEffect(() => {
    console.log("Firebase test component mounted");
    
    // Test Firebase initialization
    try {
      if (db && auth) {
        setFirebaseStatus("✅ Firebase initialized successfully");
        console.log("Firebase config:", { db, auth });
      } else {
        setFirebaseStatus("❌ Firebase initialization failed");
      }
    } catch (error) {
      setFirebaseStatus(`❌ Firebase error: ${error}`);
      console.error("Firebase initialization error:", error);
    }

    // Test Authentication
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      console.log("Auth state changed:", user);
      if (user) {
        setAuthStatus(`✅ User authenticated: ${user.uid}`);
      } else {
        setAuthStatus("ℹ️ No user authenticated");
      }
    });

    // Test Firestore connection
    const testFirestore = async () => {
      try {
        console.log("Testing Firestore connection...");
        const testCollection = collection(db, "teams");
        const snapshot = await getDocs(testCollection);
        setFirestoreStatus(`✅ Firestore connected. Found ${snapshot.size} documents in 'teams' collection`);
        console.log("Firestore test successful, documents:", snapshot.size);
      } catch (error) {
        setFirestoreStatus(`❌ Firestore error: ${error}`);
        console.error("Firestore error:", error);
      }
    };

    testFirestore();

    return () => {
      unsubscribeAuth();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Firebase Configuration Test</h1>
        
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-2">Firebase Initialization</h2>
            <p className="text-gray-700">{firebaseStatus}</p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-2">Authentication Status</h2>
            <p className="text-gray-700">{authStatus}</p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-2">Firestore Connection</h2>
            <p className="text-gray-700">{firestoreStatus}</p>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h2 className="text-xl font-semibold mb-2 text-blue-800">Instructions</h2>
            <p className="text-blue-700">
              Open your browser's Developer Tools (F12) and check the Console tab for detailed logs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}