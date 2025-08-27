"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/server/trpc/react';
import {
  Users,
  Eye,
  Mail,
  Phone,
  Loader2
} from 'lucide-react';
import {
  AdvancedTable,
  PageLoader,
  type Column,
  type ActionButton,
  type FilterField,
  type ExportConfig,
  type TableParams
} from '@/components/ui';

type UserRole =
  | 'admin'
  | 'captain'
  | 'player'
  | 'general_volunteer'
  | 'technical_volunteer'
  | 'verification_volunteer';

interface AdminUserRow {
  id: string;
  uid: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string;
  role: UserRole;
  gender: 'M' | 'F' | 'O';
  panchayat?: string;
  district?: string;
  state?: string;
  isVerified: boolean;
  isProfileComplete: boolean;
  createdAt: string | null;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { lang } = useParams();
  const { user, userProfile, loading: authLoading } = useAuth();

  // tRPC query for users
  const {
    data: usersData,
    isLoading: usersLoading,
    error: usersError
  } = api.admin.getUsers.useQuery({
    limit: 100,
    offset: 0,
    role: 'all',
    gender: 'all',
    isVerified: 'all',
    isProfileComplete: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  }, {
    enabled: !!user && userProfile?.role === 'admin'
  });

  // Auth gate
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

  const loading = usersLoading;
  const error = usersError?.message || '';
  const users = usersData?.users || [];
  const total = usersData?.pagination?.total || 0;

  const columns: Column<AdminUserRow>[] = useMemo(() => [
    {
      key: 'name',
      header: 'User',
      accessor: (u) => `${u.firstName} ${u.lastName}`.trim(),
      sortable: true,
      sortKey: 'firstName',
      minWidth: 200,
      render: (_, u) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{u.firstName} {u.lastName}</div>
          <div className="mt-1 inline-flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-800 capitalize">
              {u.role.replace('_', ' ')}
            </span>
            <span className="text-[11px] text-gray-500">{u.gender}</span>
          </div>
        </div>
      )
    },
    {
      key: 'contact',
      header: 'Contact',
      accessor: 'phoneNumber',
      minWidth: 180,
      render: (phone, u) => (
        <div className="text-sm text-gray-900">
          <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" />{u.phoneNumber}</div>
          {u.email && (
            <div className="flex items-center gap-2 text-gray-600 mt-1"><Mail className="w-4 h-4 text-gray-400" />{u.email}</div>
          )}
        </div>
      )
    },
    {
      key: 'location',
      header: 'Location',
      accessor: 'panchayat',
      minWidth: 160,
      render: (_, u) => (
        <div className="text-sm text-gray-900">
          <div>{u.panchayat || '—'}</div>
          <div className="text-xs text-gray-500">{u.district || '—'}</div>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      accessor: 'isVerified',
      sortable: true,
      minWidth: 150,
      render: (isVerified, u) => (
        <span className={`px-2 py-0.5 rounded-full text-xs ${u.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
          {u.isVerified ? 'Verified' : 'Pending'}
        </span>
      )
    },
    {
      key: 'createdAt',
      header: 'Created',
      accessor: 'createdAt',
      sortable: true,
      minWidth: 130,
      render: (val) => (
        <span className="text-sm text-gray-700">{val ? new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</span>
      )
    }
  ], []);

  const actions: ActionButton<AdminUserRow>[] = useMemo(() => [
    {
      label: 'View',
      icon: Eye,
      variant: 'primary',
      onClick: (u) => router.push(`/${lang}/admin/users/${u.id}`)
    }
  ], [router, lang]);

  // Filters sidebar: reuse existing idea (verification, gender, district) + role
  const filterFields: FilterField[] = useMemo(() => [
    {
      key: 'verification',
      label: 'Verification',
      type: 'select',
      options: [
        { label: 'Verified', value: 'verified' },
        { label: 'Pending', value: 'pending' }
      ]
    },
    {
      key: 'gender',
      label: 'Gender',
      type: 'select',
      options: [
        { label: 'Male', value: 'M' },
        { label: 'Female', value: 'F' },
        { label: 'Other', value: 'O' }
      ]
    },
    {
      key: 'district',
      label: 'District',
      type: 'text',
      placeholder: 'Type district',
      caseSensitive: false
    },
    {
      key: 'role',
      label: 'Role',
      type: 'select',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Captain', value: 'captain' },
        { label: 'Player', value: 'player' },
        { label: 'General Volunteer', value: 'general_volunteer' },
        { label: 'Technical Volunteer', value: 'technical_volunteer' },
        { label: 'Verification Volunteer', value: 'verification_volunteer' }
      ]
    }
  ], []);

  const exportOptions: ExportConfig[] = useMemo(() => [
    {
      label: 'Export CSV',
      format: 'csv',
      onExport: () => {
        const csv = [
          ['Name', 'Phone', 'Email', 'Role', 'Gender', 'Panchayat', 'District', 'Verified', 'Profile Complete', 'Created'].join(','),
          ...users.map(u => [
            `${u.firstName} ${u.lastName}`.trim(),
            u.phoneNumber,
            u.email || '',
            u.role,
            u.gender,
            u.panchayat || '',
            u.district || '',
            u.isVerified ? 'Yes' : 'No',
            u.isProfileComplete ? 'Yes' : 'No',
            u.createdAt ? new Date(u.createdAt).toISOString().slice(0, 10) : ''
          ].join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    }
  ], [users]);

  if (authLoading || loading) {
    return <PageLoader title="Loading users..." variant="minimal" />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <Users className="w-16 h-16 text-red-400 mx-auto mb-3" />
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Unable to load users</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Users Management</h1>
        <p className="text-gray-600 text-sm">View and manage all users (admins, volunteers, captains, players)</p>
      </div>

      <AdvancedTable<AdminUserRow>
        data={users}
        columns={columns}
        actions={actions}
        loading={loading}

        searchable={true}
        searchPlaceholder="Search by name, phone, email..."

        filterable={true}
        filters={filterFields}

        sortable={true}
        multiSort={true}
        defaultSort={[{ key: 'createdAt', direction: 'desc' }]}

        pagination={{ enabled: false }}

        exportOptions={exportOptions}

        selectable={false}
        keyExtractor={(u) => u.id}
        stickyHeader={true}

        persistState={true}
        stateKey="admin-users"

        emptyState={{
          icon: Users,
          title: 'No users found',
          description: 'Try adjusting your search or filters'
        }}
      />
    </div>
  );
}