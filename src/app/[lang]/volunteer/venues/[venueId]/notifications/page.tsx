'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/lib/utils/i18n';
import { api } from '@/server/trpc/react';
import { Bell, CheckCircle, AlertCircle, Info, Clock, Plus, Send, Users } from 'lucide-react';
import { EnhancedModal } from '@/components/ui/EnhancedModal';

export default function VenueNotificationsPage() {
  const { venueId, lang } = useParams();
  const { user } = useAuth();
  const { t } = useTranslation();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info' as const,
    targetRoles: ['captain', 'player'] as string[],
  });

  // Keep notifications as API calls - not critical for offline functionality
  const { data: notifications = [], isLoading } = api.notifications.getByVenue.useQuery(
    { venueId: venueId as string },
    { enabled: !!user && !!venueId }
  );

  const { data: availableRecipients = [] } = api.notifications.getAvailableRecipients.useQuery(
    { 
      roles: formData.targetRoles as any,
      venueIds: [venueId as string] 
    },
    { enabled: !!user && !!venueId && showCreateModal }
  );

  const markAsReadMutation = api.notifications.markAsRead.useMutation();
  const createBroadcastMutation = api.notifications.createBroadcast.useMutation({
    onSuccess: () => {
      setShowCreateModal(false);
      setFormData({
        title: '',
        message: '',
        type: 'info',
        targetRoles: ['captain', 'player'],
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.message.trim()) return;

    createBroadcastMutation.mutate({
      title: formData.title,
      message: formData.message,
      type: formData.type,
      targetRoles: formData.targetRoles as any,
      targetVenueIds: [venueId as string],
    });
  };

  const handleMarkAsRead = (notificationId: string) => {
    markAsReadMutation.mutate({ notificationId });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-red-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6 text-gray-700" />
          <h1 className="text-2xl font-bold text-gray-900">
            {t('volunteer.notifications.title', 'Notifications')}
          </h1>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Create
        </button>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">
            {t('volunteer.notifications.empty', 'No notifications yet')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification: any) => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg border ${
                notification.isRead 
                  ? 'bg-white border-gray-200' 
                  : 'bg-blue-50 border-blue-200'
              }`}
            >
              <div className="flex items-start gap-3">
                {getNotificationIcon(notification.type)}
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">
                    {notification.title}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {notification.message}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    {new Date(notification.createdAt).toLocaleString()}
                  </div>
                </div>
                {!notification.isRead && (
                  <button
                    onClick={() => handleMarkAsRead(notification.id)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Mark as read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Notification Modal */}
      <EnhancedModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Notification"
        subtitle="Send notification to teams in this venue"
        mobileFullScreen={true}
        footer={
          <div className="flex flex-row space-x-3 sm:justify-end">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="flex-1 sm:flex-initial sm:px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                const form = document.querySelector('#notification-form') as HTMLFormElement;
                if (form) {
                  form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                }
              }}
              disabled={!formData.title.trim() || !formData.message.trim() || formData.targetRoles.length === 0 || createBroadcastMutation.isPending}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
            >
              <Send className="w-4 h-4" />
              {createBroadcastMutation.isPending ? 'Sending...' : 'Send Notification'}
            </button>
          </div>
        }
      >
        <form id="notification-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter notification title"
              maxLength={200}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your message"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'info', label: 'Info', icon: <Info className="w-4 h-4 text-blue-500" /> },
                { value: 'success', label: 'Success', icon: <CheckCircle className="w-4 h-4 text-green-500" /> },
                { value: 'warning', label: 'Warning', icon: <AlertCircle className="w-4 h-4 text-yellow-500" /> },
                { value: 'error', label: 'Important', icon: <AlertCircle className="w-4 h-4 text-red-500" /> },
              ].map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, type: type.value as any }))}
                  className={`p-2 rounded-lg border flex items-center gap-2 text-sm ${
                    formData.type === type.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {type.icon}
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Send to</label>
            <div className="space-y-2">
              {[
                { value: 'captain', label: 'Team Captains' },
                { value: 'player', label: 'Players' },
              ].map((role) => (
                <label key={role.value} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.targetRoles.includes(role.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData(prev => ({
                          ...prev,
                          targetRoles: [...prev.targetRoles, role.value]
                        }));
                      } else {
                        setFormData(prev => ({
                          ...prev,
                          targetRoles: prev.targetRoles.filter(r => r !== role.value)
                        }));
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">{role.label}</span>
                </label>
              ))}
            </div>
          </div>

          {availableRecipients.length > 0 && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="w-4 h-4" />
                Will notify {availableRecipients.length} recipients
              </div>
            </div>
          )}
        </form>
      </EnhancedModal>
    </div>
  );
}
