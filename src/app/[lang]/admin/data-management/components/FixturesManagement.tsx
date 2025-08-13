"use client";

import { RefreshCw } from 'lucide-react';

export default function FixturesManagement() {
  return (
    <div className="p-6 text-center">
      <RefreshCw className="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">Fixtures Management</h3>
      <p className="text-gray-600">
        Tournament fixture generation interface will be implemented here.
        This will handle bracket creation, draws, and tournament structure.
      </p>
    </div>
  );
}