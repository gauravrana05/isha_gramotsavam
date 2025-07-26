// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDCSeY8hL1GsD86RGwU3kgIU4THEF9yMy0",
  authDomain: "isha-gramotsavam.firebaseapp.com",
  projectId: "isha-gramotsavam",
  storageBucket: "isha-gramotsavam.firebasestorage.app",
  messagingSenderId: "221477987127",
  appId: "1:221477987127:web:c4f1b64015ca56f9c730b2",
  measurementId: "G-655V5N8FZV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get service instances
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
