"use client";

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/server/trpc/react';
import { 
  AdvancedTable,
  SingleStatCard,
  PageLoader,
  Button,
  Modal,
  type Column,
  type ActionButton,
} from '@/components/ui';
import { 
  Plus, 
  Calendar,
  Edit,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  Users,
  Trophy,
  Trash2
} from 'lucide-react';

interface EventData {
  id: string;
  name: string;
  description: string | null;
  status: 'draft' | 'registration_open' | 'registration_closed' | 'active' | 'completed' | 'cancelled';
  registrationStartDate: string | null;
  registrationEndDate: string | null;
  startDate: string | null;
  endDate: string | null;
  createdBy: string;
  createdByName: string;
  teamCount?: number;
  fixtureCount?: number;
  matchCount?: number;
  venueCount?: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export default function AdminEventsPage() {
  const router = useRouter();
  const { lang } = useParams();
  const { user, userProfile, loading: authLoading } = useAuth();
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    registrationStartDate: '',
    registrationEndDate: '',
    startDate: '',
    endDate: '',
    status: 'draft' as const,
  });

  // tRPC query with enhanced parameters
  const {
    data: eventsData,
    isLoading: eventsLoading,
    error: eventsError,
    refetch: refetchEvents
  } = api.admin.getEvents.useQuery({
    limit: 100,
    status: 'all',
    includeStats: true
  }, {
    enabled: !!user && userProfile?.role === 'admin'
  });

  // Delete event mutation
  const deleteEventMutation = api.admin.deleteEvent.useMutation({
    onSuccess: () => {
      refetchEvents();
    },
    onError: (error) => {
      console.error('Error deleting event:', error);
    },
  });

  // Create event mutation
  const createEventMutation = api.admin.createEvent.useMutation({
    onSuccess: () => {
      refetchEvents();
      setShowCreateModal(false);
      resetForm();
    },
    onError: (error) => {
      console.error('Error creating event:', error);
    },
  });

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push(`/${lang}/login`);
      return;
    }

    if (userProfile?.role !== 'admin') {
      router.push(`/${lang}/player/dashboard`);
      return;
    }
  }, [user, userProfile, authLoading, lang, router]);

  const loading = eventsLoading;
  const error = eventsError?.message || '';
  const events = eventsData?.events || [];

  // Define table columns
  const columns: Column<EventData>[] = useMemo(() => [
    {
      key: 'name',
      header: 'Event Name',
      accessor: 'name',
      sortable: true,
      minWidth: 200,
      render: (_, event) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{event.name}</div>
          <div className="text-sm text-gray-500">{event.description || 'No description'}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      accessor: 'status',
      sortable: true,
      minWidth: 120,
      render: (_, event) => {
        const statusConfig = {
          'draft': { color: 'bg-gray-100 text-gray-800', icon: AlertCircle },
          'active': { color: 'bg-green-100 text-green-800', icon: CheckCircle },
          'upcoming': { color: 'bg-blue-100 text-blue-800', icon: Clock },
          'completed': { color: 'bg-purple-100 text-purple-800', icon: Trophy },
        };
        
        const config = statusConfig[event.status as keyof typeof statusConfig] || statusConfig.draft;
        const Icon = config.icon;
        
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
            <Icon className="w-3 h-3 mr-1" />
            {event.status}
          </span>
        );
      },
    },
    {
      key: 'dates',
      header: 'Event Dates',
      accessor: 'startDate',
      sortable: true,
      minWidth: 150,
      render: (_, event) => (
        <div className="text-sm text-gray-900">
          {event.startDate ? new Date(event.startDate).toLocaleDateString() : 'Not set'}
          {event.endDate && (
            <div className="text-xs text-gray-500">
              to {new Date(event.endDate).toLocaleDateString()}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'registration',
      header: 'Registration',
      accessor: 'registrationDeadline',
      sortable: true,
      minWidth: 130,
      render: (_, event) => (
        <div className="text-sm text-gray-900">
          {event.registrationDeadline ? (
            <>
              <div>Until</div>
              <div className="text-xs">{new Date(event.registrationDeadline).toLocaleDateString()}</div>
            </>
          ) : 'Not set'}
        </div>
      ),
    },
    {
      key: 'teams',
      header: 'Teams',
      accessor: 'teamCount',
      sortable: true,
      minWidth: 80,
      render: (_, event) => (
        <div className="flex items-center space-x-1">
          <Users className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-900">{event.teamCount}</span>
        </div>
      ),
    },
    {
      key: 'fixtures',
      header: 'Fixtures',
      accessor: 'fixtureCount',
      sortable: true,
      minWidth: 80,
      render: (_, event) => (
        <div className="flex items-center space-x-1">
          <Trophy className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-900">{event.fixtureCount}</span>
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      accessor: 'createdAt',
      sortable: true,
      minWidth: 120,
      render: (_, event) => (
        <span className="text-sm text-gray-500">
          {event.createdAt ? new Date(event.createdAt).toLocaleDateString() : 'N/A'}
        </span>
      ),
    }
  ], []);

  // Define action buttons - removed View action as it's now on row click
  const actions: ActionButton<EventData>[] = useMemo(() => [
    {
      label: 'Edit',
      icon: Edit,
      onClick: (event) => router.push(`/${lang}/admin/events/${event.id}/edit`),
      variant: 'secondary',
    }
  ], [router, lang]);

  // Handle row click to view event
  const handleRowClick = (event: EventData) => {
    setSelectedEvent(event);
    setShowViewModal(true);
  };

  // Form handlers
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      registrationStartDate: '',
      registrationEndDate: '',
      startDate: '',
      endDate: '',
      status: 'draft',
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createEventMutation.mutateAsync({
        name: formData.name,
        description: formData.description || undefined,
        registrationStartDate: formData.registrationStartDate,
        registrationEndDate: formData.registrationEndDate,
        startDate: formData.startDate,
        endDate: formData.endDate,
        status: formData.status,
      });
    } catch (error) {
      console.error('Failed to create event:', error);
    }
  };

  // Handle delete event
  const handleDeleteEvent = async (eventId: string) => {
    if (window.confirm('Are you sure you want to remove this event? This action cannot be undone.')) {
      try {
        await deleteEventMutation.mutateAsync({ id: eventId });
        setSelectedEvents(new Set()); // Clear selection after delete
      } catch (error) {
        console.error('Failed to delete event:', error);
      }
    }
  };

  // Header actions for selected events
  const getHeaderActionsSingle = (selectedItems: EventData[]) => {
    const selectedEvent = selectedItems[0];
    if (!selectedEvent) return null;

    return (
      <Button
        onClick={() => handleDeleteEvent(selectedEvent.id)}
        leftIcon={Trash2}
        variant="outline"
        size="sm"
        className="text-red-600 border-red-300 hover:bg-red-50"
        disabled={deleteEventMutation.isLoading}
      >
        {deleteEventMutation.isLoading ? 'Removing...' : 'Remove Event'}
      </Button>
    );
  };

  if (authLoading || loading) {
    return <PageLoader title="Loading events..." variant="minimal" />;
  }

  if (!user || userProfile?.role !== 'admin') {
    return null;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-full">

      {/* Stats Cards */}
      {events.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <SingleStatCard
            stat={{
              label: "Total Events",
              value: events.length.toString(),
              icon: Calendar,
              color: "info"
            }}
          />
          <SingleStatCard
            stat={{
              label: "Active Events",
              value: events.filter((e: EventData) => e.status === 'active').length.toString(),
              icon: CheckCircle,
              color: "success"
            }}
          />
          <SingleStatCard
            stat={{
              label: "Total Teams",
              value: events.reduce((sum: number, event: EventData) => sum + event.teamCount, 0).toString(),
              icon: Users,
              color: "primary"
            }}
          />
          <SingleStatCard
            stat={{
              label: "Total Fixtures",
              value: events.reduce((sum: number, event: EventData) => sum + event.fixtureCount, 0).toString(),
              icon: Trophy,
              color: "secondary"
            }}
          />
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* AdvancedTable */}
      <AdvancedTable<EventData>
        data={events}
        columns={columns}
        actions={actions}
        loading={loading}
        searchable={true}
        searchPlaceholder="Search events..."
        filterable={false}
        sortable={true}
        selectable={true}
        selectedRows={selectedEvents}
        onSelectionChange={setSelectedEvents}
        onRowClick={handleRowClick}
        keyExtractor={(event) => event.id}
        headerActions={
          <Button
            onClick={() => setShowCreateModal(true)}
            leftIcon={Plus}
            variant="primary"
            size="sm"
          >
            Create Event
          </Button>
        }
        headerActionsSingle={getHeaderActionsSingle}
        emptyState={{
          icon: Calendar,
          title: 'No events found',
          description: 'No events have been created yet.'
        }}
      />

      {/* Create Event Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        title="Create New Event"
        description="Create a new tournament event with registration and schedule details"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Event Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Event Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              maxLength={200}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter event name"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter event description (optional)"
            />
          </div>

          {/* Registration Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="registrationStartDate" className="block text-sm font-medium text-gray-700 mb-2">
                Registration Start Date *
              </label>
              <input
                type="date"
                id="registrationStartDate"
                name="registrationStartDate"
                value={formData.registrationStartDate}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="registrationEndDate" className="block text-sm font-medium text-gray-700 mb-2">
                Registration End Date *
              </label>
              <input
                type="date"
                id="registrationEndDate"
                name="registrationEndDate"
                value={formData.registrationEndDate}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Event Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                Event Start Date *
              </label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                value={formData.startDate}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                Event End Date *
              </label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                value={formData.endDate}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="draft">Draft</option>
              <option value="registration_open">Registration Open</option>
              <option value="registration_closed">Registration Closed</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                resetForm();
              }}
              disabled={createEventMutation.isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={createEventMutation.isLoading}
            >
              {createEventMutation.isLoading ? 'Creating...' : 'Create Event'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Event Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedEvent(null);
        }}
        title={selectedEvent?.name || 'Event Details'}
        description="View event details and information"
        size="lg"
      >
        {selectedEvent && (
          <div className="space-y-6">
            {/* Event Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Event Name</h3>
                <p className="text-gray-900">{selectedEvent.name}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Status</h3>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  selectedEvent.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                  selectedEvent.status === 'active' ? 'bg-green-100 text-green-800' :
                  selectedEvent.status === 'registration_open' ? 'bg-blue-100 text-blue-800' :
                  selectedEvent.status === 'registration_closed' ? 'bg-yellow-100 text-yellow-800' :
                  selectedEvent.status === 'completed' ? 'bg-purple-100 text-purple-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {selectedEvent.status.replace('_', ' ')}
                </span>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
              <p className="text-gray-900">{selectedEvent.description || 'No description provided'}</p>
            </div>

            {/* Registration Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Registration Start</h3>
                <p className="text-gray-900">
                  {selectedEvent.registrationStartDate 
                    ? new Date(selectedEvent.registrationStartDate).toLocaleDateString() 
                    : 'Not set'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Registration End</h3>
                <p className="text-gray-900">
                  {selectedEvent.registrationEndDate 
                    ? new Date(selectedEvent.registrationEndDate).toLocaleDateString() 
                    : 'Not set'}
                </p>
              </div>
            </div>

            {/* Event Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Event Start Date</h3>
                <p className="text-gray-900">
                  {selectedEvent.startDate 
                    ? new Date(selectedEvent.startDate).toLocaleDateString() 
                    : 'Not set'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Event End Date</h3>
                <p className="text-gray-900">
                  {selectedEvent.endDate 
                    ? new Date(selectedEvent.endDate).toLocaleDateString() 
                    : 'Not set'}
                </p>
              </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{selectedEvent.teamCount || 0}</p>
                <p className="text-sm text-gray-600">Teams</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{selectedEvent.fixtureCount || 0}</p>
                <p className="text-sm text-gray-600">Fixtures</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{selectedEvent.matchCount || 0}</p>
                <p className="text-sm text-gray-600">Matches</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{selectedEvent.venueCount || 0}</p>
                <p className="text-sm text-gray-600">Venues</p>
              </div>
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Created By</h3>
                <p className="text-gray-900">{selectedEvent.createdByName || 'Unknown'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Created At</h3>
                <p className="text-gray-900">
                  {selectedEvent.createdAt 
                    ? new Date(selectedEvent.createdAt).toLocaleDateString() 
                    : 'Unknown'}
                </p>
              </div>
            </div>

            {/* Action Button */}
            <div className="flex justify-end pt-6 border-t border-gray-200">
              <Button
                onClick={() => {
                  setShowViewModal(false);
                  router.push(`/${lang}/admin/events/${selectedEvent.id}/edit`);
                }}
                leftIcon={Edit}
                variant="primary"
                size="sm"
              >
                Edit Event
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}