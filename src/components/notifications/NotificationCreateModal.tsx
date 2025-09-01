'use client'
import React, { useState, useEffect } from 'react';
import { EnhancedModal } from '@/components/ui/EnhancedModal';
import { Button } from '@/components/ui';
import { api } from '@/lib/api';
import { cn } from '@/lib/component-patterns';
import { useNotification } from '@/context/NotificationContext';
import { 
  Send, 
  Users, 
  Search, 
  X, 
  Calendar,
  AlertCircle,
  Info,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

export interface NotificationCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultRecipients?: string[];
  defaultType?: string;
}

interface Recipient {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string;
  role: string;
}

const notificationTypes = [
  { value: 'info', label: 'Information', icon: Info, color: 'blue' },
  { value: 'success', label: 'Success', icon: CheckCircle, color: 'green' },
  { value: 'warning', label: 'Warning', icon: AlertTriangle, color: 'yellow' },
  { value: 'error', label: 'Error', icon: AlertCircle, color: 'red' },
  { value: 'team_invitation', label: 'Team Invitation', icon: Users, color: 'purple' },
  { value: 'verification_update', label: 'Verification Update', icon: CheckCircle, color: 'blue' },
  { value: 'match_result', label: 'Match Result', icon: CheckCircle, color: 'green' },
  { value: 'venue_assignment', label: 'Venue Assignment', icon: Users, color: 'blue' },
  { value: 'system_announcement', label: 'System Announcement', icon: AlertCircle, color: 'red' },
  { value: 'match_reminder', label: 'Match Reminder', icon: Calendar, color: 'orange' },
  { value: 'tournament_update', label: 'Tournament Update', icon: Info, color: 'blue' },
];

const roleLabels = {
  admin: 'Admin',
  captain: 'Captain',
  player: 'Player',
  general_volunteer: 'General Volunteer',
  technical_volunteer: 'Technical Volunteer',
  verification_volunteer: 'Verification Volunteer',
  public: 'Public',
};

