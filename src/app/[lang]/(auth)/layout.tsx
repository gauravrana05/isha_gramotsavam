import React from 'react';
import LanguageSelector from '@/components/common/LanguageSelector';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-isha from-orange-50 to-green-50 flex flex-col">
      {/* Header */}
      <header className="safe-area-inset-top pe-4 flex justify-end items-center">
        <LanguageSelector />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-2">
        <div className="w-full max-w-4xl flex justify-center">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="safe-area-inset-bottom p-4 text-center">
        <p className="text-xs text-gray-500 font-roboto">
          © 2025 Isha Foundation. All rights reserved.
        </p>
      </footer>
    </div>
  );
}