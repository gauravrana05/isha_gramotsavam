// src/app/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext'; // Adjust the import path
import { db } from '../../utils/firebase'; // Adjust the import path
import { doc, getDoc } from 'firebase/firestore';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // If not authenticated, redirect to login page
        router.push('/login');
      } else {
        // If authenticated, check if profile is complete
        const checkProfileCompletion = async () => {
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
        };

        checkProfileCompletion();
      }
    }
  }, [user, loading, router]);

  // Optionally show a loading state while checking auth and profile
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // This page will typically redirect, so nothing might be rendered here for long
  return null; // Or a simple loading indicator
}
