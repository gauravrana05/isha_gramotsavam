'use client'
import React, { useState } from 'react';
import { 
  Users, 
  MapPin, 
  Send, 
  Filter,
  Search,
  Calendar,
  Trophy,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { Button, StatusBadge, EmptyState } from '@/components/ui';
import { NotificationCreateModal } from './NotificationCreateModal';
import { cn } from '@/lib/component-patterns';
import { api } from '@/lib/api';
import { useNotification } from '@/context/NotificationContext';

interface VolunteerNotificationPanelProps {
  userRole: 'verification_volunteer' | 'technical_volunteer';
  className?: string;
}

export const VolunteerNotificationPanel: React.FC<VolunteerNotificationPanelProps> = ({
  userRole,
  className,
}) => {
  const { addNotification } = useNotification();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedVenues, setSelectedVenues] = useState<Set<string>>(new Set());
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [filterRole, setFilterRole] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Get volunteer's assigned venues
  const { data: assignedVenues, isLoading: loadingVenues } = 
    api.volunteers.getAssignedVenues?.useQuery() || { data: [], isLoading: false };

  // Get available recipients based on selected venues
  const { data: availableRecipients, isLoading: loadingRecipients } = 
    api.notifications.getAvailableRecipients.useQuery({
      roles: filterRole === 'all' ? ['captain', 'player'] : [filterRole as any],
      venueIds: Array.from(selectedVenues),
      search: searchQuery,
    }, {
      enabled: selectedVenues.size > 0,
    });

  // Get recent notifications sent by this volunteer
  const { data: recentNotifications, isLoading: loadingNotifications } = 
    api.notifications.getBroadcasts.useQuery({
      limit: 10,
      offset: 0,
    });

  const handleCreateNotification = () => {
    if (selectedVenues.size === 0) {
      addNotification('Please select at least one venue', 'warning');
      return;
    }

    if (selectedUsers.size === 0) {
      addNotification('Please select at least one recipient', 'warning');
      return;
    }

    setShowCreateModal(true);
  };

  const handleNotificationSuccess = () => {
    setSelectedUsers(new Set());
    setSelectedVenues(new Set());
    setSearchQuery('');
  };

  const roleLabels = {
    captain: 'Captains',
    player: 'Players',
    all: 'All Users',
  };

  // Mock data for demonstration - in real implementation, this would come from the API
  const mockVenues = [
    { id: 'venue1', name: 'Central Ground A', location: 'Main Campus', teamsCount: 12 },
    { id: 'venue2', name: 'Sports Complex B', location: 'East Wing', teamsCount: 8 },
  ];

  const mockUsers = [
    { id: 'user1', firstName: 'John', lastName: 'Doe', role: 'captain', phone: '+91 9876543210' },
    { id: 'user2', firstName: 'Jane', lastName: 'Smith', role: 'player', phone: '+91 9876543211' },
  ];

  if (loadingVenues) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const venues = assignedVenues || mockVenues;
  const recipients = availableRecipients || mockUsers;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {userRole === 'verification_volunteer' ? 'Verification' : 'Technical'} Notifications
          </h1>
          <p className="text-gray-600 mt-1">
            Send notifications to teams in your assigned venues
          </p>
        </div>
      </div>

      {/* Assigned Venues */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary-600" />
          Your Assigned Venues ({venues.length})
        </h3>

        {venues.length === 0 ? (
          <EmptyState
            title="No venues assigned"
            description="You haven't been assigned to any venues yet. Contact your administrator."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {venues.map((venue: any) => (
              <div
                key={venue.id}
                className={cn(
                  'border rounded-lg p-4 cursor-pointer transition-all',
                  selectedVenues.has(venue.id)
                    ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                    : 'border-gray-200 hover:border-gray-300'
                )}
                onClick={() => {
                  const newSelected = new Set(selectedVenues);
                  if (newSelected.has(venue.id)) {
                    newSelected.delete(venue.id);
                  } else {
                    newSelected.add(venue.id);
                  }
                  setSelectedVenues(newSelected);
                  setSelectedUsers(new Set()); // Reset user selection when venues change
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{venue.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">{venue.location}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedVenues.has(venue.id)}
                    readOnly
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </div>
                <div className="mt-3 flex items-center gap-4">
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>{venue.teamsCount || 0} teams</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recipient Selection */}
      {selectedVenues.size > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary-600" />
              Select Recipients ({selectedUsers.size} selected)
            </h3>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1">
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
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-600" />
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All Users</option>
                <option value="captain">Captains Only</option>
                <option value="player">Players Only</option>
              </select>
            </div>
          </div>

          {/* Recipients List */}
          {loadingRecipients ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-center gap-3 p-3">
                    <div className="w-4 h-4 bg-gray-200 rounded"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : recipients.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p>No recipients found in selected venues</p>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
              {recipients.map((recipient: any) => (
                <label
                  key={recipient.id}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                >
                  <input
                    type="checkbox"
                    checked={selectedUsers.has(recipient.id)}
                    onChange={(e) => {
                      const newSelected = new Set(selectedUsers);
                      if (e.target.checked) {
                        newSelected.add(recipient.id);
                      } else {
                        newSelected.delete(recipient.id);
                      }
                      setSelectedUsers(newSelected);
                    }}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900">
                      {recipient.firstName} {recipient.lastName}
                    </div>
                    <div className="text-sm text-gray-500 flex items-center gap-4">
                      <StatusBadge
                        status={recipient.role}
                        variant={recipient.role === 'captain' ? 'purple' : 'blue'}
                        size="sm"
                      />
                      <span>{recipient.phone}</span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}

          {/* Action Button */}
          {recipients.length > 0 && (
            <div className="mt-4 flex justify-end">
              <Button
                onClick={handleCreateNotification}
                disabled={selectedUsers.size === 0}
                className="bg-primary-600 hover:bg-primary-700 text-white"
              >
                <Send className="w-4 h-4 mr-2" />
                Create Notification ({selectedUsers.size} recipients)
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Recent Notifications */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-600" />
          Recent Notifications
        </h3>

        {recentNotifications?.broadcasts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Send className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p>No notifications sent yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(recentNotifications?.broadcasts || []).slice(0, 5).map((notification: any) => (
              <div
                key={notification.id}
                className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div className="flex-shrink-0 mt-1">
                  {notification.type === 'success' && <CheckCircle className="w-4 h-4 text-green-600" />}
                  {notification.type === 'warning' && <AlertCircle className="w-4 h-4 text-yellow-600" />}
                  {notification.type === 'error' && <AlertCircle className="w-4 h-4 text-red-600" />}
                  {!['success', 'warning', 'error'].includes(notification.type) && (
                    <Send className="w-4 h-4 text-blue-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 text-sm">
                    {notification.title}
                  </div>
                  <div className="text-sm text-gray-600 truncate">
                    {notification.message}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 flex items-center gap-4">
                    <span>
                      {notification.deliveredCount}/{notification.totalRecipients} delivered
                    </span>
                    <span>{new Date(notification.createdAt).toLocaleDateString()}</span>
                    <StatusBadge
                      status={notification.status}
                      variant={notification.status === 'sent' ? 'green' : 'yellow'}
                      size="sm"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Notification Modal */}
      <NotificationCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleNotificationSuccess}
        defaultRecipients={Array.from(selectedUsers)}
      />
    </div>
  );
};