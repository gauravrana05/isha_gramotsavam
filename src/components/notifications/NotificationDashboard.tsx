'use client'
import React, { useState } from 'react';
import { 
  Plus, 
  Send, 
  Users, 
  Calendar,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  Trash2,
  Filter,
  Download
} from 'lucide-react';
import { Button, AdvancedTable, StatusBadge, EmptyState } from '@/components/ui';
import type { Column, ActionButton } from '@/components/ui/Table';
import { NotificationCreateModal } from './NotificationCreateModal';
import { cn } from '@/lib/component-patterns';
import { api } from '@/lib/api';
import { useNotification } from '@/context/NotificationContext';

interface NotificationDashboardProps {
  userRole?: string;
  className?: string;
}

export const NotificationDashboard: React.FC<NotificationDashboardProps> = ({
  userRole,
  className,
}) => {
  const { addNotification } = useNotification();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<'all' | 'individual' | 'broadcast'>('all');
  
  // Fetch notifications based on user role
  const { 
    data: notificationsData, 
    isLoading: isLoadingNotifications,
    refetch: refetchNotifications
  } = api.notifications.getMyNotifications.useQuery({
    limit: 50,
    offset: 0,
  });

  // Fetch broadcasts for admin/volunteers
  const { 
    data: broadcastsData, 
    isLoading: isLoadingBroadcasts,
    refetch: refetchBroadcasts
  } = api.notifications.getBroadcasts.useQuery({
    limit: 50,
    offset: 0,
  }, {
    enabled: ['admin', 'verification_volunteer', 'technical_volunteer'].includes(userRole || ''),
  });

  // Format data for table based on filter
  const tableData = React.useMemo(() => {
    if (filterType === 'broadcast' && broadcastsData) {
      return broadcastsData.broadcasts.map((broadcast: any) => ({
        id: broadcast.id,
        type: 'broadcast',
        title: broadcast.title,
        message: broadcast.message,
        notificationType: broadcast.type,
        status: broadcast.status,
        recipientCount: broadcast.totalRecipients,
        deliveredCount: broadcast.deliveredCount,
        readCount: broadcast.readCount,
        scheduledFor: broadcast.scheduledFor,
        sentAt: broadcast.sentAt,
        createdAt: broadcast.createdAt,
        createdBy: broadcast.createdByUser,
      }));
    } else if (filterType === 'individual' && notificationsData) {
      return notificationsData.notifications
        .filter((notif: any) => !notif.broadcastId)
        .map((notification: any) => ({
          id: notification.id,
          type: 'individual',
          title: notification.title,
          message: notification.message,
          notificationType: notification.type,
          deliveryStatus: notification.deliveryStatus,
          read: notification.read,
          scheduledFor: notification.scheduledFor,
          deliveredAt: notification.deliveredAt,
          createdAt: notification.createdAt,
          createdBy: notification.createdByUser,
        }));
    } else {
      // Combine both types for 'all' filter
      const individual = notificationsData?.notifications.map((notification: any) => ({
        id: notification.id,
        type: 'individual',
        title: notification.title,
        message: notification.message,
        notificationType: notification.type,
        deliveryStatus: notification.deliveryStatus,
        read: notification.read,
        scheduledFor: notification.scheduledFor,
        deliveredAt: notification.deliveredAt,
        createdAt: notification.createdAt,
        createdBy: notification.createdByUser,
      })) || [];

      const broadcasts = broadcastsData?.broadcasts.map((broadcast: any) => ({
        id: broadcast.id,
        type: 'broadcast',
        title: broadcast.title,
        message: broadcast.message,
        notificationType: broadcast.type,
        status: broadcast.status,
        recipientCount: broadcast.totalRecipients,
        deliveredCount: broadcast.deliveredCount,
        readCount: broadcast.readCount,
        scheduledFor: broadcast.scheduledFor,
        sentAt: broadcast.sentAt,
        createdAt: broadcast.createdAt,
        createdBy: broadcast.createdByUser,
      })) || [];

      return [...broadcasts, ...individual].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
  }, [filterType, notificationsData, broadcastsData]);

  // Define columns for the table
  const columns: Column<any>[] = [
    {
      key: 'type',
      label: 'Type',
      width: 'w-20',
      render: (item) => (
        <div className="flex items-center gap-2">
          {item.type === 'broadcast' ? (
            <Send className="w-4 h-4 text-purple-600" />
          ) : (
            <Users className="w-4 h-4 text-blue-600" />
          )}
          <span className="text-xs font-medium">
            {item.type === 'broadcast' ? 'Broadcast' : 'Individual'}
          </span>
        </div>
      ),
    },
    {
      key: 'title',
      label: 'Title',
      width: 'w-60',
      render: (item) => (
        <div>
          <div className="font-medium text-gray-900 truncate">{item.title}</div>
          <div className="text-sm text-gray-500 truncate">
            {item.message.substring(0, 50)}...
          </div>
        </div>
      ),
    },
    {
      key: 'notificationType',
      label: 'Category',
      width: 'w-24',
      render: (item) => {
        const typeColors = {
          info: 'blue',
          success: 'green',
          warning: 'yellow',
          error: 'red',
          team_invitation: 'purple',
          verification_update: 'blue',
          match_result: 'green',
          venue_assignment: 'blue',
          system_announcement: 'red',
          match_reminder: 'orange',
          tournament_update: 'blue',
        };
        
        const color = typeColors[item.notificationType as keyof typeof typeColors] || 'gray';
        
        return (
          <StatusBadge
            status={item.notificationType}
            variant={color as any}
            size="sm"
          />
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      width: 'w-28',
      render: (item) => {
        if (item.type === 'broadcast') {
          const statusConfig = {
            draft: { label: 'Draft', color: 'gray', icon: Clock },
            scheduled: { label: 'Scheduled', color: 'yellow', icon: Calendar },
            sending: { label: 'Sending', color: 'blue', icon: Send },
            sent: { label: 'Sent', color: 'green', icon: CheckCircle },
            failed: { label: 'Failed', color: 'red', icon: AlertCircle },
            cancelled: { label: 'Cancelled', color: 'gray', icon: AlertCircle },
          };
          
          const config = statusConfig[item.status as keyof typeof statusConfig] || statusConfig.draft;
          const Icon = config.icon;
          
          return (
            <div className={cn(
              'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
              `bg-${config.color}-100 text-${config.color}-700`
            )}>
              <Icon className="w-3 h-3" />
              {config.label}
            </div>
          );
        } else {
          // Individual notification status
          const statusConfig = {
            pending: { label: 'Pending', color: 'yellow', icon: Clock },
            delivered: { label: 'Delivered', color: 'green', icon: CheckCircle },
            failed: { label: 'Failed', color: 'red', icon: AlertCircle },
            cancelled: { label: 'Cancelled', color: 'gray', icon: AlertCircle },
          };
          
          const config = statusConfig[item.deliveryStatus as keyof typeof statusConfig] || statusConfig.pending;
          const Icon = config.icon;
          
          return (
            <div className={cn(
              'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
              `bg-${config.color}-100 text-${config.color}-700`
            )}>
              <Icon className="w-3 h-3" />
              {config.label}
            </div>
          );
        }
      },
    },
    {
      key: 'recipients',
      label: 'Recipients',
      width: 'w-24',
      render: (item) => {
        if (item.type === 'broadcast') {
          return (
            <div className="text-center">
              <div className="text-sm font-medium">{item.recipientCount}</div>
              <div className="text-xs text-gray-500">
                {item.deliveredCount}/{item.recipientCount} delivered
              </div>
            </div>
          );
        } else {
          return (
            <div className="text-center">
              <div className="text-sm font-medium">1</div>
              <div className="text-xs text-gray-500">
                {item.read ? 'Read' : 'Unread'}
              </div>
            </div>
          );
        }
      },
    },
    {
      key: 'timing',
      label: 'Timing',
      width: 'w-32',
      render: (item) => {
        if (item.scheduledFor) {
          return (
            <div className="text-sm">
              <div className="font-medium text-orange-600">Scheduled</div>
              <div className="text-xs text-gray-500">
                {new Date(item.scheduledFor).toLocaleDateString()}
              </div>
            </div>
          );
        } else if (item.sentAt || item.deliveredAt) {
          const sentTime = item.sentAt || item.deliveredAt;
          return (
            <div className="text-sm">
              <div className="font-medium text-green-600">Sent</div>
              <div className="text-xs text-gray-500">
                {new Date(sentTime).toLocaleDateString()}
              </div>
            </div>
          );
        } else {
          return (
            <div className="text-sm">
              <div className="font-medium text-gray-600">Draft</div>
              <div className="text-xs text-gray-500">
                {new Date(item.createdAt).toLocaleDateString()}
              </div>
            </div>
          );
        }
      },
    },
    {
      key: 'createdBy',
      label: 'Created By',
      width: 'w-32',
      render: (item) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900">
            {item.createdBy?.firstName} {item.createdBy?.lastName}
          </div>
          <div className="text-xs text-gray-500">
            {new Date(item.createdAt).toLocaleDateString()}
          </div>
        </div>
      ),
    },
  ];

  // Define action buttons
  const actionButtons: ActionButton<any>[] = [
    {
      label: 'View Details',
      icon: Eye,
      onClick: (item) => {
        // TODO: Implement view details modal
        addNotification('View details coming soon', 'info');
      },
      variant: 'ghost',
    },
    {
      label: 'Delete',
      icon: Trash2,
      onClick: (item) => {
        // TODO: Implement delete functionality
        addNotification('Delete functionality coming soon', 'info');
      },
      variant: 'ghost',
      className: 'text-red-600 hover:text-red-700',
      condition: (item) => ['admin'].includes(userRole || ''),
    },
  ];

  const handleCreateSuccess = () => {
    refetchNotifications();
    refetchBroadcasts();
  };

  const isLoading = isLoadingNotifications || isLoadingBroadcasts;

  // Show different UI based on user permissions
  const canCreateNotifications = ['admin', 'verification_volunteer', 'technical_volunteer'].includes(userRole || '');

  if (!canCreateNotifications) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Access Restricted
          </h3>
          <p className="text-gray-600">
            You don&apos;t have permission to manage notifications.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notification Management</h1>
          <p className="text-gray-600 mt-1">
            Create and manage notifications for users
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary-600 hover:bg-primary-700 text-white w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Notification
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {[
          { key: 'all', label: 'All Notifications' },
          { key: 'broadcast', label: 'Broadcasts' },
          { key: 'individual', label: 'Individual' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterType(tab.key as any)}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md transition-all',
              filterType === tab.key
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        {tableData.length === 0 && !isLoading ? (
          <EmptyState
            title="No notifications found"
            description={
              filterType === 'all'
                ? "You haven't created any notifications yet."
                : `No ${filterType} notifications found.`
            }
            action={{
              label: 'Create First Notification',
              onClick: () => setShowCreateModal(true),
            }}
          />
        ) : (
          <AdvancedTable
            data={tableData}
            columns={columns}
            actions={actionButtons}
            isLoading={isLoading}
            selectable
            selectedItems={selectedNotifications}
            onSelectionChange={setSelectedNotifications}
            searchable
            searchPlaceholder="Search notifications..."
            pagination={{
              pageSize: 20,
            }}
          />
        )}
      </div>

      {/* Create Notification Modal */}
      <NotificationCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
};