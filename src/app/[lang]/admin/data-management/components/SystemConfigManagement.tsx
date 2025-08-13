"use client";

import { Settings } from 'lucide-react';

export default function SystemConfigManagement() {
  return (
    <div className="p-6 text-center">
      <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">System Config Management</h3>
      <p className="text-gray-600">
        System configuration management interface will be implemented here.
        This will handle global settings, feature flags, and system parameters.
      </p>
    </div>
  );
}