export const NotificationCreateModal: React.FC<NotificationCreateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultRecipients = [],
  defaultType = 'info',
}) => {
  const { addNotification } = useNotification();
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: defaultType,
    actionUrl: '',
    scheduledFor: '',
  });
  
  // UI state
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(
    new Set(defaultRecipients)
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isBroadcast, setIsBroadcast] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());
  const [showRecipientSearch, setShowRecipientSearch] = useState(false);
  
  // API queries and mutations
  const { data: availableRecipients, isLoading: loadingRecipients } = 
    api.notifications.getAvailableRecipients.useQuery({
      search: searchQuery,
      roles: isBroadcast ? Array.from(selectedRoles) : undefined,
    }, {
      enabled: isOpen && showRecipientSearch,
    });

  const createNotificationMutation = api.notifications.createNotification.useMutation({
    onSuccess: (data) => {
      addNotification(
        `Notification sent to ${data.recipientCount} recipient${data.recipientCount !== 1 ? 's' : ''}`,
        'success'
      );
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      addNotification(error.message, 'error');
    },
  });

  const createBroadcastMutation = api.notifications.createBroadcast.useMutation({
    onSuccess: (data) => {
      addNotification(
        `Broadcast sent to ${data.recipientCount} recipient${data.recipientCount !== 1 ? 's' : ''}`,
        'success'
      );
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      addNotification(error.message, 'error');
    },
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: '',
        message: '',
        type: defaultType,
        actionUrl: '',
        scheduledFor: '',
      });
      setSelectedRecipients(new Set(defaultRecipients));
      setSearchQuery('');
      setIsBroadcast(false);
      setSelectedRoles(new Set());
      setShowRecipientSearch(false);
    }
  }, [isOpen, defaultRecipients, defaultType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.message.trim()) {
      addNotification('Please fill in all required fields', 'error');
      return;
    }

    const scheduledFor = formData.scheduledFor ? new Date(formData.scheduledFor) : undefined;

    if (isBroadcast) {
      if (selectedRoles.size === 0) {
        addNotification('Please select at least one role for broadcast', 'error');
        return;
      }

      await createBroadcastMutation.mutateAsync({
        title: formData.title,
        message: formData.message,
        type: formData.type as any,
        targetRoles: Array.from(selectedRoles) as any[],
        scheduledFor,
      });
    } else {
      if (selectedRecipients.size === 0) {
        addNotification('Please select at least one recipient', 'error');
        return;
      }

      await createNotificationMutation.mutateAsync({
        title: formData.title,
        message: formData.message,
        type: formData.type as any,
        recipientIds: Array.from(selectedRecipients),
        actionUrl: formData.actionUrl || undefined,
        scheduledFor,
      });
    }
  };

  const selectedType = notificationTypes.find(t => t.value === formData.type);
  const TypeIcon = selectedType?.icon || Info;

  const isLoading = createNotificationMutation.isLoading || createBroadcastMutation.isLoading;

  return (
    <EnhancedModal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Notification"
      size="lg"
      mobileFullScreen
      scrollableBody
      footer={
        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-2 sm:justify-end">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full sm:w-auto bg-primary-600 hover:bg-primary-700 text-white"
          >
            <Send className="w-4 h-4 mr-2" />
            {isLoading ? 'Sending...' : 'Send Notification'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Notification Type Selection */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Notification Type *
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {notificationTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = formData.type === type.value;
              
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, type: type.value }))}
                  className={cn(
                    'flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all',
                    isSelected
                      ? `border-${type.color}-500 bg-${type.color}-50 text-${type.color}-700`
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="truncate">{type.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Broadcast vs Individual Selection */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Delivery Method
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setIsBroadcast(false)}
              className={cn(
                'flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all',
                !isBroadcast
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              )}
            >
              <Users className="w-4 h-4" />
              Individual Recipients
            </button>
            <button
              type="button"
              onClick={() => setIsBroadcast(true)}
              className={cn(
                'flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all',
                isBroadcast
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              )}
            >
              <Send className="w-4 h-4" />
              Broadcast to Roles
            </button>
          </div>
        </div>

        {/* Recipients Selection */}
        {!isBroadcast && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Recipients * ({selectedRecipients.size} selected)
            </label>
            
            {!showRecipientSearch ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRecipientSearch(true)}
                className="w-full"
              >
                <Search className="w-4 h-4 mr-2" />
                Search Recipients
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by name or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                </div>
                
                {loadingRecipients ? (
                  <div className="text-center py-4 text-gray-500">Loading...</div>
                ) : (
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                    {availableRecipients?.map((recipient: Recipient) => (
                      <label
                        key={recipient.id}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <input
                          type="checkbox"
                          checked={selectedRecipients.has(recipient.id)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedRecipients);
                            if (e.target.checked) {
                              newSelected.add(recipient.id);
                            } else {
                              newSelected.delete(recipient.id);
                            }
                            setSelectedRecipients(newSelected);
                          }}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900">
                            {recipient.firstName} {recipient.lastName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {roleLabels[recipient.role as keyof typeof roleLabels]} • {recipient.phone}
                          </div>
                        </div>
                      </label>
                    ))}
                    {availableRecipients?.length === 0 && (
                      <div className="text-center py-4 text-gray-500">
                        No recipients found
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Role Selection for Broadcast */}
        {isBroadcast && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Target Roles * ({selectedRoles.size} selected)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(roleLabels).map(([role, label]) => {
                const isSelected = selectedRoles.has(role);
                return (
                  <label
                    key={role}
                    className={cn(
                      'flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all',
                      isSelected
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        const newSelected = new Set(selectedRoles);
                        if (e.target.checked) {
                          newSelected.add(role);
                        } else {
                          newSelected.delete(role);
                        }
                        setSelectedRoles(newSelected);
                      }}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium">{label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Title and Message */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter notification title"
              maxLength={200}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
            <div className="text-xs text-gray-500 mt-1">
              {formData.title.length}/200 characters
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message *
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Enter notification message"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>
        </div>

        {/* Optional Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Action URL (Optional)
            </label>
            <input
              type="url"
              value={formData.actionUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, actionUrl: e.target.value }))}
              placeholder="https://example.com/action"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Schedule For (Optional)
            </label>
            <input
              type="datetime-local"
              value={formData.scheduledFor}
              onChange={(e) => setFormData(prev => ({ ...prev, scheduledFor: e.target.value }))}
              min={new Date().toISOString().slice(0, 16)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        {/* Preview */}
        {(formData.title || formData.message) && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Preview
            </label>
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex items-start gap-3">
                <TypeIcon className={cn(
                  'w-5 h-5 flex-shrink-0 mt-0.5',
                  `text-${selectedType?.color}-600`
                )} />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 text-sm">
                    {formData.title || 'Notification Title'}
                  </h3>
                  <p className="text-sm text-gray-700 mt-1">
                    {formData.message || 'Notification message will appear here...'}
                  </p>
                  {formData.scheduledFor && (
                    <p className="text-xs text-gray-500 mt-2">
                      Scheduled for: {new Date(formData.scheduledFor).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </form>
    </EnhancedModal>
  );
};