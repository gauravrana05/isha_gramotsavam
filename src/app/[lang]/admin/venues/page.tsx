"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { 
  Container,
  AdvancedTable,
  StatsCard,
  StatusBadge,
  ConfirmationModal,
  Button,
  PageLoader,
  type Column,
  type ActionButton,
  type FilterField,
  type ExportConfig
} from '@/components/ui';
import { 
  Plus, 
  MapPin,
  Users,
  UserPlus,
  Edit,
  Eye,
  Trash2,
  Loader2,
  Download
} from 'lucide-react';
import { getVenueStatus } from '@/components/ui/StatusBadge';

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

  // Define table columns for AdvancedTable (venue, type, location, actions)
  const columns: Column<SimplifiedVenue>[] = [
    {
      key: 'name',
      header: 'Venue',
      accessor: 'name',
      sortable: true,
      priority: 'high',
      width: '180px',
      minWidth: '160px',
      render: (_, venue) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{venue.name}</div>
          <div className="text-xs text-gray-500">{venue.shortName}</div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      accessor: 'type',
      sortable: true,
      priority: 'high',
      width: '100px',
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
      accessor: 'district',
      sortable: true,
      priority: 'high',
      render: (_, venue) => (
        <div>
          <div className="text-sm text-gray-900">{venue.district}, {venue.state}</div>
          <div className="text-xs text-gray-500">{venue.pincode}</div>
        </div>
      ),
    },
  ];

  // Define action buttons for AdvancedTable
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
    },
    {
      label: 'Deactivate',
      icon: Trash2,
      onClick: handleDeleteClick,
      variant: 'danger',
      loading: (venue) => deletingVenue === venue.venueId,
    },
  ];

  // Define filters specific to venues (only district and venue type)
  const venueFilters: FilterField[] = [
    {
      key: 'type',
      label: 'Venue Type',
      type: 'select',
      options: [
        { label: 'Cluster', value: 'cluster' },
        { label: 'Division', value: 'division' },
        { label: 'Final', value: 'final' },
      ],
    },
    {
      key: 'district',
      label: 'District',
      type: 'text',
      placeholder: 'Enter district name',
    },
  ];

  // Define export options specific to venues
  const exportOptions: ExportConfig[] = [
    {
      label: 'Export CSV',
      format: 'csv',
      onExport: () => {
        const csvContent = [
          ['Venue Name', 'Short Name', 'Type', 'District', 'State', 'Pincode', 'Sports Count', 'Status', 'Contact Name', 'Contact Phone'].join(','),
          ...venues.map(venue => [
            venue.name,
            venue.shortName,
            venue.type,
            venue.district,
            venue.state,
            venue.pincode,
            venue.supportedSports?.length || 0,
            venue.currentStatus,
            venue.primaryContact?.name || '',
            venue.primaryContact?.phone || ''
          ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `venues_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
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
    return <PageLoader title="Loading venues..." variant="minimal" />;
  }

  if (!user || userProfile?.role !== 'admin') {
    return null;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-fira">Venues Management</h1>
          <p className="text-gray-600 text-sm font-fira">Manage sports venues and facilities</p>
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
          <p className="text-red-600 font-fira">{error}</p>
        </div>
      )}

        {/* Advanced Table with all features */}
        <AdvancedTable
          data={venues}
          columns={columns}
          actions={actions}
          loading={loading}
          
          // Search functionality
          searchable={true}
          searchPlaceholder="Search venues by name, location, or contact..."
          
          // Filter functionality
          filterable={true}
          filters={venueFilters}
          
          // Sort functionality
          sortable={true}
          multiSort={true}
          defaultSort={[{ key: 'name', direction: 'asc' }]}
          
          // Pagination
          pagination={{
            enabled: true,
            pageSize: 25,
            pageSizeOptions: [10, 25, 50, 100]
          }}
          
          // Export options
          exportOptions={exportOptions}
          
          // Selection (for future bulk actions)
          selectable={false}
          
          // State persistence in URL
          persistState={true}
          stateKey="venues"
          
          // Empty state
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
          stickyHeader={true}
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
  );
}
