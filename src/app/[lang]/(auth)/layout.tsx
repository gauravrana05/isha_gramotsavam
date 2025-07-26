import React from 'react';
import LanguageSelector from '@/components/common/LanguageSelector';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-green-50 flex flex-col">
      {/* Header */}
      <header className="safe-area-inset-top p-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-lg font-roboto">IG</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 font-roboto">
              Isha Gramotsavam
            </h1>
            <p className="text-xs text-gray-600 font-roboto">
              Rural Sports Festival
            </p>
          </div>
        </div>
        <LanguageSelector />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="safe-area-inset-bottom p-4 text-center">
        <p className="text-xs text-gray-500 font-roboto">
          © 2025 Isha Foundation. All rights reserved.
        </p>
        <p className="text-xs text-gray-400 font-roboto mt-1">
          Connecting rural communities through sports
        </p>
      </footer>
    </div>
  );
}