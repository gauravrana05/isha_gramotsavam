"use client";

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
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
import { EnhancedModal } from '@/components/ui/EnhancedModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/AdvancedSelect';
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
  createdByUser: {
    firstName: string | null;
    lastName: string | null;
  };
  _count: {
    fixtures: number;
    teams: number;
  };
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export default function AdminEventsPage() {
  const router = useRouter();
  const { lang } = useParams();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { addNotification } = useNotification();
  const [selectedEvents, setSelectedEvents] = useState<Set<string | number>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<EventData | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<EventData | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    registrationStartDate: '',
    registrationEndDate: '',
    startDate: '',
    endDate: '',
    status: 'draft' as const, // Keep for edit mode
  });

  // tRPC query with enhanced parameters
  const eventsQuery = api.admin.events.getEvents.useQuery({
    limit: 100,
    status: 'all'
  }, {
    enabled: !!user,
    onSuccess: (data) => {
      console.log('=== QUERY SUCCESS ===');
      console.log('Success data:', data);
    },
    onError: (error) => {
      console.error('=== EVENTS QUERY ERROR (CLIENT) ===');
      console.error('Error object:', error);
      console.error('Error message:', error.message);
      console.error('Error data:', error.data);
      console.error('Error shape:', error.shape);
    }
  });

  const {
    data: eventsData,
    isPending: eventsLoading,
    error: eventsError,
    refetch: refetchEvents
  } = eventsQuery;

  // Log error if it exists
  useEffect(() => {
    if (eventsError) {
      console.error('=== EVENTS ERROR STATE ===');
      console.error('Error:', eventsError);
      console.error('Error message:', eventsError.message);
      console.error('Error data:', eventsError.data);
    }
  }, [eventsError]);

  // Test delete mutation
  const testDeleteMutation = api.admin.events.testDelete.useMutation({
    onSuccess: () => {
      refetchEvents();
    },
    onError: (error) => {
      console.error('Error deleting event:', error);
    }
  });

  // Delete event mutation
  const deleteEventMutation = api.admin.events.deleteEvent.useMutation({
    onSuccess: () => {
      refetchEvents();
      addNotification('Event deleted successfully', 'success');
    },
    onError: (error) => {
      console.error('Error deleting event:', error);
      addNotification('Failed to delete event. Please try again.', 'error');
    },
  });

  // Create event mutation
  const createEventMutation = api.admin.events.createEvent.useMutation({
    onSuccess: (data) => {
      console.log('Event created successfully:', data);
      refetchEvents();
      setShowCreateModal(false);
      resetForm();
      setIsEditMode(false);
      setEventToEdit(null);
      addNotification('Event created successfully', 'success');
    },
    onError: (error) => {
      console.error('Error creating event:', error);
      console.error('Error data:', error.data);
      console.error('Error cause:', error.cause);
      const errorMessage = error.message || 'Failed to create event. Please try again.';
      addNotification(errorMessage, 'error');
    },
  });

  // Update event mutation
  const updateEventMutation = api.admin.events.updateEvent.useMutation({
    onSuccess: () => {
      refetchEvents();
      setShowCreateModal(false);
      resetForm();
      setIsEditMode(false);
      setEventToEdit(null);
      addNotification('Event updated successfully', 'success');
    },
    onError: (error) => {
      console.error('Error updating event:', error);
      const errorMessage = error.message || 'Failed to update event. Please try again.';
      addNotification(errorMessage, 'error');
    },
  });

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push(`/${lang}/login`);
      return;
    }

    if (userProfile?.role !== 'admin') {
      router.push(`/${lang}/public`);
      return;
    }
  }, [user, userProfile, authLoading, lang, router]);

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
      accessor: 'registrationEndDate',
      sortable: true,
      minWidth: 130,
      render: (_, event) => (
        <div className="text-sm text-gray-900">
          {event.registrationEndDate ? (
            <>
              <div>Until</div>
              <div className="text-xs">{new Date(event.registrationEndDate).toLocaleDateString()}</div>
            </>
          ) : 'Not set'}
        </div>
      ),
    },
    {
      key: 'teams',
      header: 'Teams',
      accessor: (event) => event._count.teams,
      sortable: true,
      minWidth: 80,
      render: (_, event) => (
        <div className="flex items-center space-x-1">
          <Users className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-900">{event._count.teams}</span>
        </div>
      ),
    },
    {
      key: 'fixtures',
      header: 'Fixtures',
      accessor: (event) => event._count.fixtures,
      sortable: true,
      minWidth: 80,
      render: (_, event) => (
        <div className="flex items-center space-x-1">
          <Trophy className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-900">{event._count.fixtures}</span>
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
      onClick: (event) => {
        setEventToEdit(event);
        setIsEditMode(true);
        populateFormWithEvent(event);
        setShowCreateModal(true);
      },
      variant: 'secondary',
    }
  ], []);

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
      status: 'draft' as const, // Keep for edit mode
    });
  };

  const formatDateForInput = (dateString: string | null) => {
    if (!dateString) return '';
    return new Date(dateString).toISOString().split('T')[0];
  };

  const populateFormWithEvent = (event: EventData) => {
    setFormData({
      name: event.name,
      description: event.description || '',
      registrationStartDate: formatDateForInput(event.registrationStartDate),
      registrationEndDate: formatDateForInput(event.registrationEndDate),
      startDate: formatDateForInput(event.startDate),
      endDate: formatDateForInput(event.endDate),
      status: event.status as any,
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value: string, name: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Form validation
  const validateForm = () => {
    const errors: string[] = [];
    
    if (!formData.name.trim()) {
      errors.push('Event name is required');
    }
    
    if (!formData.registrationStartDate) {
      errors.push('Registration start date is required');
    }
    
    if (!formData.registrationEndDate) {
      errors.push('Registration end date is required');
    }
    
    if (!formData.startDate) {
      errors.push('Event start date is required');
    }
    
    if (!formData.endDate) {
      errors.push('Event end date is required');
    }
    
    // Date range validation
    if (formData.registrationStartDate && formData.registrationEndDate) {
      if (new Date(formData.registrationStartDate) >= new Date(formData.registrationEndDate)) {
        errors.push('Registration start date must be before registration end date');
      }
    }
    
    if (formData.startDate && formData.endDate) {
      if (new Date(formData.startDate) >= new Date(formData.endDate)) {
        errors.push('Event start date must be before event end date');
      }
    }
    
    if (formData.registrationEndDate && formData.startDate) {
      if (new Date(formData.registrationEndDate) > new Date(formData.startDate)) {
        errors.push('Registration must end before event starts');
      }
    }
    
    return errors;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // Validate form
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      validationErrors.forEach(error => addNotification(error, 'error'));
      return;
    }
    
    try {
      // Convert date strings to ISO datetime format
      const formatDateToISO = (dateString: string) => {
        if (!dateString) return '';
        return new Date(dateString + 'T00:00:00.000Z').toISOString();
      };

      const eventData = {
        name: formData.name,
        registrationStartDate: formData.registrationStartDate || new Date().toISOString().split('T')[0],
        registrationEndDate: formData.registrationEndDate || new Date().toISOString().split('T')[0],
        startDate: formData.startDate || new Date().toISOString().split('T')[0],
        endDate: formData.endDate || new Date().toISOString().split('T')[0],
        ...(formData.description && { description: formData.description }),
        ...(isEditMode && { status: formData.status }), // Include status only for edit mode
      };

      console.log('Submitting event data:', eventData);
      console.log('Form data:', formData);

      if (isEditMode && eventToEdit) {
        await updateEventMutation.mutateAsync({
          id: eventToEdit.id,
          ...eventData,
        });
      } else {
        await createEventMutation.mutateAsync(eventData);
      }
    } catch (error) {
      console.error('Failed to save event:', error);
    }
  };

  // Handle delete event
  const handleDeleteEvent = (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    if (event) {
      setEventToDelete(event as any);
      setShowDeleteConfirm(true);
    }
  };

  // Bulk delete events
  const bulkDeleteEvents = async () => {
    if (selectedEvents.size === 0) return;
    
    try {
      const eventIds = Array.from(selectedEvents);
      await api.admin.events.bulkDeleteEvents.useQuery({ ids: eventIds });
      refetchEvents();
      setSelectedEvents(new Set());
      addNotification(`${eventIds.length} events deleted successfully`, 'success');
    } catch (error) {
      console.error('Failed to bulk delete events:', error);
      addNotification('Failed to delete events. Please try again.', 'error');
    }
  };

  // Delete event using query approach
  const confirmDeleteEvent = async () => {
    if (!eventToDelete) return;
    
    try {
      await deleteEventMutation.mutateAsync({ id: eventToDelete.id });
      setSelectedEvents(new Set()); // Clear selection after delete
      setShowDeleteConfirm(false);
      setEventToDelete(null);
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  // Single selection delete action
  const getHeaderActionsSingle = (selectedItems: EventData[]) => {
    const selectedEvent = selectedItems[0];
    if (!selectedEvent) return null;

    return (
      <button
        onClick={() => {
          setEventToDelete(selectedEvent);
          setShowDeleteConfirm(true);
        }}
        className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
      >
        <Trash2 className="w-4 h-4 mr-2" />
        Delete
      </button>
    );
  };

  if (authLoading) {
    return <PageLoader title="Loading..." variant="minimal" />;
  }

  if (!user || userProfile?.role !== 'admin') {
    return null;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-full">

      {/* AdvancedTable */}
      <AdvancedTable
        data={events}
        columns={columns}
        actions={actions}
        loading={eventsLoading}
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
          <div className="flex items-center gap-2">
            {selectedEvents.size > 0 && (
              <button
                onClick={bulkDeleteEvents}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Selected ({selectedEvents.size})
              </button>
            )}
            <button
              onClick={() => {
                resetForm();
                setShowCreateModal(true);
              }}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#F28C38] border border-transparent rounded-lg hover:bg-[#E67A26] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Event
            </button>
          </div>
        }
        headerActionsSingle={getHeaderActionsSingle}
        emptyState={{
          icon: Calendar,
          title: 'No events found',
          description: 'No events have been created yet.',
          action: {
            label: 'Create Event',
            onClick: () => {
              resetForm();
              setShowCreateModal(true);
            }
          }
        }}
        noSearchResultsEmptyState={{
          icon: Calendar,
          title: 'No matching events',
          description: 'Try adjusting your search or filters to find what you\'re looking for.',
        }}
      />

      {/* Create/Edit Event Modal */}
      <EnhancedModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
          setIsEditMode(false);
          setEventToEdit(null);
        }}
        title={isEditMode ? "Edit Event" : "Create New Event"}
        subtitle={isEditMode ? "Update event details and settings" : "Create a new tournament event with registration and schedule details"}
        size="xl"
        mobileFullScreen={true}
        scrollableBody={true}
        footer={
          <div className="flex flex-row space-x-3 sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setShowCreateModal(false);
                resetForm();
                setIsEditMode(false);
                setEventToEdit(null);
              }}
              disabled={createEventMutation.isPending || updateEventMutation.isPending}
              className="flex-1 sm:flex-initial sm:px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={createEventMutation.isPending || updateEventMutation.isPending}
              className="flex-1 sm:flex-initial sm:px-4 bg-[#F28C38] text-white rounded-lg hover:bg-[#E67A26] transition-colors font-medium py-2 text-sm"
            >
              {(createEventMutation.isPending || updateEventMutation.isPending)
                ? (isEditMode ? 'Updating...' : 'Creating...') 
                : (isEditMode ? 'Update Event' : 'Create Event')
              }
            </button>
          </div>
        }
      >
        <div className="space-y-6">
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

          {/* Status - Only show for edit mode */}
          {isEditMode && (
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                Status {!isEditMode && <span className="text-xs text-gray-500">(Auto-calculated based on dates)</span>}
              </label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleSelectChange(value, 'status')}
                disabled={!isEditMode}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select event status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="registration_open">Registration Open</SelectItem>
                  <SelectItem value="registration_closed">Registration Closed</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </EnhancedModal>

      {/* View Event Modal */}
      <EnhancedModal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedEvent(null);
        }}
        title={selectedEvent?.name || 'Event Details'}
        subtitle="View event details and information"
        size="xl"
        mobileFullScreen={true}
        scrollableBody={true}
        footer={
          selectedEvent ? (
            <div className="flex flex-row space-x-3 sm:justify-end">
             
              <button
                onClick={() => {
                  if (selectedEvent) {
                    setEventToEdit(selectedEvent);
                    setIsEditMode(true);
                    populateFormWithEvent(selectedEvent);
                    setShowViewModal(false);
                    setShowCreateModal(true);
                  }
                }}
                className="flex-1 sm:flex-initial sm:px-4 bg-[#F28C38] text-white rounded-lg hover:bg-[#E67A26] transition-colors font-medium py-2 text-sm"
              >
                Edit Event
              </button>
            </div>
          ) : undefined
        }
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
                <p className="text-2xl font-bold text-gray-900">{selectedEvent._count.teams || 0}</p>
                <p className="text-sm text-gray-600">Teams</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{selectedEvent._count.fixtures || 0}</p>
                <p className="text-sm text-gray-600">Fixtures</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">0</p>
                <p className="text-sm text-gray-600">Matches</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">0</p>
                <p className="text-sm text-gray-600">Venues</p>
              </div>
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Created By</h3>
                <p className="text-gray-900">{`${selectedEvent.createdByUser?.firstName || ''} ${selectedEvent.createdByUser?.lastName || ''}`.trim() || 'Unknown'}</p>
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

          </div>
        )}
      </EnhancedModal>

      {/* Delete Confirmation Modal */}
      <EnhancedModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setEventToDelete(null);
        }}
        title="Confirm Delete"
        subtitle="This action cannot be undone"
        size="sm"
        footer={
          <div className="flex flex-row space-x-3 sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setShowDeleteConfirm(false);
                setEventToDelete(null);
              }}
              disabled={deleteEventMutation.isPending}
              className="flex-1 sm:flex-initial sm:px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDeleteEvent}
              disabled={deleteEventMutation.isPending}
              className="flex-1 sm:flex-initial sm:px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium py-2 text-sm"
            >
              {deleteEventMutation.isPending ? 'Deleting...' : 'Delete Event'}
            </button>
          </div>
        }
      >
        <div className="text-center py-4">
          <p className="text-gray-600 mb-4">
            Are you sure you want to delete the event <strong>&quot;{eventToDelete?.name}&quot;</strong>?
          </p>
          <p className="text-sm text-red-600">
            This action cannot be undone and will permanently remove all associated data.
          </p>
        </div>
      </EnhancedModal>
    </div>
  );
}