"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/server/trpc/react';
import { 
  AdvancedTable,
  SingleStatCard,
  PageLoader,
  Button,
  type Column,
  type ActionButton,
} from '@/components/ui';
import { 
  Plus, 
  MapPin,
  Users,
  Edit,
  Eye,
  Loader2
} from 'lucide-react';

interface VenueData {
  id: string;
  name: string;
  address: string;
  district: string;
  state: string;
  capacity: number | null;
  status: string;
  assignedTeams: number;
  createdAt: string | null;
}

export default function VenuesManagement() {
  const router = useRouter();
  const { lang } = useParams();
  const { user, userProfile, loading: authLoading } = useAuth();

  // tRPC query
  const {
    data: venuesData,
    isLoading: venuesLoading,
    error: venuesError
  } = api.admin.getVenues.useQuery({
    limit: 100,
    status: 'all'
  }, {
    enabled: !!user && userProfile?.role === 'admin'
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

  const loading = venuesLoading;
  const error = venuesError?.message || '';
  const venues = venuesData?.venues || [];

  // Define table columns for AdvancedTable
  const columns: Column<VenueData>[] = useMemo(() => [
    {
      key: 'name',
      header: 'Venue Name',
      accessor: 'name',
      sortable: true,
      minWidth: 200,
      render: (_, venue) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{venue.name}</div>
          <div className="text-sm text-gray-500">{venue.address}</div>
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      accessor: 'district',
      sortable: true,
      minWidth: 150,
      render: (_, venue) => (
        <div>
          <div className="text-sm text-gray-900">{venue.district}</div>
          <div className="text-sm text-gray-500">{venue.state}</div>
        </div>
      ),
    },
    {
      key: 'capacity',
      header: 'Capacity',
      accessor: 'capacity',
      sortable: true,
      minWidth: 100,
      render: (_, venue) => (
        <span className="text-sm text-gray-900">
          {venue.capacity ? venue.capacity.toLocaleString() : 'N/A'}
        </span>
      ),
    },
    {
      key: 'assignedTeams',
      header: 'Teams Assigned',
      accessor: 'assignedTeams',
      sortable: true,
      minWidth: 120,
      render: (_, venue) => (
        <div className="flex items-center space-x-1">
          <Users className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-900">{venue.assignedTeams}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      accessor: 'status',
      sortable: true,
      minWidth: 100,
      render: (_, venue) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          venue.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {venue.status === 'active' ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      accessor: 'createdAt',
      sortable: true,
      minWidth: 120,
      render: (_, venue) => (
        <span className="text-sm text-gray-500">
          {venue.createdAt ? new Date(venue.createdAt).toLocaleDateString() : 'N/A'}
        </span>
      ),
    }
  ], []);

  // Define action buttons for AdvancedTable
  const actions: ActionButton<VenueData>[] = useMemo(() => [
    {
      label: 'View',
      icon: Eye,
      onClick: (venue) => router.push(`/${lang}/admin/venues/${venue.id}`),
      variant: 'primary',
    },
    {
      label: 'Edit',
      icon: Edit,
      onClick: (venue) => router.push(`/${lang}/admin/venues/${venue.id}/edit`),
      variant: 'secondary',
    }
  ], [router, lang]);

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
          <h1 className="text-2xl font-bold text-gray-900">Venues Management</h1>
          <p className="text-gray-600 text-sm">Manage tournament venues and locations</p>
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

      {/* Stats Cards */}
      {venues.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <SingleStatCard
            stat={{
              label: "Total Venues",
              value: venues.length.toString(),
              icon: MapPin,
              color: "info"
            }}
          />
          <SingleStatCard
            stat={{
              label: "Active Venues",
              value: venues.filter((v) => v.status === 'active').length.toString(),
              icon: MapPin,
              color: "success"
            }}
          />
          <SingleStatCard
            stat={{
              label: "Total Team Assignments",
              value: venues.reduce((sum, venue) => sum + venue.assignedTeams, 0).toString(),
              icon: Users,
              color: "primary"
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
      <AdvancedTable<VenueData>
        data={venues}
        columns={columns}
        actions={actions}
        loading={loading}
        searchable={true}
        searchPlaceholder="Search venues..."
        filterable={false}
        sortable={true}
        keyExtractor={(venue) => venue.id}
        emptyState={{
          icon: MapPin,
          title: 'No venues found',
          description: 'No venues have been added yet.'
        }}
      />
    </div>
  );
}