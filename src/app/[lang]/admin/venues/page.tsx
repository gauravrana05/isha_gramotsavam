"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { api } from '@/server/trpc/react';
import { 
  AdvancedTable,
  SingleStatCard,
  PageLoader,
  Button,
  type Column,
} from '@/components/ui';
import { StatusSelector } from '@/components/ui/StatusSelector';
import { VenueCreateModal } from '@/components/admin/VenueCreateModal';
import { VenueDetailModal } from '@/components/admin/VenueDetailModal';
import { 
  Plus, 
  MapPin,
  Users,
  Building,
  Loader2,
  Trash2
} from 'lucide-react';

interface VenueData {
  id: string;
  name: string;
  panchayat: string | null;
  taluk: string | null;
  district: string;
  state: string;
  capacity: number | null;
  contactPerson: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  facilities: string | null;
  isActive: boolean;
  createdAt: string;
  _count: {
    teams: number;
    events: number;
  };
}

export default function VenuesManagement() {
  const router = useRouter();
  const { lang } = useParams();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { addNotification } = useNotification();
  // State
  const [selectedVenues, setSelectedVenues] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // tRPC queries
  const {
    data: venuesData,
    isLoading: venuesLoading,
    error: venuesError,
    refetch: refetchVenues
  } = api.admin.venues.getVenues.useQuery({
    limit: 100,
    status: statusFilter,
    searchQuery: searchQuery || undefined,
  }, {
    enabled: !!user && userProfile?.role === 'admin'
  });

  const updateStatusMutation = api.admin.venues.updateVenueStatus.useMutation({
    onSuccess: () => {
      addNotification('Venue status updated successfully', 'success');
      refetchVenues();
    },
    onError: (error) => {
      addNotification(error.message || 'Failed to update venue status', 'error');
    },
  });

  const deleteVenuesMutation = api.admin.venues.deleteVenues.useMutation({
    onSuccess: (data) => {
      addNotification(`${data.deleted} venue(s) deleted successfully`, 'success');
      setSelectedVenues([]);
      refetchVenues();
    },
    onError: (error) => {
      addNotification(error.message || 'Failed to delete venues', 'error');
    },
  });

  // Auth check
  useEffect(() => {
    if (!authLoading && (!user || userProfile?.role !== 'admin')) {
      router.push(`/${lang}/dashboard`);
    }
  }, [user, userProfile, authLoading, router, lang]);

  // Loading skeleton columns
  const columnSkeleton: Column<VenueData>[] = [
    {
      key: 'name',
      header: 'Venue Details',
      render: () => (
        <div>
          <div className="h-4 bg-gray-200 rounded animate-pulse mb-1"></div>
          <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4"></div>
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      render: () => (
        <div>
          <div className="h-4 bg-gray-200 rounded animate-pulse mb-1"></div>
          <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2"></div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      render: () => (
        <div>
          <div className="h-4 bg-gray-200 rounded animate-pulse mb-1"></div>
          <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3"></div>
        </div>
      ),
    },
    {
      key: 'capacity',
      header: 'Capacity',
      render: () => <div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div>,
    },
    {
      key: 'teams',
      header: 'Teams',
      render: () => <div className="h-4 bg-gray-200 rounded animate-pulse w-12"></div>,
    },
    {
      key: 'status',
      header: 'Status',
      render: () => <div className="h-6 bg-gray-200 rounded animate-pulse w-20"></div>,
    },
  ];

  // Table columns
  const columns: Column<VenueData>[] = [
    {
      key: 'name',
      header: 'Venue Details',
      render: (_, venue) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{venue.name}</div>
          <div className="text-sm text-gray-500">
            {venue.panchayat && `${venue.panchayat}, `}{venue.taluk}
          </div>
          {venue.facilities && (
            <div className="text-xs text-gray-400 truncate max-w-xs">
              {venue.facilities}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      render: (_, venue) => (
        <div>
          <div className="text-sm text-gray-900">{venue.district}</div>
          <div className="text-sm text-gray-500">{venue.state}</div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (_, venue) => (
        <div>
          {venue.contactPerson && (
            <div className="text-sm font-medium text-gray-900">{venue.contactPerson}</div>
          )}
          {venue.contactPhone && (
            <div className="text-sm text-gray-600">{venue.contactPhone}</div>
          )}
          {venue.contactEmail && (
            <div className="text-xs text-gray-500 truncate max-w-xs">{venue.contactEmail}</div>
          )}
        </div>
      ),
    },
    {
      key: 'capacity',
      header: 'Capacity',
      render: (_, venue) => (
        <div className="text-sm text-gray-900">
          {venue.capacity ? venue.capacity.toLocaleString() : 'N/A'}
        </div>
      ),
    },
    {
      key: 'teams',
      header: 'Teams',
      render: (_, venue) => (
        <div className="text-center">
          <div className="text-sm font-medium text-gray-900">{venue._count.teams}</div>
          <div className="text-xs text-gray-500">assigned</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (_, venue) => (
        <StatusSelector
          value={venue.isActive ? 'active' : 'inactive'}
          onChange={(status) => {
            updateStatusMutation.mutate({
              venueId: venue.id,
              isActive: status === 'active'
            });
          }}
          options={[
            { value: 'active', label: 'Active', color: 'green' },
            { value: 'inactive', label: 'Inactive', color: 'red' },
          ]}
          disabled={updateStatusMutation.isLoading}
        />
      ),
    },
  ];

  // Header actions based on selection
  const headerActionsNone = (
    <Button
      onClick={() => setShowCreateModal(true)}
      className="bg-[#4A2F1D] text-white hover:bg-[#3A251A]"
      icon={<Plus className="w-4 h-4" />}
    >
      Add Venue
    </Button>
  );

  const headerActionsSingle = (
    <Button
      onClick={() => {
        setSelectedVenueId(selectedVenues[0]);
        setShowDetailModal(true);
      }}
      className="bg-[#4A2F1D] text-white hover:bg-[#3A251A]"
    >
      Edit Venue
    </Button>
  );

  const headerActionsMultiple = (
    <Button
      onClick={() => {
        if (confirm(`Are you sure you want to delete ${selectedVenues.length} venue(s)?`)) {
          deleteVenuesMutation.mutate({ venueIds: selectedVenues });
        }
      }}
      className="bg-red-600 text-white hover:bg-red-700"
      icon={<Trash2 className="w-4 h-4" />}
      disabled={deleteVenuesMutation.isLoading}
    >
      {deleteVenuesMutation.isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        `Remove ${selectedVenues.length} Venues`
      )}
    </Button>
  );

  // Stats calculations
  const stats = useMemo(() => {
    if (!venuesData?.venues) return null;

    const venues = venuesData.venues;
    const totalVenues = venues.length;
    const activeVenues = venues.filter(v => v.isActive).length;
    const totalTeams = venues.reduce((sum, v) => sum + v._count.teams, 0);
    const totalEvents = venues.reduce((sum, v) => sum + v._count.events, 0);

    return {
      totalVenues,
      activeVenues,
      totalTeams,
      totalEvents,
    };
  }, [venuesData]);

  // Handle row click
  const handleRowClick = (venue: VenueData) => {
    setSelectedVenueId(venue.id);
    setShowDetailModal(true);
  };

  // Loading state
  if (authLoading || venuesLoading) {
    return <PageLoader />;
  }

  // Error state
  if (venuesError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Venues</h2>
          <p className="text-gray-600 mb-4">{venuesError.message}</p>
          <Button onClick={() => refetchVenues()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Venues Management</h1>
          <p className="text-gray-600 mt-2">Manage tournament venues and their assignments</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <SingleStatCard
              stat={{
                title: "Total Venues",
                value: stats.totalVenues,
                icon: Building,
                color: "info"
              }}
            />
            <SingleStatCard
              stat={{
                title: "Active Venues",
                value: stats.activeVenues,
                icon: MapPin,
                color: "success"
              }}
            />
            <SingleStatCard
              stat={{
                title: "Teams Assigned",
                value: stats.totalTeams,
                icon: Users,
                color: "secondary"
              }}
            />
            <SingleStatCard
              stat={{
                title: "Events Hosted",
                value: stats.totalEvents,
                icon: Building,
                color: "primary"
              }}
            />
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Venues
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, district, or location..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A2F1D] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status Filter
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4A2F1D] focus:border-transparent"
              >
                <option value="all">All Venues</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm">
          <AdvancedTable
            data={venuesData?.venues || []}
            columns={venuesLoading ? columnSkeleton : columns}
            loading={venuesLoading}
            selection={{
              selectedItems: selectedVenues,
              onSelectionChange: setSelectedVenues,
              getItemId: (venue) => venue.id,
            }}
            headerActions={{
              none: headerActionsNone,
              single: headerActionsSingle,
              multiple: headerActionsMultiple,
            }}
            onRowClick={handleRowClick}
            emptyState={{
              title: 'No venues found',
              description: 'Get started by adding your first venue.',
              action: (
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-[#4A2F1D] text-white hover:bg-[#3A251A]"
                  icon={<Plus className="w-4 h-4" />}
                >
                  Add Venue
                </Button>
              ),
            }}
          />
        </div>
      </div>

      {/* Modals */}
      <VenueCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => refetchVenues()}
      />

      <VenueDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedVenueId(null);
        }}
        venueId={selectedVenueId}
        onSuccess={() => refetchVenues()}
      />
    </div>
  );
}
