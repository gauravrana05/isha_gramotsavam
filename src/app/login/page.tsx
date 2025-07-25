// src/app/login/page.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */

'use client'; // This is a client component

import React, { useState, useEffect } from 'react';
import { auth, db } from '../../../utils/firebase'; 
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult} from 'firebase/auth';
import { useRouter } from 'next/navigation'; 
import { doc, getDoc } from 'firebase/firestore';


declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier | undefined; // <--- This line is the key change
    // If you are also using the RecaptchaVerifier constructor directly on window, add this:
    // RecaptchaVerifier: typeof RecaptchaVerifier;
  }
}

export default function LoginPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter(); 

  // Initialize RecaptchaVerifier when the component mounts
  useEffect(() => {
    if (typeof window !== 'undefined') { // Ensure this runs only in the browser
      setUpRecaptcha();
    }
  }, []);

  // Set up reCAPTCHA verifier
  const setUpRecaptcha = () => {
    if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            'size': 'invisible',
            'callback': () => {
              console.log('reCAPTCHA solved');
            },
            'expired-callback': () => {
              console.log('reCAPTCHA expired');
            }
          });
    }
  };

  const handleSendCode = async () => {
    setError('');
    setLoading(true);
    setUpRecaptcha();

    const appVerifier = window.recaptchaVerifier;

    try {
      const result = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      setConfirmationResult(result);
      console.log('OTP sent successfully!');
    } catch (err: any) {
      setError('Failed to send OTP: ' + err.message);
      console.error(err);
    } finally {
        setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setError('');
    setLoading(true);
    if (!confirmationResult) {
      setError('Please send code first.');
      setLoading(false);
      return;
    }

    try {
      const userCredential = await confirmationResult.confirm(otp);
      console.log('Phone number verified successfully!');
      const user = userCredential.user; // Get the user object

      // Check if the user's profile is complete after successful login
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists() && userDocSnap.data()?.isProfileComplete) {
        // Profile is complete, redirect to dashboard or home
        // TODO: Replace with your actual home/dashboard route
        console.log('User profile is complete, redirecting to home.');
        // router.push('/dashboard');
      } else {
        // Profile is not complete, redirect to profile completion form
        console.log('User profile is incomplete, redirecting to profile form.');
        router.push('/complete-profile'); // We will create this page
      }

    } catch (err: any) {
      setError('Failed to verify OTP: ' + err.message);
      console.error(err);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
        <h2 className="text-2xl font-bold mb-6 text-center text-[#FF6F00]">Sign In / Sign Up</h2>

        {!confirmationResult ? (
          <div className="space-y-4">
            <input
              type="tel"
              placeholder="Enter phone number (e.g., +1 123 456 7890)"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF6F00]"
            />
            <button
              onClick={handleSendCode}
              disabled={loading || phoneNumber.length < 10}
              className="w-full bg-[#FF6F00] text-white py-2 px-4 rounded-md hover:bg-[#E65100] focus:outline-none focus:ring-2 focus:ring-[#FFC107] disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Code'}
            </button>
            {/* Invisible reCAPTCHA container */}
            <div id="recaptcha-container"></div>
          </div>
        ) : (
          <div className="space-y-4">
            <input
              type="number"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF6F00]"
            />
            <button
              onClick={handleVerifyCode}
              disabled={loading || otp.length < 6}
              className="w-full bg-[#4CAF50] text-white py-2 px-4 rounded-md hover:bg-[#388E3C] focus:outline-none focus:ring-2 focus:ring-[#81C784] disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>
          </div>
        )}

        {error && <p className="text-red-500 text-center mt-4">{error}</p>}
      </div>
    </div>
  );
}
