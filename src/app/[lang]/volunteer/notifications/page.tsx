'use client'
import React from 'react';
import { VolunteerNotificationPanel } from '@/components/notifications/VolunteerNotificationPanel';
import { useAuth } from '@/hooks/useAuth';
import { EmptyState } from '@/components/ui';
import { AlertCircle } from 'lucide-react';

export default function VolunteerNotificationsPage() {
  const { user } = useAuth();

  // Check if user has permission to send notifications
  const canSendNotifications = user?.role === 'verification_volunteer' || user?.role === 'technical_volunteer';

  if (!canSendNotifications) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Access Restricted
          </h3>
          <p className="text-gray-600">
            Only verification and technical volunteers can send notifications.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <VolunteerNotificationPanel 
        userRole={user?.role as 'verification_volunteer' | 'technical_volunteer'}
      />
    </div>
  );
}