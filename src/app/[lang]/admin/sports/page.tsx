'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { api } from '@/server/trpc/react';
import { 
  AdvancedTable,
  type Column,
  type ActionButton,
  type FilterField,
  type ExportConfig,
  type TableParams,
  PageLoader
} from '@/components/ui';
import { EnhancedModal } from '@/components/ui/EnhancedModal';
import { SportForm, SportFormValues } from '@/components/admin/SportForm';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Trophy,
  Users,
  Eye,
  Download,
  AlertTriangle
} from 'lucide-react';
import { Sport } from '@prisma/client';

interface SportData extends Sport {
  genderCategories?: string[];
  teamCount?: number;
  fixtureCount?: number;
  matchCount?: number;
}

export default function AdminSportsPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const { addNotification } = useNotification();

  // State management
  const [selectedSports, setSelectedSports] = useState<Set<string | number>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedSport, setSelectedSport] = useState<SportData | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [sportToEdit, setSportToEdit] = useState<SportData | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [sportToDelete, setSportToDelete] = useState<SportData | null>(null);

  // Table state for server-side operations
  const [tableParams, setTableParams] = useState<TableParams>({
    search: '',
    sort: [],
    filters: [],
    page: 1,
    pageSize: 25,
  });

  // Data fetching with table parameters
  const queryParams = useMemo(() => {
    const params = {
      includeTeamCounts: true,
      includeGenderCategories: true
    };
    return params;
  }, []);

  const {
    data: sportsData,
    isLoading: sportsLoading,
    error: sportsError,
    refetch: refetchSports
  } = api.admin.events.getSports.useQuery(queryParams, {
    enabled: !!user && userProfile?.role === 'admin'
  });

  // Mutations
  const createSportMutation = api.admin.events.createSport.useMutation({
    onSuccess: (data) => {
      refetchSports();
      addNotification('Sport created successfully!', 'success');
      setShowCreateModal(false);
    },
    onError: (error) => {
      console.error('Create sport error:', error);
      addNotification(error.message || 'Failed to create sport. Please try again.', 'error');
    },
  });

  const updateSportMutation = api.admin.events.updateSport.useMutation({
    onSuccess: (data) => {
      refetchSports();
      addNotification('Sport updated successfully!', 'success');
      setShowCreateModal(false);
    },
    onError: (error) => {
      console.error('Update sport error:', error);
      addNotification(error.message || 'Failed to update sport. Please try again.', 'error');
    },
  });

  const deleteSportMutation = api.admin.events.deleteSport.useMutation({
    onSuccess: async () => {
      setSelectedSports(new Set());
      await refetchSports();
      addNotification('Sport deleted successfully!', 'success');
      setShowDeleteConfirm(false);
      setSportToDelete(null);
    },
    onError: (error) => {
      console.error('Delete sport error:', error);
      addNotification(error.message || 'Failed to delete sport. Please try again.', 'error');
    },
  });

  // Transform sports data and apply client-side filtering for gender categories
  const sports = useMemo(() => {
    if (!sportsData) {
      return [];
    }
    
    let transformedSports = sportsData.map((sport: any) => ({
      ...sport,
      // Backend already returns genderCategories transformed
      genderCategories: sport.genderCategories || [],
      teamCount: sport._count?.teams || 0,
      fixtureCount: sport.fixtureCount || 0,
      matchCount: sport.matchCount || 0,
    }));

    // Apply client-side filtering for search and filters
    if (tableParams.search) {
      const searchLower = tableParams.search.toLowerCase();
      transformedSports = transformedSports.filter(sport => 
        sport.name.toLowerCase().includes(searchLower) ||
        (sport.description && sport.description.toLowerCase().includes(searchLower))
      );
    }

    // Apply active/inactive status filter
    const statusFilter = tableParams.filters.find(f => f.key === 'isActive');
    if (statusFilter && statusFilter.value) {
      const isActiveFilter = statusFilter.value === 'true';
      transformedSports = transformedSports.filter(sport => 
        sport.isActive === isActiveFilter
      );
    }

    // Apply gender category filter
    const genderCategoryFilter = tableParams.filters.find(f => f.key === 'genderCategory');
    if (genderCategoryFilter && genderCategoryFilter.value) {
      transformedSports = transformedSports.filter(sport =>
        sport.genderCategories.includes(genderCategoryFilter.value as string)
      );
    }

    return transformedSports;
  }, [sportsData, tableParams.search, tableParams.filters]);

  const loading = sportsLoading || authLoading;

  // Column configuration
  const columns = useMemo<Column<SportData>[]>(() => [
    {
      key: 'name',
      header: 'Sport Name',
      sortable: true,
      render: (_, sport) => (
        <div className="flex items-center space-x-2">
          <Trophy className="w-4 h-4 text-amber-500" />
          <span className="font-medium text-gray-900">{sport.name}</span>
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (_, sport) => (
        <span className="text-sm text-gray-600">
          {sport.description ? (
            sport.description.length > 50 
              ? `${sport.description.substring(0, 50)}...` 
              : sport.description
          ) : (
            <span className="text-gray-400 italic">No description</span>
          )}
        </span>
      ),
    },
    {
      key: 'players',
      header: 'Team Size',
      sortable: true,
      render: (_, sport) => (
        <div className="text-sm">
          <div className="text-gray-900 font-medium">
            {sport.mainPlayersCount || 0} main
          </div>
          <div className="text-gray-500">
            {sport.maxSubstitutes || 0} substitutes
          </div>
        </div>
      ),
    },
    {
      key: 'genderCategories',
      header: 'Gender Categories',
      render: (_, sport) => (
        <div className="flex flex-wrap gap-1">
          {sport.genderCategories?.map((category: string) => (
            <span
              key={category}
              className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                category === 'men' ? 'bg-blue-100 text-blue-700' :
                category === 'women' ? 'bg-pink-100 text-pink-700' :
                'bg-purple-100 text-purple-700'
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </span>
          )) || (
            <span className="text-gray-400 italic text-sm">No categories</span>
          )}
        </div>
      ),
    },
    {
      key: 'teams',
      header: 'Teams',
      sortable: true,
      render: (_, sport) => (
        <div className="flex items-center space-x-1">
          <Users className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-900">{sport.teamCount || 0}</span>
        </div>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      sortable: true,
      render: (_, sport) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          sport.isActive 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {sport.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    }
  ], []);

  // Action buttons
  const actions: ActionButton<SportData>[] = useMemo(() => [
    {
      label: 'Edit',
      icon: Edit,
      onClick: (sport) => handleEdit(sport),
      variant: 'secondary',
    }
  ], []);

  // Export configuration - removed for mobile optimization

  // Filter configuration
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
      key: 'genderCategory',
      label: 'Gender Category',
      type: 'select',
      category: 'Categories',
      options: [
        { label: 'Men', value: 'men' },
        { label: 'Women', value: 'women' },
        { label: 'Mixed', value: 'mixed' }
      ]
    }
  ];

  // Event handlers
  const handleEdit = (sport: SportData) => {
    setSportToEdit(sport);
    setIsEditMode(true);
    setShowCreateModal(true);
  };

  const handleRowClick = (sport: SportData) => {
    setSelectedSport(sport);
    setShowViewModal(true);
  };

  const handleSubmit = async (data: SportFormValues) => {
    try {
      if (isEditMode && sportToEdit) {
        await updateSportMutation.mutateAsync({
          id: sportToEdit.id,
          ...data,
        });
      } else {
        await createSportMutation.mutateAsync(data);
      }
    } catch (error) {
      // Error handling is done in mutation callbacks
      console.error('Form submission error:', error);
    }
  };

  const confirmDelete = async () => {
    if (sportToDelete) {
      try {
        await deleteSportMutation.mutateAsync({ id: sportToDelete.id });
      } catch (error) {
        // Error handling is done in mutation callbacks
        console.error('Delete confirmation error:', error);
      }
    }
  };

  const resetForm = () => {
    setIsEditMode(false);
    setSportToEdit(null);
  };

  // Handle table parameter changes for search and filters
  const handleDataLoad = useCallback((params: TableParams) => {
    setTableParams(params);
  }, []);

  // Memoized form default values to prevent unnecessary resets
  const formDefaultValues = useMemo(() => {
    if (isEditMode && sportToEdit) {
      return {
        id: sportToEdit.id,
        name: sportToEdit.name,
        description: sportToEdit.description || '',
        mainPlayersCount: sportToEdit.mainPlayersCount,
        maxSubstitutes: sportToEdit.maxSubstitutes,
        isActive: sportToEdit.isActive,
        genderCategories: sportToEdit.genderCategories && sportToEdit.genderCategories.length > 0 
          ? sportToEdit.genderCategories 
          : ['men', 'women'],
      };
    }
    return {
      name: '',
      description: '',
      mainPlayersCount: 11,
      maxSubstitutes: 5,
      isActive: true,
      genderCategories: ['men', 'women'],
    };
  }, [isEditMode, sportToEdit]);


  const getHeaderActionsSingle = (selectedItems: SportData[]) => {
    const sport = selectedItems[0];
    return (
      <div className="flex items-center gap-2"> 
        <button
          onClick={() => {
            setSportToDelete(sport);
            setShowDeleteConfirm(true);
          }}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </button>
      </div>
    );
  };

  // Loading state
  if (authLoading) {
    return <PageLoader />;
  }

  // Auth check
  if (!user || userProfile?.role !== 'admin') {
    return null;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-full">

      {/* AdvancedTable */}
      <AdvancedTable<SportData>
        data={sports}
        columns={columns}
        loading={loading}
        onDataLoad={handleDataLoad}
        searchable={true}
        searchPlaceholder="Search sports..."
        searchFields={['name', 'description']}
        filterable={true}
        filters={filterFields}
        sortable={true}
        selectable={true}
        selectedRows={selectedSports}
        onSelectionChange={setSelectedSports}
        onRowClick={handleRowClick}
        keyExtractor={(sport) => sport.id}
        headerActions={
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#F28C38] border border-transparent rounded-lg hover:bg-[#E67A26] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create 
          </button>
        }
        headerActionsSingle={getHeaderActionsSingle}
        emptyState={{
          icon: Trophy,
          title: 'No sports found',
          description: 'No sports have been created yet.',
          action: {
            label: 'Create Sport',
            onClick: () => {
              resetForm();
              setShowCreateModal(true);
            }
          }
        }}
        noSearchResultsEmptyState={{
          icon: Trophy,
          title: 'No matching sports',
          description: 'Try adjusting your search or filters to find what you\'re looking for.',
        }}
        pagination={{ enabled: true }}
        persistState={false}
      />

      {/* Create/Edit Sport Modal */}
      <EnhancedModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
        }}
        title={isEditMode ? "Edit Sport" : "Create New Sport"}
        subtitle={isEditMode ? "Update sport details and settings" : "Create a new sport with player requirements and categories"}
        size="lg"
        mobileFullScreen={true}
        scrollableBody={true}
        footer={
          <div className="flex flex-row space-x-3 sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setShowCreateModal(false);
              }}
              disabled={createSportMutation.isPending || updateSportMutation.isPending}
              className="flex-1 sm:flex-initial sm:px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                // Trigger form submission via form element
                const form = document.querySelector('#sport-form-element') as HTMLFormElement;
                if (form) {
                  form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                }
              }}
              disabled={createSportMutation.isPending || updateSportMutation.isPending}
              className="flex-1 sm:flex-initial sm:px-4 bg-[#F28C38] text-white rounded-lg hover:bg-[#E67A26] transition-colors font-medium py-2 text-sm"
            >
              {(createSportMutation.isPending || updateSportMutation.isPending)
                ? (isEditMode ? 'Updating...' : 'Creating...') 
                : (isEditMode ? 'Update Sport' : 'Create Sport')
              }
            </button>
          </div>
        }
      >
        <div id="sport-form">
          <SportForm
            onSubmit={handleSubmit}
            defaultValues={formDefaultValues}
            isLoading={createSportMutation.isPending || updateSportMutation.isPending}
          />
        </div>
      </EnhancedModal>

      {/* View Sport Modal */}
      {selectedSport && (
        <EnhancedModal
          isOpen={showViewModal}
          onClose={() => setShowViewModal(false)}
          title="Sport Details"
          subtitle={`${selectedSport.name} - Complete Information`}
          size="lg"
          mobileFullScreen={true}
          scrollableBody={true}
          footer={
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  handleEdit(selectedSport);
                }}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#F28C38] rounded-lg hover:bg-[#E67A26] transition-colors"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Sport
              </button>
            </div>
          }
        >
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Sport Name</h3>
                <p className="text-gray-900 text-lg font-semibold">{selectedSport.name}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Status</h3>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  selectedSport.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {selectedSport.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="col-span-2">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
                <p className="text-gray-900">
                  {selectedSport.description || 'No description provided'}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Main Players</h3>
                <p className="text-gray-900 text-2xl font-bold">{selectedSport.mainPlayersCount}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Max Substitutes</h3>
                <p className="text-gray-900 text-2xl font-bold">{selectedSport.maxSubstitutes}</p>
              </div>

              <div className="col-span-2">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Gender Categories</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedSport.genderCategories?.map((category: string) => (
                    <span
                      key={category}
                      className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                        category === 'men' ? 'bg-blue-100 text-blue-700' :
                        category === 'women' ? 'bg-pink-100 text-pink-700' :
                        'bg-purple-100 text-purple-700'
                      }`}
                    >
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </span>
                  )) || (
                    <span className="text-gray-400 italic">No categories assigned</span>
                  )}
                </div>
              </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{selectedSport.teamCount || 0}</p>
                <p className="text-sm text-gray-600">Teams</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{selectedSport.fixtureCount || 0}</p>
                <p className="text-sm text-gray-600">Fixtures</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{selectedSport.matchCount || 0}</p>
                <p className="text-sm text-gray-600">Matches</p>
              </div>
            </div>

            {/* Timestamps */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Created At</h3>
                <p className="text-gray-900">
                  {selectedSport.createdAt 
                    ? new Date(selectedSport.createdAt).toLocaleDateString() 
                    : 'Unknown'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Last Updated</h3>
                <p className="text-gray-900">
                  {selectedSport.updatedAt 
                    ? new Date(selectedSport.updatedAt).toLocaleDateString() 
                    : 'Never'}
                </p>
              </div>
            </div>

          </div>
        </EnhancedModal>
      )}

      {/* Delete Confirmation Modal */}
      <EnhancedModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setSportToDelete(null);
        }}
        title="Confirm Delete"
        subtitle="This action cannot be undone"
        size="sm"
        footer={
          <div className="flex flex-row space-x-3 sm:justify-end">
            <button
              onClick={() => {
                setShowDeleteConfirm(false);
                setSportToDelete(null);
              }}
              disabled={deleteSportMutation.isPending}
              className="flex-1 sm:flex-initial sm:px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium py-2 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              disabled={deleteSportMutation.isPending}
              className="flex-1 sm:flex-initial sm:px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium py-2 text-sm"
            >
              {deleteSportMutation.isPending ? 'Deleting...' : 'Delete Sport'}
            </button>
          </div>
        }
      >
        <div className="text-center py-4">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <p className="text-gray-600 mb-4">
            Are you sure you want to delete <strong>"{sportToDelete?.name}"</strong>?
          </p>
          <p className="text-sm text-red-600">
            This action cannot be undone and will remove all associated data.
          </p>
        </div>
      </EnhancedModal>

    </div>
  );
}