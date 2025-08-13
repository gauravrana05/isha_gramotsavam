"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getAdminUsers } from '@/lib/actions/admin/optimizedUserQueries';
import { getAdminVenues } from '@/lib/actions/admin/optimizedVenueQueries';
import { getVolunteerVenueAssignmentDetails } from '@/lib/actions/admin/volunteerManagement';
import { assignVolunteerToVenue, removeVolunteerAssignment } from '@/lib/actions/admin/volunteerAssignment';
import {
  Plus, 
  UserCheck,
  MapPin,
  Users,
  Shield,
  Trash2,
  Loader2
} from 'lucide-react';
import {
  AdvancedTable,
  type Column,
  type ActionButton,
  type FilterField,
  type ExportConfig
} from '@/components/ui';

interface AssignmentRow {
  id: string;
  assignmentId: string;
  volunteerName: string;
  volunteerType: string;
  volunteerRole: 'verification_volunteer' | 'general_volunteer' | 'technical_volunteer';
  venueName: string;
  venueId: string;
  status: 'assigned' | 'confirmed' | 'active';
  assignedAt: string | null;
}

interface AssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function AssignmentModal({ isOpen, onClose, onSuccess }: AssignmentModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [venues, setVenues] = useState<any[]>([]);

  // Load data when modal opens
  useEffect(() => {
    if (isOpen && user?.uid) {
      loadModalData();
    }
  }, [isOpen, user?.uid]);

  const loadModalData = async () => {
    try {
      if (!user?.uid) return;
      
      // Get volunteers
      const volunteersResult = await getAdminUsers({
        limit: 100,
        offset: 0,
        role: 'volunteer',
        gender: 'all',
        district: undefined,
        isVerified: 'all',
        isProfileComplete: 'all',
        searchQuery: undefined,
        sortBy: 'firstName',
        sortOrder: 'asc'
      }, user.uid);

      if (volunteersResult.success) {
        setVolunteers(volunteersResult.users || []);
      }

      // Get venues
      const venuesResult = await getAdminVenues({
        limit: 50,
        offset: 0,
        level: 'all',
        venueType: 'all',
        genderCategory: 'all',
        assignmentStatus: 'all',
        district: undefined,
        taluk: undefined,
        state: undefined,
        isActive: true,
        searchQuery: undefined,
        sortBy: 'name',
        sortOrder: 'asc'
      }, user.uid);

      if (venuesResult.success) {
        setVenues(venuesResult.venues || []);
      }
    } catch (error) {
      console.error('Error loading modal data:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const formData = new FormData(e.currentTarget);
      
      // Add selected volunteer name
      const volunteerId = formData.get('volunteerId') as string;
      const selectedVolunteer = volunteers.find(v => v.id === volunteerId);
      if (selectedVolunteer) {
        formData.set('volunteerName', `${selectedVolunteer.firstName} ${selectedVolunteer.lastName}`);
      }

      // Add venue name
      const venueId = formData.get('venueId') as string;
      const selectedVenue = venues.find(v => v.id === venueId);
      if (selectedVenue) {
        formData.set('venueName', selectedVenue.name);
      }

      // Add required fields
      formData.set('eventId', 'isha_gramotsavam_2025');
      formData.set('assignedBy', user?.uid || 'admin');

      const result = await assignVolunteerToVenue(formData);
      
      if (result.success) {
        onSuccess();
        onClose();
        e.currentTarget.reset();
      } else {
        setError(result.error || 'Failed to assign volunteer');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to assign volunteer');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
        <h3 className="text-lg font-semibold mb-4">Assign Volunteer to Venue</h3>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Volunteer</label>
            <select 
              name="volunteerId" 
              required 
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F28C38] focus:border-[#F28C38]"
            >
              <option value="">Select Volunteer</option>
              {volunteers.map(volunteer => (
                <option key={volunteer.id} value={volunteer.id}>
                  {volunteer.firstName} {volunteer.lastName}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Venue</label>
            <select 
              name="venueId" 
              required 
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F28C38] focus:border-[#F28C38]"
            >
              <option value="">Select Venue</option>
              {venues.map(venue => (
                <option key={venue.id} value={venue.id}>
                  {venue.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Volunteer Type</label>
            <select 
              name="volunteerType" 
              required 
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F28C38] focus:border-[#F28C38]"
            >
              <option value="general">General</option>
              <option value="technical">Technical</option>
            </select>
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
              {loading ? 'Assigning...' : 'Assign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function VolunteerVenueAssignmentPage() {
  const router = useRouter();
  const { lang } = useParams();
  const { user, userProfile, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Load assignments data
  const loadAssignments = useCallback(async () => {
    try {
      setLoading(true);
      
      if (!user?.uid) {
        throw new Error('User not authenticated');
      }

      const result = await getVolunteerVenueAssignmentDetails(user.uid);
      
      if (!result.success) {
        setError(result.error || 'Failed to load assignments');
        setAssignments([]);
        setTotal(0);
        return;
      }

      // Transform assignments data for table
      const assignmentRows: AssignmentRow[] = (result.assignments || []).map(assignment => ({
        id: assignment.id,
        assignmentId: assignment.assignmentId,
        volunteerName: assignment.volunteerName,
        volunteerType: assignment.volunteerType,
        volunteerRole: assignment.volunteerType === 'technical' ? 'technical_volunteer' : 'general_volunteer',
        venueName: assignment.venueName,
        venueId: assignment.venueId,
        status: assignment.status,
        assignedAt: assignment.assignedAt
      }));

      setError('');
      setAssignments(assignmentRows);
      setTotal(assignmentRows.length);
    } catch (e: any) {
      setError(e?.message || 'Failed to load assignments');
      setAssignments([]);
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
    
    loadAssignments();
  }, [user, userProfile, authLoading, lang, router, loadAssignments]);

  // Client-side filtering handled by AdvancedTable
  const filteredAssignments = assignments;

  const columns: Column<AssignmentRow>[] = useMemo(() => [
    {
      key: 'volunteer',
      header: 'Volunteer',
      accessor: 'volunteerName',
      sortable: true,
      minWidth: 200,
      render: (_, a) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{a.volunteerName}</div>
          <div className="mt-1 inline-flex items-center gap-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              a.volunteerRole === 'technical_volunteer' ? 'bg-purple-100 text-purple-800' :
              a.volunteerRole === 'general_volunteer' ? 'bg-blue-100 text-blue-800' :
              a.volunteerRole === 'verification_volunteer' ? 'bg-green-100 text-green-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {a.volunteerRole === 'technical_volunteer' && <Users className="w-3 h-3 mr-1" />}
              {a.volunteerRole === 'general_volunteer' && <UserCheck className="w-3 h-3 mr-1" />}
              {a.volunteerRole === 'verification_volunteer' && <Shield className="w-3 h-3 mr-1" />}
              {a.volunteerRole.replace('_', ' ')}
            </span>
          </div>
        </div>
      )
    },
    {
      key: 'venue',
      header: 'Venue',
      accessor: 'venueName',
      sortable: true,
      minWidth: 180,
      render: (_, a) => (
        <div className="text-sm text-gray-900">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span>{a.venueName}</span>
          </div>
        </div>
      )
    },
    {
      key: 'type',
      header: 'Type',
      accessor: 'volunteerType',
      sortable: true,
      minWidth: 100,
      render: (_, a) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
          a.volunteerType === 'technical' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
        }`}>
          {a.volunteerType}
        </span>
      )
    },
    {
      key: 'assignedAt',
      header: 'Assigned',
      accessor: 'assignedAt',
      sortable: true,
      minWidth: 120,
      render: (val) => (
        <span className="text-sm text-gray-700">
          {val ? new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
        </span>
      )
    }
  ], []);

  const actions: ActionButton<AssignmentRow>[] = useMemo(() => [
    {
      label: 'Remove',
      icon: Trash2,
      variant: 'danger',
      onClick: async (assignment) => {
        if (confirm('Are you sure you want to remove this assignment?')) {
          try {
            const result = await removeVolunteerAssignment(assignment.assignmentId);
            if (result.success) {
              loadAssignments(); // Reload data
            }
          } catch (error) {
            console.error('Failed to remove assignment:', error);
          }
        }
      }
    }
  ], [loadAssignments]);

  const filterFields: FilterField[] = useMemo(() => [
    {
      key: 'volunteerType',
      label: 'Type',
      type: 'select',
      options: [
        { label: 'General', value: 'general' },
        { label: 'Technical', value: 'technical' }
      ]
    }
  ], []);

  const exportOptions: ExportConfig[] = useMemo(() => [
    {
      label: 'Export CSV',
      format: 'csv',
      onExport: () => {
        const csv = [
          ['Volunteer', 'Venue', 'Type', 'Assigned Date'].join(','),
          ...filteredAssignments.map(a => [
            a.volunteerName,
            a.venueName,
            a.volunteerType,
            a.assignedAt ? new Date(a.assignedAt).toISOString().slice(0, 10) : ''
          ].join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const el = document.createElement('a');
        el.href = url;
        el.download = `volunteer_assignments_${new Date().toISOString().split('T')[0]}.csv`;
        el.click();
        window.URL.revokeObjectURL(url);
      }
    }
  ], [filteredAssignments]);

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
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Unable to load assignments</h1>
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
          <h1 className="text-2xl font-bold text-gray-900">Volunteer Venue Assignment</h1>
          <p className="text-gray-600 text-sm">Assign volunteers to venues for tournament management</p>
        </div>
        
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#F28C38] border border-transparent rounded-lg hover:bg-[#E67A26] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F28C38]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Assign Volunteer
        </button>
      </div>

      {/* Advanced Table */}
      <AdvancedTable<AssignmentRow>
        data={filteredAssignments}
        columns={columns}
        actions={actions}
        loading={loading}

        searchable={true}
        searchPlaceholder="Search by volunteer name or venue..."

        filterable={true}
        filters={filterFields}

        sortable={true}
        multiSort={true}
        defaultSort={[{ key: 'assignedAt', direction: 'desc' }]}

        pagination={{ enabled: false }}

        exportOptions={exportOptions}

        selectable={false}
        keyExtractor={(a) => a.id}
        stickyHeader={true}

        persistState={true}
        stateKey="admin-volunteer-assignments"

        emptyState={{
          icon: Users,
          title: 'No assignments found',
          description: 'Assign volunteers to venues to get started'
        }}
      />

      {/* Assignment Modal */}
      <AssignmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadAssignments}
      />
    </div>
  );
}
