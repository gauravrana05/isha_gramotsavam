// src/app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '../../utils/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [profileComplete, setProfileComplete] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else {
        const checkProfileCompletion = async () => {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists() && userDoc.data().profileComplete) {
            setProfileComplete(true);
          } else {
            router.push('/complete-profile');
          }
        };
        checkProfileCompletion();
      }
    }
  }, [user, loading, router]);

  if (loading || !user || !profileComplete) {
    return <div>Loading...</div>; // Or a more sophisticated loading component
  }

  // Content for authenticated users with complete profiles
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1 className="text-4xl font-bold">Welcome Home!</h1>
      <p>You are logged in and your profile is complete.</p>
      {/* Add navigation link to profile page */}
      <a href="/profile" className="text-blue-500 hover:underline mt-4">View/Edit Profile</a>
    </main>
  );
}
