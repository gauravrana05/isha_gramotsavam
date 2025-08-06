import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { WifiOff, RefreshCw, Home } from 'lucide-react'

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-isha flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-md mx-auto">
        <div className="mb-8">
          <Image 
            src="https://ishalogin.sadhguru.org/app/images/3e8fd38d1d957c44372b.svg" 
            alt="Isha Logo" 
            width={100} 
            height={100} 
            className="mx-auto mb-6"
          />
          <WifiOff className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        </div>

        <h1 className="text-3xl font-bold text-gray-800 mb-4 font-fira">
          You're Offline
        </h1>
        
        <p className="text-gray-600 mb-8 font-fira">
          It looks like you're not connected to the internet. 
          Please check your connection and try again.
        </p>

        <div className="space-y-4">
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-[#F28C38] hover:bg-[#e67e2a] text-white px-6 py-3 rounded-lg font-fira font-semibold transition-colors flex items-center justify-center space-x-2"
          >
            <RefreshCw className="w-5 h-5" />
            <span>Try Again</span>
          </button>

          <Link 
            href="/"
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-3 rounded-lg font-fira font-semibold transition-colors flex items-center justify-center space-x-2"
          >
            <Home className="w-5 h-5" />
            <span>Go Home</span>
          </Link>
        </div>

        <div className="mt-12 text-sm text-gray-500 font-fira">
          <p>Some features may still be available while offline.</p>
          <p>Your data will sync when you reconnect.</p>
        </div>
      </div>
    </div>
  )
}