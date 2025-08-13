"use client";

import { Bell } from 'lucide-react';

export default function NotificationsManagement() {
  return (
    <div className="p-6 text-center">
      <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">Notifications Management</h3>
      <p className="text-gray-600">
        Notification management interface will be implemented here.
        This will handle creating, sending, and managing system notifications and templates.
      </p>
    </div>
  );
}