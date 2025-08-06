'use client';

import React from 'react';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import { useParams } from 'next/navigation';

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { lang } = useParams();
  
  return (
    <div className="min-h-screen bg-isha flex flex-col font-['FiraSans']">
      <Header lang={lang as string} />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}