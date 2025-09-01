'use client'
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { NotificationCreateModal } from '@/components/notifications/NotificationCreateModal';
import { Button } from '@/components/ui';
import { ArrowLeft } from 'lucide-react';

export default function AdminNotificationCreatePage() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(true);

  const handleClose = () => {
    setShowModal(false);
    router.push('/admin/notifications');
  };

  const handleSuccess = () => {
    router.push('/admin/notifications');
  };

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

      <NotificationCreateModal
        isOpen={showModal}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
