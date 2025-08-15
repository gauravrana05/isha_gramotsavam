"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy, arrayUnion } from 'firebase/firestore';
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
    courtCount?: number;
    courtSpecifications?: string;
  }> | string[]; // Array of sport objects or sport IDs
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
  const [sportsData, setSportsData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingVenue, setDeletingVenue] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    isOpen: boolean;
    venue: SimplifiedVenue | null;
  }>({ isOpen: false, venue: null });
  const [volunteerModal, setVolunteerModal] = useState<{
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
      
      // Load venues and sports data in parallel
      const [venuesSnapshot, sportsSnapshot] = await Promise.all([
        getDocs(query(collection(db, 'venues'), orderBy('createdAt', 'desc'))),
        getDocs(collection(db, 'sports'))
      ]);
      
      // Process sports data
      const sportsMap: Record<string, any> = {};
      sportsSnapshot.docs.forEach(doc => {
        sportsMap[doc.id] = doc.data();
      });
      setSportsData(sportsMap);
      
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

  const handleVolunteerAssignClick = (venue: SimplifiedVenue) => {
    setVolunteerModal({ isOpen: true, venue });
  };

  const handleVolunteerAssign = async (assignment: any) => {
    if (!volunteerModal.venue) return;
    
    try {
      // Update venue's assigned volunteers
      const venueDoc = doc(db, 'venues', volunteerModal.venue.venueId);
      await updateDoc(venueDoc, {
        assignedVolunteers: arrayUnion(assignment.volunteerId),
        updatedAt: new Date()
      });

      // If technical role selected, update volunteer's role in users collection
      if (assignment.volunteerType === 'technical') {
        const userDoc = doc(db, 'users', assignment.volunteerId);
        await updateDoc(userDoc, {
          role: 'technical_volunteer',
          updatedAt: new Date()
        });
      }
      
      // Update local state
      setVenues(prevVenues => 
        prevVenues.map(venue => 
          venue.venueId === volunteerModal.venue!.venueId 
            ? { ...venue, assignedVolunteers: [...(venue.assignedVolunteers || []), assignment.volunteerId] }
            : venue
        )
      );
      
      setVolunteerModal({ isOpen: false, venue: null });
    } catch (err: any) {
      console.error('Error assigning volunteer:', err);
      setError('Failed to assign volunteer. Please try again.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDelete.venue) return;

    const venueId = confirmDelete.venue.venueId;
    setDeletingVenue(venueId);
    
    try {
      const venueDoc = doc(db, 'venues', venueId);
      await deleteDoc(venueDoc);
      
      // Update local state - remove venue from list
      setVenues(prevVenues => 
        prevVenues.filter(venue => venue.venueId !== venueId)
      );
      
    } catch (err: any) {
      console.error('Error deleting venue:', err);
      setError('Failed to delete venue. Please try again.');
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
    {
      key: 'supportedSports',
      header: 'Sports',
      accessor: 'supportedSports',
      sortable: false,
      priority: 'medium',
      width: '180px',
      render: (_, venue) => {
        const sports = venue.supportedSports || [];
        if (sports.length === 0) {
          return <span className="text-xs text-gray-400">No sports</span>;
        }
        
        // Handle both object format and string format
        const displaySports = sports.slice(0, 2).map((sport: any) => {
          if (typeof sport === 'string') {
            // Sport ID format - look up in sportsData
            return sportsData[sport]?.displayName || sportsData[sport]?.name || sport;
          } else {
            // Sport object format - use sportName or sportId
            return sport.sportName || sportsData[sport.sportId]?.displayName || sportsData[sport.sportId]?.name || sport.sportId;
          }
        });
        
        return (
          <div className="flex flex-wrap gap-1">
            {displaySports.map((sportName: string, index: number) => (
              <span 
                key={index}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {sportName}
              </span>
            ))}
            {sports.length > 2 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                +{sports.length - 2}
              </span>
            )}
          </div>
        );
      },
    },
  ];

  // Define action buttons for AdvancedTable
  const actions: ActionButton<SimplifiedVenue>[] = [
    {
      label: 'View',
      icon: Eye,
      onClick: (venue) => router.push(`/${lang}/admin/venues/${venue.venueId}`),
      variant: 'primary',
      tooltip: 'View venue details'
    },
    {
      label: 'Edit',
      icon: Edit,
      onClick: (venue) => router.push(`/${lang}/admin/venues/${venue.venueId}/edit`),
      variant: 'secondary',
      tooltip: 'Edit venue information'
    },
    {
      label: 'Volunteers',
      icon: UserPlus,
      onClick: handleVolunteerAssignClick,
      variant: 'success',
      tooltip: 'Assign volunteers to this venue'
    },
    {
      label: 'Delete',
      icon: Trash2,
      onClick: handleDeleteClick,
      variant: 'danger',
      loading: (venue) => deletingVenue === venue.venueId,
      tooltip: 'Permanently delete this venue'
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
          size="sm"
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
        title="Delete Venue"
        description={`Are you sure you want to permanently delete "${confirmDelete.venue?.name}"? This action cannot be undone and will remove all venue data including assigned volunteers and bookings.`}
        confirmLabel="Delete Venue"
        confirmVariant="danger"
        loading={deletingVenue !== null}
      />

      {/* Volunteer Assignment Modal */}
      {volunteerModal.isOpen && (
        <VenueVolunteerAssignmentModal
          isOpen={volunteerModal.isOpen}
          onClose={() => setVolunteerModal({ isOpen: false, venue: null })}
          onAssign={handleVolunteerAssign}
          currentAssignments={[]}
          venueName={volunteerModal.venue?.name || ''}
        />
      )}
    </div>
  );
}

// Inline Volunteer Assignment Modal Component
const VenueVolunteerAssignmentModal = ({
  isOpen,
  onClose,
  onAssign,
  currentAssignments,
  venueName
}: {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (assignment: any) => void;
  currentAssignments: any[];
  venueName: string;
}) => {
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [selectedVolunteer, setSelectedVolunteer] = useState('');
  const [volunteerType, setVolunteerType] = useState<'general' | 'technical'>('general');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingVolunteers, setLoadingVolunteers] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadVolunteers();
    }
  }, [isOpen]);

  const loadVolunteers = async () => {
    try {
      setLoadingVolunteers(true);
      const usersCollection = collection(db, 'users');
      const volunteersSnapshot = await getDocs(usersCollection);
      const volunteersData = volunteersSnapshot.docs
        .map(doc => {
          const data = doc.data() as { role?: string; isActive?: boolean };
          return { id: doc.id, ...data };
        })
        .filter(user => user.role === 'general_volunteer' && user.isActive !== false);

      setVolunteers(volunteersData);
    } catch (err: any) {
      setError('Failed to load volunteers.');
    } finally {
      setLoadingVolunteers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVolunteer) {
      setError('Please select a volunteer');
      return;
    }

    setIsSubmitting(true);
    try {
      const volunteer = volunteers.find(v => v.id === selectedVolunteer);
      if (!volunteer) {
        setError('Selected volunteer not found');
        return;
      }

      const assignment = {
        volunteerId: selectedVolunteer,
        volunteerName: `${volunteer.firstName} ${volunteer.lastName}`,
        volunteerEmail: volunteer.email,
        volunteerType: volunteerType
      };

      await onAssign(assignment);
      setSelectedVolunteer('');
      setVolunteerType('general');
    } catch (err: any) {
      setError('Failed to assign volunteer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Assign Volunteer</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Venue</label>
            <input
              type="text"
              value={venueName}
              disabled
              className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Volunteer</label>
            {loadingVolunteers ? (
              <div className="flex items-center justify-center py-3">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Loading volunteers...
              </div>
            ) : (
              <select 
                value={selectedVolunteer}
                onChange={(e) => setSelectedVolunteer(e.target.value)}
                required 
                className="w-full p-3 border border-gray-300 rounded-lg"
              >
                <option value="">Select Volunteer</option>
                {volunteers.map(volunteer => (
                  <option key={volunteer.id} value={volunteer.id}>
                    {volunteer.firstName} {volunteer.lastName} - {volunteer.email}
                  </option>
                ))}
              </select>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Volunteer Type</label>
            <select 
              value={volunteerType}
              onChange={(e) => setVolunteerType(e.target.value as 'general' | 'technical')}
              className="w-full p-3 border border-gray-300 rounded-lg"
            >
              <option value="general">General</option>
              <option value="technical">Technical</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !selectedVolunteer}
              className="flex-1 bg-[#3A7F3F] hover:bg-green-700"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Assign
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
