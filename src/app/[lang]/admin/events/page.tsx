"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { 
  AdvancedTable,
  StatsCard,
  StatusBadge,
  EmptyState,
  ConfirmationModal,
  Button,
  PageLoader
} from '@/components/ui';
import { 
  Plus, 
  Calendar,
  Edit,
  Eye,
  Trash2,
  Loader2
} from 'lucide-react';
import { getEventStatus } from '@/components/ui/StatusBadge';
import type { Column, ActionButton } from '@/components/ui';

interface Event {
  eventId: string;
  name: string;
  description: string;
  startDate: any;
  endDate: any;
  registrationStartDate: any;
  registrationEndDate: any;
  sports: string[];
  venues: string[];
  maxTeams: number;
  registrationFee: number;
  prizes: {
    [level: string]: {
      first: number;
      second: number;
      third: number;
      participation: number;
    };
  };
  rules: string[];
  eligibilityCriteria: string[];
  contactInfo: {
    email: string;
    phone: string;
    address: string;
  };
  isActive: boolean;
  isRegistrationOpen: boolean;
  bannerImageURL: string;
  createdAt: any;
  updatedAt: any;
}

export default function EventsManagement() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingEvent, setDeletingEvent] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    isOpen: boolean;
    event: Event | null;
  }>({ isOpen: false, event: null });

  const { lang } = useParams();
  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();

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

    loadEvents();
  }, [user, userProfile, authLoading, lang, router]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const eventsCollection = collection(db, 'events');
      const eventsQuery = query(eventsCollection, orderBy('createdAt', 'desc'));
      const eventsSnapshot = await getDocs(eventsQuery);
      
      const eventsData: Event[] = eventsSnapshot.docs.map(doc => ({
        eventId: doc.id,
        ...doc.data()
      })) as Event[];
      
      setEvents(eventsData);
    } catch (err: any) {
      console.error('Error loading events:', err);
      setError('Failed to load events. Please check your permissions.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (event: Event) => {
    setConfirmDelete({ isOpen: true, event });
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDelete.event) return;

    const eventId = confirmDelete.event.eventId;
    setDeletingEvent(eventId);
    
    try {
      const eventDoc = doc(db, 'events', eventId);
      await updateDoc(eventDoc, {
        isActive: false,
        updatedAt: new Date()
      });
      
      // Update local state
      setEvents(prevEvents => 
        prevEvents.map(event => 
          event.eventId === eventId 
            ? { ...event, isActive: false, updatedAt: new Date() }
            : event
        )
      );
      
    } catch (err: any) {
      console.error('Error deactivating event:', err);
      setError('Failed to deactivate event. Please try again.');
    } finally {
      setDeletingEvent(null);
      setConfirmDelete({ isOpen: false, event: null });
    }
  };

  // Helper function to check if registration is currently open
  const isRegistrationCurrentlyOpen = (event: Event) => {
    if (!event.isActive) return false;
    
    const now = new Date();
    const regStart = event.registrationStartDate?.toDate ? event.registrationStartDate.toDate() : null;
    const regEnd = event.registrationEndDate?.toDate ? event.registrationEndDate.toDate() : null;
    
    // If no registration dates are set, use manual flag
    if (!regStart && !regEnd) {
      return event.isRegistrationOpen;
    }
    
    // If only end date is set, registration is open until that date
    if (!regStart && regEnd) {
      return now <= regEnd;
    }
    
    // If only start date is set, registration is open from that date
    if (regStart && !regEnd) {
      return now >= regStart;
    }
    
    // If both dates are set, registration is open between them
    return now >= regStart && now <= regEnd;
  };

  // Define table columns for DataTable
  const columns: Column<Event>[] = [
    {
      key: 'name',
      header: 'Event',
      render: (_, event) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{event.name}</div>
          <div className="text-sm text-gray-500">{event.description}</div>
        </div>
      ),
    },
    {
      key: 'dates',
      header: 'Dates',
      render: (_, event) => (
        <div>
          <div className="text-sm text-gray-900">{event.startDate?.toDate ? event.startDate.toDate().toLocaleDateString() : 'TBD'}</div>
          <div className="text-xs text-gray-500">to {event.endDate?.toDate ? event.endDate.toDate().toLocaleDateString() : 'TBD'}</div>
        </div>
      ),
    },
    {
      key: 'teams',
      header: 'Teams',
      render: (_, event) => event.maxTeams,
    },
    {
      key: 'sports',
      header: 'Sports',
      render: (_, event) => `${event.sports?.length || 0} sport${(event.sports?.length || 0) !== 1 ? 's' : ''}`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (_, event) => (
        <StatusBadge status={getEventStatus(event)} />
      ),
    },
  ];

  // Define action buttons for DataTable
  const actions: ActionButton<Event>[] = [
    {
      label: 'View',
      icon: Eye,
      onClick: (event) => router.push(`/${lang}/admin/events/${event.eventId}`),
      variant: 'primary',
    },
    {
      label: 'Edit',
      icon: Edit,
      onClick: (event) => router.push(`/${lang}/admin/events/${event.eventId}/edit`),
      variant: 'secondary',
    },
    {
      label: 'Deactivate',
      icon: Trash2,
      onClick: handleDeleteClick,
      variant: 'danger',
      loading: (event) => deletingEvent === event.eventId,
    },
  ];

  // Define stats for StatsCard
  const statsData = events.length > 0 ? [
    {
      label: 'Active',
      value: events.filter(e => e.isActive).length,
      color: 'success' as const,
    },
    {
      label: 'Registration Open',
      value: events.filter(e => isRegistrationCurrentlyOpen(e)).length,
      color: 'info' as const,
    },
    {
      label: 'Inactive',
      value: events.filter(e => !e.isActive).length,
      color: 'error' as const,
    },
  ] : [];

  if (authLoading || loading) {
    return <PageLoader title="Loading events..." variant="minimal" />;
  }

  if (!user || userProfile?.role !== 'admin') {
    return null;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Events Management</h1>
          <p className="text-gray-600 text-sm">Manage tournaments, exhibitions, and ceremonies</p>
        </div>
        
        <Button
          onClick={() => router.push(`/${lang}/admin/events/create`)}
          leftIcon={Plus}
          variant="primary"
          size="sm"
        >
          Add Event
        </Button>
      </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600 font-roboto">{error}</p>
          </div>
        )}

        {/* Advanced Table with full feature set */}
        <AdvancedTable<Event>
          data={events}
          columns={columns}
          actions={actions}
          loading={loading}
          searchable={true}
          searchPlaceholder="Search events..."
          filterable={false}
          sortable={true}
          defaultSort={[{ key: 'name', direction: 'asc' }]}
          pagination={{ enabled: false }}
          emptyState={{
            icon: Calendar,
            title: 'No events found',
            description: 'Create your first event to get started.',
            action: {
              label: 'Add Event',
              onClick: () => router.push(`/${lang}/admin/events/create`),
            },
          }}
          keyExtractor={(event) => event.eventId}
          stickyHeader={true}
        />

      {/* Stats Cards */}
      {statsData.length > 0 && (
        <div className="mt-8">
          <StatsCard 
            stats={statsData}
            columns={3}
            size="base"
            showBorder
          />
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, event: null })}
        onConfirm={handleDeleteConfirm}
        title="Deactivate Event"
        description={`Are you sure you want to deactivate "${confirmDelete.event?.name}"? This action will make the event unavailable for new registrations.`}
        confirmLabel="Deactivate"
        confirmVariant="danger"
        loading={deletingEvent !== null}
      />
    </div>
  );
}