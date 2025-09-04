'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { MobileMediaFeed } from '@/components/mobile/media/MobileMediaFeed';
import { Image, Video, Camera, Upload } from 'lucide-react';

export default function CaptainMediaPage() {
  const { user } = useAuth();
  const { isMobile } = useMobileDetection();

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Please log in to view media</p>
      </div>
    );
  }

  // Mobile version uses the mobile media feed
  if (isMobile) {
    return <MobileMediaFeed />;
  }

  // Desktop version - placeholder for now
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Media Gallery</h1>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center">
            <div className="flex justify-center space-x-4 mb-6">
              <Image className="w-12 h-12 text-gray-400" />
              <Video className="w-12 h-12 text-gray-400" />
              <Camera className="w-12 h-12 text-gray-400" />
            </div>
            
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Media Gallery</h2>
            <p className="text-gray-600 mb-6">
              View and share photos and videos from your tournament experience
            </p>
            
            <button className="bg-[#2C5282] text-white px-6 py-3 rounded-lg hover:bg-[#2D3748] transition-colors flex items-center mx-auto">
              <Upload className="w-5 h-5 mr-2" />
              Upload Media
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
