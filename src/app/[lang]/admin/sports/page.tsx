'use client';

import { useState, useMemo, useCallback } from 'react';

import { Plus, Edit, Trash2, Search, Users, Calendar } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { api } from '@/server/trpc/react';
import { AdvancedTable, Column, FilterField, TableParams } from '@/components/ui/AdvancedTable';
import { EnhancedModal } from '@/components/ui/EnhancedModal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Checkbox } from '@/components/ui/Checkbox';
import { Label } from '@/components/ui/Label';
import { useNotification } from '@/context/NotificationContext';
import { Sport } from '@prisma/client'; // Assuming Sport type is available from Prisma client
import { SportForm, SportFormValues } from '@/components/admin/SportForm';

// Define the schema for the Sport form
const sportFormSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Sport name is required'),
  description: z.string().optional(),
  mainPlayersCount: z.number().int().min(1, 'Must have at least 1 main player').max(50, 'Too many players'),
  maxSubstitutes: z.number().int().min(0).max(20, 'Too many substitutes').default(0),
  isActive: z.boolean().default(true),
  genderCategories: z.array(z.enum(['men', 'women', 'mixed'])).min(1, 'At least one gender category required'),
});



export default function AdminSportsPage() {
  const { addNotification } = useNotification();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedSport, setSelectedSport] = useState<Sport | null>(null);
  const [tableParams, setTableParams] = useState<TableParams>({
    search: '',
    sort: [],
    filters: [],
    page: 1,
    pageSize: 25,
  });

  const {
    data: sportsData,
    isLoading: isLoadingSports,
    refetch: refetchSports,
  } = api.admin.getSports.useQuery(
    {
      limit: tableParams.pageSize,
      offset: (tableParams.page - 1) * tableParams.pageSize,
      // Add filters and search to the query if needed
      // For now, getSports doesn't support search/filters directly, but we can add it later if required
    },
    {
      keepPreviousData: true,
    }
  );

  const createSportMutation = api.admin.createSport.useMutation({
    onSuccess: () => {
      addNotification('Sport created successfully!', 'success');
      refetchSports();
      setIsModalOpen(false);
      reset();
    },
    onError: (error) => {
      addNotification(t('createError', { message: error.message }), 'error');
    },
  });

  const updateSportMutation = api.admin.updateSport.useMutation({
    onSuccess: () => {
      addNotification(t('updateSuccess'), 'success');
      refetchSports();
      setIsModalOpen(false);
      setSelectedSport(null);
      reset();
    },
    onError: (error) => {
      addNotification(t('updateError', { message: error.message }), 'error');
    },
  });

  const deleteSportMutation = api.admin.deleteSport.useMutation({
    onSuccess: () => {
      addNotification(t('deleteSuccess'), 'success');
      refetchSports();
      setIsDeleteModalOpen(false);
      setSelectedSport(null);
    },
    onError: (error) => {
      addNotification(t('deleteError', { message: error.message }), 'error');
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    watch,
  } = useForm<SportFormValues>({
    resolver: zodResolver(sportFormSchema),
    defaultValues: {
      name: '',
      description: '',
      mainPlayersCount: 1,
      maxSubstitutes: 0,
      isActive: true,
      genderCategories: ['men', 'women'],
    },
  });

  const genderCategoriesWatch = watch('genderCategories');

  const handleOpenCreateModal = () => {
    setSelectedSport(null);
    reset();
    setValue('genderCategories', ['men', 'women']); // Default for new sport
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (sport: Sport) => {
    setSelectedSport(sport);
    reset({
      id: sport.id,
      name: sport.name,
      description: sport.description || '',
      mainPlayersCount: sport.mainPlayersCount,
      maxSubstitutes: sport.maxSubstitutes,
      isActive: sport.isActive,
      // Assuming sportGenderCategories is available on the Sport object from the API
      // If not, you might need to fetch it separately or adjust the API response
      genderCategories: (sport as any).genderCategories || ['men', 'women'],
    });
    setIsModalOpen(true);
  };

  const handleOpenDeleteModal = (sport: Sport) => {
    setSelectedSport(sport);
    setIsDeleteModalOpen(true);
  };

  const onSubmit = async (data: SportFormValues) => {
    if (selectedSport) {
      await updateSportMutation.mutateAsync({
        id: selectedSport.id,
        ...data,
      });
    } else {
      await createSportMutation.mutateAsync(data);
    }
  };

  const confirmDelete = async () => {
    if (selectedSport) {
      await deleteSportMutation.mutateAsync({ id: selectedSport.id });
    }
  };

  const columns = useMemo<Column<Sport>[]>(
    () => [
      {
        key: 'name',
        header: 'Name',
        sortable: true,
        accessor: 'name',
      },
      {
        key: 'description',
        header: 'Description',
        accessor: 'description',
        render: (value) => value || 'N/A',
      },
      {
        key: 'mainPlayersCount',
        header: 'Main Players',
        sortable: true,
        accessor: 'mainPlayersCount',
      },
      {
        key: 'maxSubstitutes',
        header: 'Max Substitutes',
        sortable: true,
        accessor: 'maxSubstitutes',
      },
      {
        key: 'isActive',
        header: 'Active',
        sortable: true,
        accessor: 'isActive',
        render: (value) => (value ? 'Yes' : 'No'),
      },
      {
        key: 'genderCategories',
        header: 'Gender Categories',
        accessor: 'genderCategories',
        render: (value: string[]) => value?.join(', ') || 'N/A',
      },
      {
        key: 'actions',
        header: 'Actions',
        render: (_, sport) => (
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleOpenEditModal(sport)}
              aria-label="Edit"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleOpenDeleteModal(sport)}
              aria-label="Delete"
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  const filterFields = useMemo<FilterField[]>(
    () => [
      {
        key: 'isActive',
        label: t('filterIsActive'),
        type: 'select',
        category: commonT('status'),
        options: [
          { label: commonT('all'), value: 'all' },
          { label: commonT('yes'), value: 'true' },
          { label: commonT('no'), value: 'false' },
        ],
      },
      {
        key: 'genderCategory',
        label: t('filterGenderCategory'),
        type: 'multi-select',
        category: commonT('details'),
        options: [
          { label: commonT('men'), value: 'men' },
          { label: commonT('women'), value: 'women' },
          { label: commonT('mixed'), value: 'mixed' },
        ],
      },
    ],
    [t, commonT]
  );

  const handleTableParamsChange = useCallback((newParams: TableParams) => {
    setTableParams(newParams);
    // If getSports supported search/filters, you would pass them here
    // refetchSports();
  }, []);

  const totalSports = sportsData?.sports?.length || 0; // getSports doesn't return total count, so using length for now

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <Button onClick={handleOpenCreateModal}>
          <Plus className="mr-2 h-4 w-4" />
          {t('addSport')}
        </Button>
      </div>

      <AdvancedTable
        data={sportsData?.sports || []}
        columns={columns}
        loading={isLoadingSports}
        searchable={true}
        searchPlaceholder={t('searchPlaceholder')}
        searchFields={['name', 'description']}
        filterable={true}
        filters={filterFields}
        sortable={true}
        pagination={{
          enabled: true,
          pageSize: tableParams.pageSize,
          pageSizeOptions: [10, 25, 50, 100],
          serverSide: false, // Set to true if getSports returns total count and handles pagination
          total: totalSports,
        }}
        onDataLoad={handleTableParamsChange}
        emptyState={{
          icon: Calendar, // Changed from Calendar to a more relevant icon if available, otherwise keep Calendar
          title: t('noSportsFound'),
          description: t('noSportsDescription'),
          action: {
            label: t('addSport'),
            onClick: handleOpenCreateModal,
          },
        }}
        persistState={true}
        stateKey="admin-sports-table"
      />

      {/* Create/Edit Sport Modal */}
      <EnhancedModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedSport ? t('editSport') : t('createSport')}
        subtitle={selectedSport ? t('editSportSubtitle') : t('createSportSubtitle')}
        size="lg"
        mobileFullScreen={true}
        scrollableBody={true}
        footer={
          <div className="flex flex-row space-x-3 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={createSportMutation.isLoading || updateSportMutation.isLoading}
            >
              {commonT('cancel')}
            </Button>
            <Button
              onClick={handleSubmit(onSubmit)}
              disabled={createSportMutation.isLoading || updateSportMutation.isLoading}
            >
              {createSportMutation.isLoading || updateSportMutation.isLoading
                ? commonT('saving')
                : selectedSport
                ? commonT('update')
                : commonT('create')}
            </Button>
          </div>
        }
      >
        <SportForm
          onSubmit={onSubmit}
          defaultValues={selectedSport ? {
            id: selectedSport.id,
            name: selectedSport.name,
            description: selectedSport.description || '',
            mainPlayersCount: selectedSport.mainPlayersCount,
            maxSubstitutes: selectedSport.maxSubstitutes,
            isActive: selectedSport.isActive,
            genderCategories: (selectedSport as any).genderCategories || ['men', 'women'],
          } : {
            name: '',
            description: '',
            mainPlayersCount: 1,
            maxSubstitutes: 0,
            isActive: true,
            genderCategories: ['men', 'women'],
          }}
          isLoading={createSportMutation.isLoading || updateSportMutation.isLoading}
        />
      </EnhancedModal>

      {/* Delete Confirmation Modal */}
      <EnhancedModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title={t('deleteSport')}
        subtitle={t('deleteSportSubtitle')}
        size="sm"
        footer={
          <div className="flex flex-row space-x-3 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={deleteSportMutation.isLoading}
            >
              {commonT('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteSportMutation.isLoading}
            >
              {deleteSportMutation.isLoading ? commonT('deleting') : commonT('delete')}
            </Button>
          </div>
        }
      >
        <div className="text-center py-4">
          <p className="text-gray-600 mb-4">
            {t('deleteConfirmation', { sportName: selectedSport?.name })}
          </p>
          <p className="text-sm text-red-600">{t('deleteWarning')}</p>
        </div>
      </EnhancedModal>
    </div>
  );
}
