"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useParams} from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { api } from '@/server/trpc/react';
import { 
  AdvancedTable,
  PageLoader,
  type Column,
  type FilterField,
  type TableParams,
} from '@/components/ui';
import { EnhancedModal } from '@/components/ui/EnhancedModal';
import { VenueForm, VenueFormValues } from '@/components/admin/VenueForm';
import { 
  Plus, 
  Edit,
  Trash2, 
  MapPin,
  Building,
  AlertTriangle,
  Users
} from 'lucide-react';

interface VenueData {
  id: string;
  name: string;
  address: string;
  panchayat: string | null;
  taluk: string | null;
  district: string;
  state: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  // Level mapping data
  levels?: ('cluster' | 'division' | 'final')[];
  eventName?: string;
  eventId?: string;
}

export default function AdminVenuesPage() {
  const router = useRouter();
  const { lang } = useParams();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { addNotification } = useNotification();

  // State management
  const [selectedVenues, setSelectedVenues] = useState<Set<string | number>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<VenueData | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [venueToEdit, setVenueToEdit] = useState<VenueData | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [venueToDelete, setVenueToDelete] = useState<VenueData | null>(null);

  // Table state for client-side operations
  const [tableParams, setTableParams] = useState<TableParams>({
    search: '',
    sort: [],
    filters: [],
    page: 1,
    pageSize: 25,
  });

  // Auth check
  useEffect(() => {
    if (!authLoading && (!user || userProfile?.role !== 'admin')) {
      router.push(`/${lang}/dashboard`);
    }
  }, [user, userProfile, authLoading, router, lang]);

  // tRPC queries - get all venues for client-side filtering
  const {
    data: venuesData,
    isLoading: venuesLoading,
    error: venuesError,
    refetch: refetchVenues
  } = api.admin.venues.getVenues.useQuery({
    limit: 1000, // Get all venues for client-side filtering
    status: 'all',
  }, {
    enabled: !!user && userProfile?.role === 'admin'
  });

  // Client-side filtered and processed venues
  const venues = useMemo(() => {
    if (!venuesData?.venues) return [];

    let filteredVenues = [...venuesData.venues];

    // Apply client-side filtering for search
    if (tableParams.search) {
      const searchLower = tableParams.search.toLowerCase();
      filteredVenues = filteredVenues.filter(venue => 
        venue.name.toLowerCase().includes(searchLower) ||
        venue.address.toLowerCase().includes(searchLower) ||
        venue.district.toLowerCase().includes(searchLower) ||
        venue.state.toLowerCase().includes(searchLower)
      );
    }

    // Apply active/inactive status filter
    const statusFilter = tableParams.filters.find(f => f.key === 'isActive');
    if (statusFilter && statusFilter.value) {
      const isActiveFilter = statusFilter.value === 'true';
      filteredVenues = filteredVenues.filter(venue => 
        venue.isActive === isActiveFilter
      );
    }

    // Apply district filter
    const districtFilter = tableParams.filters.find(f => f.key === 'district');
    if (districtFilter && districtFilter.value) {
      filteredVenues = filteredVenues.filter(venue =>
        venue.district.toLowerCase().includes(districtFilter.value.toLowerCase())
      );
    }

    // Apply state filter
    const stateFilter = tableParams.filters.find(f => f.key === 'state');
    if (stateFilter && stateFilter.value) {
      filteredVenues = filteredVenues.filter(venue =>
        venue.state.toLowerCase().includes(stateFilter.value.toLowerCase())
      );
    }

    return filteredVenues;
  }, [venuesData, tableParams.search, tableParams.filters]);

  const loading = venuesLoading || authLoading;

  const createVenueMutation = api.admin.venues.createVenue.useMutation({
    onSuccess: () => {
      addNotification('Venue created successfully', 'success');
      setShowCreateModal(false);
      refetchVenues();
    },
    onError: (error) => {
      addNotification(error.message || 'Failed to create venue', 'error');
    },
  });

  const updateVenueMutation = api.admin.venues.updateVenue.useMutation({
    onSuccess: () => {
      addNotification('Venue updated successfully', 'success');
      setShowViewModal(false);
      setIsEditMode(false);
      setVenueToEdit(null);
      refetchVenues();
    },
    onError: (error) => {
      addNotification(error.message || 'Failed to update venue', 'error');
    },
  });

  const deleteVenuesMutation = api.admin.venues.deleteVenues.useMutation({
    onSuccess: (data) => {
      addNotification(`${data.deleted} venue(s) deleted successfully`, 'success');
      setSelectedVenues(new Set());
      setShowDeleteConfirm(false);
      setVenueToDelete(null);
      refetchVenues();
    },
    onError: (error) => {
      addNotification(error.message || 'Failed to delete venues', 'error');
    },
  });

  // Handle data load for filtering
  const handleDataLoad = useCallback((params: TableParams) => {
    setTableParams(params);
  }, []);

  // Handle row click - open view modal
  const handleRowClick = (venue: VenueData) => {
    setSelectedVenue(venue);
    setShowViewModal(true);
    setIsEditMode(false);
  };

  // Table columns
  const columns: Column<VenueData>[] = [
    {
      key: 'name',
      header: 'Venue Name',
      sortable: true,
      render: (_, venue) => (
        <div className="font-medium text-gray-900">{venue.name}</div>
      ),
    },
    {
      key: 'address',
      header: 'Address',
      render: (_, venue) => (
        <div className="text-sm text-gray-900 max-w-xs truncate">
          {venue.address}
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      sortable: true,
      render: (_, venue) => (
        <div>
          <div className="text-sm text-gray-900">{venue.district}, {venue.state}</div>
          {(venue.panchayat || venue.taluk) && (
            <div className="text-sm text-gray-500">
              {venue.panchayat && `${venue.panchayat}, `}{venue.taluk}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'levels',
      header: 'Levels',
      render: (_, venue) => (
        <div className="flex flex-wrap gap-1">
          {venue.levels && venue.levels.length > 0 ? (
            venue.levels.map((level) => (
              <span
                key={level}
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  level === 'cluster' ? 'bg-blue-100 text-blue-700' :
                  level === 'division' ? 'bg-green-100 text-green-700' :
                  'bg-purple-100 text-purple-700'
                }`}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </span>
            ))
          ) : (
            <span className="text-gray-400 italic text-sm">No levels</span>
          )}
        </div>
      ),
    },
    {
      key: 'event',
      header: 'Current Event',
      render: (_, venue) => (
        <div className="text-sm text-gray-900">
          {venue.eventName || <span className="text-gray-400 italic">No event</span>}
        </div>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      sortable: true,
      render: (_, venue) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          venue.isActive 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {venue.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ];

  // Filter fields
  const filterFields: FilterField[] = [
    {
      key: 'isActive',
      label: 'Status',
      type: 'select',
      category: 'Status',
      options: [
        { label: 'Active', value: 'true' },
        { label: 'Inactive', value: 'false' }
      ]
    },
    {
      key: 'district',
      label: 'District',
      type: 'text',
      category: 'Location',
      placeholder: 'Filter by district...',
    },
    {
      key: 'state',
      label: 'State',
      type: 'text',
      category: 'Location',
      placeholder: 'Filter by state...',
    },
  ];

  // Handle form submission
  const handleCreateSubmit = (values: VenueFormValues) => {
    createVenueMutation.mutate(values);
  };

  const handleUpdateSubmit = (values: VenueFormValues) => {
    if (!venueToEdit) return;
    updateVenueMutation.mutate({
      id: venueToEdit.id,
      ...values,
    });
  };
  

  const handleDelete = () => {
    if (venueToDelete) {
      deleteVenuesMutation.mutate({ venueIds: [venueToDelete.id] });
    } else if (selectedVenues.size > 0) {
      deleteVenuesMutation.mutate({ venueIds: Array.from(selectedVenues) as string[] });
    }
  };

  // Loading state
  if (authLoading) {
    return <PageLoader />;
  }

  // Error state
  if (venuesError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Venues</h2>
          <p className="text-gray-600 mb-4">{venuesError.message}</p>
          <button 
            onClick={() => refetchVenues()}
            className="px-4 py-2 bg-[#4A2F1D] text-white rounded-lg hover:bg-[#3A251A]"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdvancedTable<VenueData>
          data={(venues || []) as VenueData[]}
          columns={columns}
          loading={loading}
          onDataLoad={handleDataLoad}
          searchable={true}
          searchPlaceholder="Search venues..."
          searchFields={['name', 'district', 'state']}
          filterable={true}
          filters={filterFields}
          sortable={true} 
          selectable={true}
          selectedRows={selectedVenues}
          onSelectionChange={setSelectedVenues}
          onRowClick={handleRowClick}
          keyExtractor={(venue) => venue.id}
          headerActions={
            selectedVenues.size === 0 ? (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#F28C38] border border-transparent rounded-lg hover:bg-[#E67A26] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Venue
              </button>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete ({selectedVenues.size})
              </button>
            )
          }
          emptyState={{
            icon: Building,
            title: 'No venues found',
            description: 'Get started by adding your first venue.',
          }}
          noSearchResultsEmptyState={{
            icon: Building,
            title: 'No matching venues',
            description: 'Try adjusting your search or filters to find what you\'re looking for.',
          }}
          pagination={{ enabled: true }}
          persistState={false}
        />
      </div>

      {/* Create Modal */}
      <EnhancedModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Venue"
        subtitle="Create a new venue with location details and contact information"
        size="lg"
        mobileFullScreen={true}
        scrollableBody={true}
        footer={
          <div className="flex flex-row space-x-3 sm:justify-end">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              disabled={createVenueMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                console.log('Create button clicked, calling form submit');
                if ((window as any).venueFormSubmit) {
                  (window as any).venueFormSubmit();
                } else {
                  console.error('venueFormSubmit not found');
                }
              }}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-[#F28C38] border border-transparent rounded-lg hover:bg-[#E67A26] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
            >
              {createVenueMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 inline-block" />
                  Creating...
                </>
              ) : (
                'Create Venue'
              )}
            </button>
          </div>
        }
      >
        <div id="venue-form">
          <VenueForm
            onSubmit={handleCreateSubmit}
            onCancel={() => setShowCreateModal(false)}
            isLoading={createVenueMutation.isPending}
            onFormSubmit={() => {}}
          />
        </div>
      </EnhancedModal>

      {/* View/Edit Modal */}
      {selectedVenue && (
        <EnhancedModal
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false);
            setIsEditMode(false);
            setVenueToEdit(null);
            setSelectedVenue(null);
          }}
          title={isEditMode ? "Edit Venue" : "Venue Details"}
          subtitle={isEditMode ? "Update venue details and settings" : `${selectedVenue.name} - Complete Information`}
          size="lg"
          mobileFullScreen={true}
          scrollableBody={true}
          footer={
            isEditMode ? (
              <div className="flex flex-row space-x-3 sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditMode(false);
                    setVenueToEdit(null);
                  }}
                  className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  disabled={updateVenueMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="venue-edit-form"
                  className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-[#F28C38] border border-transparent rounded-lg hover:bg-[#E67A26] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
                  disabled={updateVenueMutation.isPending}
                >
                  {updateVenueMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 inline-block" />
                      Updating...
                    </>
                  ) : (
                    'Update Venue'
                  )}
                </button>
              </div>
            ) : (
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setIsEditMode(true);
                    setVenueToEdit({
                      ...selectedVenue,
                      levels: selectedVenue.levels || [],
                      eventId: selectedVenue.eventId || '',
                    });
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#F28C38] border border-transparent rounded-lg hover:bg-[#E67A26] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  <Edit className="w-4 h-4 mr-2 inline" />
                  Edit Venue
                </button>
              </div>
            )
          }
        >
          <VenueForm
            initialData={isEditMode ? venueToEdit : selectedVenue}
            onSubmit={handleUpdateSubmit}
            onCancel={() => {
              setShowViewModal(false);
              setIsEditMode(false);
              setVenueToEdit(null);
              setSelectedVenue(null);
            }}
            isLoading={updateVenueMutation.isPending}
            isEditMode={isEditMode}
            onEdit={() => {
              setIsEditMode(true);
              setVenueToEdit({
                ...selectedVenue,
                levels: selectedVenue.levels || [],
                eventId: selectedVenue.eventId || '',
              });
            }}
          />
        </EnhancedModal>
      )}

      {/* Delete Confirmation Modal */}
      <EnhancedModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setVenueToDelete(null);
        }}
        title="Confirm Delete"
        subtitle="This action cannot be undone"
        size="sm"
        footer={
          <div className="flex flex-row space-x-3 sm:justify-end">
            <button
              onClick={() => {
                setShowDeleteConfirm(false);
                setVenueToDelete(null);
              }}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              disabled={deleteVenuesMutation.isPending}
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              disabled={deleteVenuesMutation.isPending}
            >
              {deleteVenuesMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 inline-block" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </button>
          </div>
        }
      >
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <p className="text-gray-600 mb-4">
            Are you sure you want to delete{' '}
            {venueToDelete ? (
              <strong>"{venueToDelete.name}"</strong>
            ) : (
              <strong>{selectedVenues.size} selected venue{selectedVenues.size > 1 ? 's' : ''}</strong>
            )}?
          </p>
          <p className="text-sm text-red-600">
            This action cannot be undone and will remove all associated data.
          </p>
        </div>
      </EnhancedModal>
    </div>
  );
}
