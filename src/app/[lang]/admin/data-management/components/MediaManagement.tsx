"use client";

import { Images } from 'lucide-react';

export default function MediaManagement() {
  return (
    <div className="p-6 text-center">
      <Images className="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">Media Management</h3>
      <p className="text-gray-600">
        Media asset management interface will be implemented here.
        This will handle image/video uploads, gallery management, and media organization.
      </p>
    </div>
  );
}