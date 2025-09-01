'use client'
import React from 'react';
import { NotificationDashboard } from '@/components/notifications/NotificationDashboard';

export default function AdminNotificationsPage() {
  return (
    <div className="space-y-6">
      <NotificationDashboard userRole="admin" />
    </div>
  );
}
