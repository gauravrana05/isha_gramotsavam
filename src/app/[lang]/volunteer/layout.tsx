"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function VolunteerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { lang } = useParams();
  const { user, userProfile, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/${lang}/auth/login`);
    }
  }, [user, loading, router, lang]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F0E5] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F28C38]"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F3F0E5]">
      {children}
    </div>
  );
}
