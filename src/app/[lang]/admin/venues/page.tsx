"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { 
  Container,
  DataTable,
  StatsCard,
  StatusBadge,
  EmptyState,
  ConfirmationModal,
  Button
} from '@/components/ui';
import { 
  Plus, 
  MapPin,
  Users,
  UserPlus,
  Edit,
  Eye,
  Trash2,
  Loader2
} from 'lucide-react';
import { getVenueStatus } from '@/components/ui/StatusBadge';
import type { Column, ActionButton } from '@/components/ui/DataTable';

interface SimplifiedVenue {
  venueId: string;
  name: string;
  shortName: string;
  type: 'cluster' | 'division' | 'final';
  address: string;
  pincode: string;
  district: string;
  state: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  supportedSports: Array<{
    sportId: string;
    sportName: string;
    courtCount: number;
    courtSpecifications: string;
  }>;
  primaryContact: {
    name: string;
    phone: string;
    email?: string;
    role: string;
  };
  assignedVolunteers: string[];
  officials: {
    coordinatorId?: string;
    referees: string[];
    medicalOfficer?: string;
  };
  isActive: boolean;
  currentStatus: 'available' | 'in_use' | 'maintenance' | 'unavailable';
  totalMatchesHosted: number;
  upcomingMatches: number;
  utilizationRate: number;
  createdAt: any;
  updatedAt: any;
}

