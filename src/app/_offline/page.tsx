import React from 'react'
import Image from 'next/image'
import { WifiOff, RefreshCw } from 'lucide-react'

export default function FallbackOfflinePage() {
  return (
    <div className="min-h-screen bg-isha flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-md mx-auto">
        <div className="mb-8">
          <WifiOff className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        </div>

        <h1 className="text-3xl font-bold text-gray-800 mb-4 font-fira">
          Connection Lost
        </h1>
        
        <p className="text-gray-600 mb-8 font-fira">
          This page is not available offline. Please reconnect to the internet to continue.
        </p>

        <button 
          onClick={() => window.location.reload()}
          className="w-full bg-[#F28C38] hover:bg-[#e67e2a] text-white px-6 py-3 rounded-lg font-fira font-semibold transition-colors flex items-center justify-center space-x-2"
        >
          <RefreshCw className="w-5 h-5" />
          <span>Retry</span>
        </button>
      </div>
    </div>
  )
}