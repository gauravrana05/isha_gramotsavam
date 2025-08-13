"use client";

import { PlayCircle } from 'lucide-react';

export default function MatchesManagement() {
  return (
    <div className="p-6 text-center">
      <PlayCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">Matches Management</h3>
      <p className="text-gray-600">
        Match management interface will be implemented here.
        This will handle individual match creation, scheduling, and result recording.
      </p>
    </div>
  );
}