export default function VenuesManagement() {
  const [venues, setVenues] = useState<SimplifiedVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingVenue, setDeletingVenue] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    isOpen: boolean;
    venue: SimplifiedVenue | null;
  }>({ isOpen: false, venue: null });

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

    loadVenues();
  }, [user, userProfile, authLoading, lang, router]);

  const loadVenues = async () => {
    try {
      setLoading(true);
      const venuesCollection = collection(db, 'venues');
      const venuesQuery = query(venuesCollection, orderBy('createdAt', 'desc'));
      const venuesSnapshot = await getDocs(venuesQuery);
      
      const venuesData: SimplifiedVenue[] = venuesSnapshot.docs.map(doc => ({
        venueId: doc.id,
        ...doc.data()
      })) as SimplifiedVenue[];
      
      setVenues(venuesData);
    } catch (err: any) {
      console.error('Error loading venues:', err);
      setError('Failed to load venues. Please check your permissions.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (venue: SimplifiedVenue) => {
    setConfirmDelete({ isOpen: true, venue });
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDelete.venue) return;

    const venueId = confirmDelete.venue.venueId;
    setDeletingVenue(venueId);
    
    try {
      const venueDoc = doc(db, 'venues', venueId);
      await updateDoc(venueDoc, {
        isActive: false,
        updatedAt: new Date()
      });
      
      // Update local state
      setVenues(prevVenues => 
        prevVenues.map(venue => 
          venue.venueId === venueId 
            ? { ...venue, isActive: false, updatedAt: new Date() }
            : venue
        )
      );
      
    } catch (err: any) {
      console.error('Error deactivating venue:', err);
      setError('Failed to deactivate venue. Please try again.');
    } finally {
      setDeletingVenue(null);
      setConfirmDelete({ isOpen: false, venue: null });
    }
  };

  // Define table columns for DataTable
  const columns: Column<SimplifiedVenue>[] = [
    {
      key: 'name',
      header: 'Venue',
      render: (_, venue) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{venue.name}</div>
          <div className="text-sm text-gray-500">{venue.shortName}</div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (_, venue) => (
        <StatusBadge 
          status={venue.type === 'cluster' ? 'info' : venue.type === 'division' ? 'success' : 'warning'}
          customLabel={venue.type}
          variant="soft"
        />
      ),
    },
    {
      key: 'location',
      header: 'Location',
      render: (_, venue) => (
        <div>
          <div className="text-sm text-gray-900">{venue.district}, {venue.state}</div>
          <div className="text-xs text-gray-500">{venue.pincode}</div>
        </div>
      ),
    },
    {
      key: 'sports',
      header: 'Sports',
      render: (_, venue) => `${venue.supportedSports?.length || 0} sport${(venue.supportedSports?.length || 0) !== 1 ? 's' : ''}`,
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (_, venue) => (
        <div>
          <div className="text-sm text-gray-900">{venue.primaryContact?.name || 'N/A'}</div>
          <div className="text-xs text-gray-500">{venue.primaryContact?.phone || 'N/A'}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (_, venue) => (
        <StatusBadge status={getVenueStatus(venue)} />
      ),
    },
  ];

  // Define action buttons for DataTable
  const actions: ActionButton<SimplifiedVenue>[] = [
    {
      label: 'View',
      icon: Eye,
      onClick: (venue) => router.push(`/${lang}/admin/venues/${venue.venueId}`),
      variant: 'primary',
    },
    {
      label: 'Edit',
      icon: Edit,
      onClick: (venue) => router.push(`/${lang}/admin/venues/${venue.venueId}/edit`),
      variant: 'secondary',
    },
    {
      label: 'Assign Volunteers',
      icon: UserPlus,
      onClick: (venue) => router.push(`/${lang}/admin/venues/${venue.venueId}/volunteers`),
      variant: 'success',
      hideOnMobile: true,
    },
    {
      label: 'Deactivate',
      icon: Trash2,
      onClick: handleDeleteClick,
      variant: 'danger',
      loading: (venue) => deletingVenue === venue.venueId,
    },
  ];

  // Define stats for StatsCard
  const statsData = venues.length > 0 ? [
    {
      label: 'Active',
      value: venues.filter(v => v.isActive).length,
      color: 'success' as const,
    },
    {
      label: 'Available',
      value: venues.filter(v => v.currentStatus === 'available').length,
      color: 'info' as const,
    },
    {
      label: 'Maintenance',
      value: venues.filter(v => v.currentStatus === 'maintenance').length,
      color: 'warning' as const,
    },
    {
      label: 'Inactive',
      value: venues.filter(v => !v.isActive).length,
      color: 'error' as const,
    },
  ] : [];

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#3A7F3F]" />
      </div>
    );
  }

  if (!user || userProfile?.role !== 'admin') {
    return null;
  }

  return (
    <Container>
      <div className="max-w-7xl mx-auto py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 font-fira">Venues Management</h1>
            <p className="text-gray-600 text-sm font-roboto">Manage sports venues and facilities</p>
          </div>
          
          <Button
            onClick={() => router.push(`/${lang}/admin/venues/create`)}
            leftIcon={Plus}
            variant="primary"
            size="base"
          >
            Add Venue
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600 font-roboto">{error}</p>
          </div>
        )}

        {/* Data Table with Mobile-First Design */}
        <DataTable
          data={venues}
          columns={columns}
          actions={actions}
          loading={loading}
          emptyState={{
            icon: MapPin,
            title: 'No venues found',
            description: 'Create your first venue to get started.',
            action: {
              label: 'Add Venue',
              onClick: () => router.push(`/${lang}/admin/venues/create`),
            },
          }}
          keyExtractor={(venue) => venue.venueId}
        />

        {/* Stats Cards */}
        {statsData.length > 0 && (
          <div className="mt-8">
            <StatsCard 
              stats={statsData}
              columns={4}
              size="base"
              showBorder
            />
          </div>
        )}

        {/* Confirmation Modal */}
        <ConfirmationModal
          isOpen={confirmDelete.isOpen}
          onClose={() => setConfirmDelete({ isOpen: false, venue: null })}
          onConfirm={handleDeleteConfirm}
          title="Deactivate Venue"
          description={`Are you sure you want to deactivate "${confirmDelete.venue?.name}"? This action will make the venue unavailable for new bookings.`}
          confirmLabel="Deactivate"
          confirmVariant="danger"
          loading={deletingVenue !== null}
        />
      </div>
    </Container>
  );
}
