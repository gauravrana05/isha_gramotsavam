"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getAdminUsers } from '@/lib/actions/admin/optimizedUserQueries';
import { addVolunteer } from '@/lib/actions/admin/volunteerManagement';
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
  PageLoader,
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

interface AddVolunteerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function AddVolunteerModal({ isOpen, onClose, onSuccess }: AddVolunteerModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sameAsWhatsapp, setSameAsWhatsapp] = useState(true);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const formData = new FormData(e.currentTarget);
      formData.set('sameAsWhatsapp', sameAsWhatsapp.toString());
      
      // Set role based on verification checkbox
      const isVerificationVolunteer = formData.get('isVerificationVolunteer') === 'on';
      formData.set('role', isVerificationVolunteer ? 'verification_volunteer' : 'general_volunteer');
      
      const result = await addVolunteer(formData);
      
      if (result.success) {
        onSuccess();
        onClose();
        e.currentTarget.reset();
        setSameAsWhatsapp(true);
      } else {
        setError(result.error || 'Failed to add volunteer');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add volunteer');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">Add New Volunteer</h3>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">Personal Information</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">First Name *</label>
                <input 
                  name="firstName" 
                  required 
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F28C38] focus:border-[#F28C38]"
                  placeholder="Enter first name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Last Name *</label>
                <input 
                  name="lastName" 
                  required 
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F28C38] focus:border-[#F28C38]"
                  placeholder="Enter last name"
                />
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">Gender *</label>
              <select 
                name="gender" 
                required 
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F28C38] focus:border-[#F28C38]"
              >
                <option value="">Select Gender</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="O">Other</option>
              </select>
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">Contact Information</h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Phone Number *</label>
                <input 
                  name="phoneNumber" 
                  type="tel"
                  required 
                  pattern="[+]?[0-9\s\-\(\)]*"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F28C38] focus:border-[#F28C38]"
                  placeholder="+91 9876543210"
                />
              </div>
              
              <div>
                <div className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    id="sameAsWhatsapp"
                    checked={sameAsWhatsapp}
                    onChange={(e) => setSameAsWhatsapp(e.target.checked)}
                    className="h-4 w-4 text-[#F28C38] focus:ring-[#F28C38] border-gray-300 rounded"
                  />
                  <label htmlFor="sameAsWhatsapp" className="ml-2 block text-sm text-gray-700">
                    WhatsApp number is same as phone number
                  </label>
                </div>
                
                {!sameAsWhatsapp && (
                  <input
                    name="whatsappNumber"
                    type="tel"
                    required={!sameAsWhatsapp}
                    pattern="[+]?[0-9\s\-\(\)]*"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F28C38] focus:border-[#F28C38]"
                    placeholder="+91 9876543210"
                  />
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Email Address *</label>
                <input 
                  name="email" 
                  type="email"
                  required 
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F28C38] focus:border-[#F28C38]"
                  placeholder="volunteer@example.com"
                />
              </div>
            </div>
          </div>
          
          {/* Volunteer Type */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">Volunteer Type</h4>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isVerificationVolunteer"
                name="isVerificationVolunteer"
                className="h-4 w-4 text-[#F28C38] focus:ring-[#F28C38] border-gray-300 rounded"
              />
              <label htmlFor="isVerificationVolunteer" className="ml-2 block text-sm text-gray-700">
                Verification Volunteer
              </label>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              If checked, volunteer will handle document verification and player eligibility. If not checked, volunteer will be assigned as General Volunteer (can be changed to Technical during venue assignment).
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 text-white bg-[#F28C38] border border-transparent rounded-lg hover:bg-[#E67A26] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F28C38] disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Volunteer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function VolunteersManagement() {
  const router = useRouter();
  const { lang } = useParams();
  const { user, userProfile, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [volunteers, setVolunteers] = useState<AdminVolunteerRow[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

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
    return <PageLoader title="Loading volunteers..." variant="minimal" />;
  }

  if (error) {
    return (
      <div className="lg:min-h-screen bg-gray-50 flex items-center justify-center">
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
            <button className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-600">
              <MapPin className="w-4 h-4 mr-2" />
              Assign Venues
            </button>
          </Link>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Volunteer
          </button>
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
      
      {/* Add Volunteer Modal */}
      <AddVolunteerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={loadVolunteers}
      />
    </div>
  );
}