'use client'
import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, StatusBadge, EmptyState } from '@/components/ui';
import { api } from '@/lib/api';
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  Users, 
  Send, 
  Eye, 
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/component-patterns';

export default function NotificationDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const notificationId = params?.notificationId as string;

  // This would need to be implemented in the API to get broadcast details
  // For now, showing placeholder implementation
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => router.push('/admin/notifications')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Notifications
        </Button>
      </div>

      {/* Notification Details Placeholder */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <EmptyState
          title="Notification Details"
          description="Individual notification detail view will be implemented here."
          action={{
            label: 'Back to Notifications',
            onClick: () => router.push('/admin/notifications'),
          }}
        />
      </div>
    </div>
  );
}
