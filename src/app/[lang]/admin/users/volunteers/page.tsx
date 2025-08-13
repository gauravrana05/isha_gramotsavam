"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getAdminUsers } from '@/lib/actions/admin/optimizedUserQueries';
import {
  Plus, 
  UserCheck,
  MapPin,
  Users,
  Calendar,
  CheckCircle,
  Clock,
  Edit,
  Eye,
  Phone,
  Mail,
  Shield,
  XCircle,
  Loader2
} from 'lucide-react';
import {
  AdvancedTable,
  StatsCard,
  type Column,
  type ActionButton,
  type FilterField,
  type ExportConfig
} from '@/components/ui';
import Link from 'next/link';

type VolunteerRole = 'verification_volunteer' | 'general_volunteer' | 'technical_volunteer';

interface AdminVolunteerRow {
  id: string;
  uid: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string;
  role: VolunteerRole;
  gender: 'M' | 'F' | 'O';
  panchayat?: string;
  district?: string;
  state?: string;
  isVerified: boolean;
  isProfileComplete: boolean;
  isActive?: boolean;
  createdAt: string | null;
}

export default function VolunteersManagement() {
  const router = useRouter();
  const { lang } = useParams();
  const { user, userProfile, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [volunteers, setVolunteers] = useState<AdminVolunteerRow[]>([]);
  const [total, setTotal] = useState<number>(0);

  // Load volunteers data with volunteer role filter
  const loadVolunteers = useCallback(async () => {
    try {
      setLoading(true);
      
      if (!user?.uid) {
        throw new Error('User not authenticated');
      }

      // Get volunteer users
      const result = await getAdminUsers(
        {
          limit: 100,
          offset: 0,
          role: 'volunteer', // Get all volunteer types
          gender: 'all',
          district: undefined,
          isVerified: 'all',
          isProfileComplete: 'all',
          searchQuery: undefined,
          sortBy: 'createdAt' as any,
          sortOrder: 'desc'
        },
        user.uid
      );

      if (!result.success) {
        setError(result.error || 'Failed to load volunteers');
        setVolunteers([]);
        setTotal(0);
        return;
      }

      // Map volunteer users
      const volunteerUsers = (result.users || []).map(user => ({
        ...user,
        role: user.role as VolunteerRole,
        isActive: user.isVerified && user.isProfileComplete
      }));

      setError('');
      setVolunteers(volunteerUsers);
      setTotal(volunteerUsers.length);
    } catch (e: any) {
      setError(e?.message || 'Failed to load volunteers');
      setVolunteers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  // Auth gate and data loading
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
    
    loadVolunteers();
  }, [user, userProfile, authLoading, lang, router, loadVolunteers]);

  // Client-side filtering handled by AdvancedTable
  const filteredVolunteers = volunteers;

  const columns: Column<AdminVolunteerRow>[] = useMemo(() => [
    {
      key: 'name',
      header: 'Volunteer',
      accessor: (v) => `${v.firstName} ${v.lastName}`.trim(),
      sortable: true,
      sortKey: 'firstName',
      minWidth: 220,
      render: (_, v) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{v.firstName} {v.lastName}</div>
          <div className="mt-1 inline-flex items-center gap-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              v.role === 'technical_volunteer' ? 'bg-purple-100 text-purple-800' :
              v.role === 'general_volunteer' ? 'bg-blue-100 text-blue-800' :
              v.role === 'verification_volunteer' ? 'bg-green-100 text-green-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {v.role === 'technical_volunteer' && <Users className="w-3 h-3 mr-1" />}
              {v.role === 'general_volunteer' && <UserCheck className="w-3 h-3 mr-1" />}
              {v.role === 'verification_volunteer' && <Shield className="w-3 h-3 mr-1" />}
              {v.role.replace('_', ' ')}
            </span>
            <span className="text-[11px] text-gray-500">{v.gender}</span>
          </div>
        </div>
      )
    },
    {
      key: 'phone',
      header: 'Phone',
      accessor: 'phoneNumber',
      sortable: true,
      minWidth: 140,
      render: (phone, v) => (
        <div className="text-sm text-gray-900">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-gray-400" />
            <span>{v.phoneNumber}</span>
          </div>
        </div>
      )
    },
    {
      key: 'email',
      header: 'Email',
      accessor: 'email',
      sortable: true,
      minWidth: 180,
      render: (email, v) => (
        <div className="text-sm text-gray-900">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-gray-400" />
            <span>{v.email || '—'}</span>
          </div>
        </div>
      )
    }
  ], []);

  const actions: ActionButton<AdminVolunteerRow>[] = useMemo(() => [
    {
      label: 'View',
      icon: Eye,
      variant: 'primary',
      onClick: (v) => router.push(`/${lang}/admin/users/${v.id}`)
    },
    {
      label: 'Edit',
      icon: Edit,
      variant: 'secondary',
      onClick: (v) => router.push(`/${lang}/admin/users/${v.id}/edit`)
    }
  ], [router, lang]);

  const filterFields: FilterField[] = useMemo(() => [
    {
      key: 'role',
      label: 'Role',
      type: 'select',
      options: [
        { label: 'General Volunteer', value: 'general_volunteer' },
        { label: 'Technical Volunteer', value: 'technical_volunteer' },
        { label: 'Verification Volunteer', value: 'verification_volunteer' }
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
    }
  ], []);

  const exportOptions: ExportConfig[] = useMemo(() => [
    {
      label: 'Export CSV',
      format: 'csv',
      onExport: () => {
        const csv = [
          ['Name', 'Role', 'Phone', 'Email', 'Gender'].join(','),
          ...filteredVolunteers.map(v => [
            `${v.firstName} ${v.lastName}`.trim(),
            v.role.replace('_', ' '),
            v.phoneNumber,
            v.email || '',
            v.gender
          ].join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `volunteers_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    }
  ], [filteredVolunteers]);

  // Stats for StatsCard
  const statsData = useMemo(() => [
    {
      label: 'Total',
      value: volunteers.length,
      color: 'info' as const,
      icon: Users
    },
    {
      label: 'General',
      value: volunteers.filter(v => v.role === 'general_volunteer').length,
      color: 'secondary' as const,
      icon: UserCheck
    },
    {
      label: 'Technical',
      value: volunteers.filter(v => v.role === 'technical_volunteer').length,
      color: 'warning' as const,
      icon: Users
    },
    {
      label: 'Verification',
      value: volunteers.filter(v => v.role === 'verification_volunteer').length,
      color: 'success' as const,
      icon: Shield
    }
  ], [volunteers]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#F28C38]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <Users className="w-16 h-16 text-red-400 mx-auto mb-3" />
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Unable to load volunteers</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Volunteers Management</h1>
          <p className="text-gray-600 text-sm">View and manage volunteers, assignments, and coordination</p>
        </div>
        
        <div className="flex gap-3">
          <Link href={`/${lang}/admin/users/volunteers/assign-venues`}>
            <button className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F28C38]">
              <MapPin className="w-4 h-4 mr-2" />
              Assign Venues
            </button>
          </Link>
          <Link href={`/${lang}/admin/users/volunteers/add`}>
            <button className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#F28C38] border border-transparent rounded-lg hover:bg-[#E67A26] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F28C38]">
              <Plus className="w-4 h-4 mr-2" />
              Add Volunteer
            </button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      {statsData.length > 0 && (
        <div className="mb-8">
          <StatsCard 
            stats={statsData}
            columns={4}
            size="base"
            showBorder
          />
        </div>
      )}

      {/* Advanced Table */}
      <AdvancedTable<AdminVolunteerRow>
        data={filteredVolunteers}
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
        keyExtractor={(v) => v.id}
        stickyHeader={true}

        persistState={true}
        stateKey="admin-volunteers"

        emptyState={{
          icon: Users,
          title: 'No volunteers found',
          description: 'Try adjusting your search or filters'
        }}
      />
    </div>
  );
}