"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { api } from '@/server/trpc/react';
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
  SingleStatCard,
  PageLoader,
  type Column,
  type ActionButton,
  type FilterField
} from '@/components/ui';
import { EnhancedModal } from '@/components/ui/EnhancedModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/AdvancedSelect';
import { cn } from '@/lib/component-patterns';
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
  venueAssignment?: string;
  isVerified: boolean;
  isProfileComplete: boolean;
  isActive?: boolean;
  createdAt: string | null;
}

interface AddVolunteerModalProps {
  isOpen: boolean;
  onClose: () => void;
  createMutation: any;
  updateMutation?: any;
  selectedEvent: string;
  editVolunteer?: AdminVolunteerRow | null;
}

function AddVolunteerModal({ isOpen, onClose, createMutation, updateMutation, selectedEvent, editVolunteer }: AddVolunteerModalProps) {
  const [sameAsWhatsapp, setSameAsWhatsapp] = useState(true);
  const [isVerificationVolunteer, setIsVerificationVolunteer] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<string>('none');
  const [volunteerRole, setVolunteerRole] = useState<'general_volunteer' | 'technical_volunteer'>('general_volunteer');

  const isEditing = !!editVolunteer;

  // Populate form data when editing
  useEffect(() => {
    if (editVolunteer && isOpen) {
      setIsVerificationVolunteer(editVolunteer.role === 'verification_volunteer');
      setSelectedVenue(editVolunteer.venueAssignmentId || 'none');
      setVolunteerRole(editVolunteer.role === 'technical_volunteer' ? 'technical_volunteer' : 'general_volunteer');
      setSameAsWhatsapp(true);
    } else if (!isOpen) {
      setIsVerificationVolunteer(false);
      setSelectedVenue('none');
      setVolunteerRole('general_volunteer');
      setSameAsWhatsapp(true);
    }
  }, [editVolunteer, isOpen]);

  // Fetch venue level mappings
  const {
    data: venueData,
    isLoading: venueLoading
  } = api.admin.venues.getVenueLevelMappings.useQuery({
    ...(selectedEvent && { eventId: selectedEvent }),
    level: 'all'
  }, {
    enabled: isOpen && !isVerificationVolunteer
  });

  // Format venue options for AdvancedSelect
  const venueOptions = useMemo(() => {
    if (!venueData) return [];
    
    // Handle both array response and object with venueLevelMappings property
    const mappings = Array.isArray(venueData) ? venueData : venueData.venueLevelMappings || [];
    
    return mappings.map((mapping: any) => ({
      value: mapping.id,
      label: `${mapping.venue?.name || 'Unknown Venue'} - ${mapping.level}`,
      description: `${mapping.venue?.district || ''}, ${mapping.venue?.taluk || ''}`.replace(/^, |, $/, ''),
      data: mapping
    }));
  }, [venueData]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const formData = new FormData(e.currentTarget);
      
      // Set role based on verification checkbox or selected role
      const role = isVerificationVolunteer 
        ? 'verification_volunteer' 
        : volunteerRole;
      
      const volunteerData = {
        firstName: formData.get('firstName') as string,
        lastName: formData.get('lastName') as string,
        phone: formData.get('phoneNumber') as string,
        email: formData.get('email') as string || undefined,
        gender: formData.get('gender') as 'M' | 'F' | 'O',
        role: role as 'general_volunteer' | 'verification_volunteer' | 'technical_volunteer',
        whatsappNumber: sameAsWhatsapp 
          ? formData.get('phoneNumber') as string 
          : formData.get('whatsappNumber') as string || undefined,
        venueAssignmentId: selectedVenue && selectedVenue !== 'none' ? selectedVenue : undefined,
      };

      if (isEditing && editVolunteer && updateMutation) {
        // Update existing volunteer
        await updateMutation.mutateAsync({
          id: editVolunteer.id,
          ...volunteerData
        });
      } else {
        // Create new volunteer
        await createMutation.mutateAsync(volunteerData);
      }
      
      // Reset form
      if (e.currentTarget) {
        e.currentTarget.reset();
      }
      setSameAsWhatsapp(true);
      setIsVerificationVolunteer(false);
      setSelectedVenue('none');
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  return (
    <EnhancedModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Volunteer" : "Add New Volunteer"}
      subtitle={isEditing ? "Update volunteer information and role assignment" : "Create a new volunteer account with role assignment"}
      size="lg"
      mobileFullScreen={true}
      scrollableBody={true}
      footer={
        <div className="flex flex-row space-x-3 sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={createMutation.isPending || (updateMutation?.isPending)}
            className="flex-1 sm:flex-initial sm:px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium py-2 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              const form = document.querySelector('#volunteer-form-element') as HTMLFormElement;
              if (form) {
                form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
              }
            }}
            disabled={createMutation.isPending || (updateMutation?.isPending)}
            className="flex-1 sm:flex-initial sm:px-4 bg-[#F28C38] text-white rounded-lg hover:bg-[#E67A26] transition-colors font-medium py-2 text-sm"
          >
            {(createMutation.isPending || updateMutation?.isPending) 
              ? (isEditing ? 'Updating...' : 'Adding...') 
              : (isEditing ? 'Update Volunteer' : 'Add Volunteer')}
          </button>
        </div>
      }
    >
      <div id="volunteer-form">
        <form onSubmit={handleSubmit} className="space-y-6" id="volunteer-form-element">
          {/* Personal Information */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">Personal Information</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
                <input 
                  name="firstName" 
                  required 
                  defaultValue={editVolunteer?.firstName || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter first name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
                <input 
                  name="lastName" 
                  required 
                  defaultValue={editVolunteer?.lastName || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter last name"
                />
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Gender *</label>
              <select 
                name="gender" 
                required 
                defaultValue={editVolunteer?.gender || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                <input 
                  name="phoneNumber" 
                  type="tel"
                  required 
                  pattern="[+]?[0-9\s\-\(\)]*"
                  defaultValue={editVolunteer?.phoneNumber || ''}
                  disabled={isEditing} // Don't allow phone number changes when editing
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="+91 9876543210"
                />
                {isEditing && (
                  <p className="mt-1 text-sm text-gray-500">Phone number cannot be changed</p>
                )}
              </div>
              
              <div>
                <div className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    id="sameAsWhatsapp"
                    checked={sameAsWhatsapp}
                    onChange={(e) => setSameAsWhatsapp(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="+91 9876543210"
                  />
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                <input 
                  name="email" 
                  type="email"
                  required 
                  defaultValue={editVolunteer?.email || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                checked={isVerificationVolunteer}
                onChange={(e) => setIsVerificationVolunteer(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isVerificationVolunteer" className="ml-2 block text-sm text-gray-700">
                Verification Volunteer
              </label>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              If checked, volunteer will handle document verification and player eligibility.
            </p>
          </div>

          {/* Venue Selection - Only show if not verification volunteer */}
          {!isVerificationVolunteer && (
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">Venue Assignment</h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Venue</label>
                  <select
                    name="venueAssignmentId"
                    value={selectedVenue}
                    onChange={(e) => setSelectedVenue(e.target.value)}
                    disabled={venueLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    defaultValue={editVolunteer?.venueAssignmentId || 'none'}
                  >
                    <option value="none">No venue assignment</option>
                    {venueOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-sm text-gray-500">
                    Volunteers can be assigned to venues later if not selected now.
                  </p>
                </div>

                {/* Role Selection - Only show if venue is selected */}
                {selectedVenue && selectedVenue !== 'none' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Volunteer Role</label>
                    <select
                      name="volunteerRole"
                      value={volunteerRole}
                      onChange={(e) => setVolunteerRole(e.target.value as 'general_volunteer' | 'technical_volunteer')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      defaultValue={editVolunteer?.role === 'technical_volunteer' ? 'technical_volunteer' : 'general_volunteer'}
                    >
                      <option value="general_volunteer">General Volunteer</option>
                      <option value="technical_volunteer">Technical Volunteer</option>
                    </select>
                    <p className="mt-1 text-sm text-gray-500">
                      Role determines the volunteer&apos;s responsibilities at the venue.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </form>
      </div>
    </EnhancedModal>
  );
}

export default function VolunteersManagement() {
  const router = useRouter();
  const { lang } = useParams();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { addNotification } = useNotification();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedVolunteers, setSelectedVolunteers] = useState<Set<string | number>>(new Set());
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedVolunteer, setSelectedVolunteer] = useState<AdminVolunteerRow | null>(null);
  const [showAssignVenueModal, setShowAssignVenueModal] = useState(false);
  const [selectedAssignmentVenue, setSelectedAssignmentVenue] = useState<string>('none');
  const [selectedAssignmentType, setSelectedAssignmentType] = useState<string>('');

  // State for event selection
  const [selectedEvent, setSelectedEvent] = useState<string>('');

  // Get events (ongoing = registration_open, registration_closed, active)
  const { data: eventsData, isLoading: eventsLoading } = api.admin.events.getEvents.useQuery({
    limit: 1,
    status: 'ongoing',
  });

  // Set default event (always use first ongoing event)
  useEffect(() => {
    console.log('Events data:', eventsData);
    if (eventsData?.events && eventsData.events.length > 0) {
      console.log('Setting selectedEvent to:', eventsData.events[0].id);
      setSelectedEvent(eventsData.events[0].id);
    } else {
      console.log('No events found or events data is empty');
    }
  }, [eventsData]);

  console.log('Volunteers page selectedEvent:', selectedEvent);

  // tRPC query for volunteers data
  const {
    data: usersData,
    isLoading: volunteersLoading,
    error: volunteersError,
    refetch: refetchVolunteers
  } = api.admin.users.getUsers.useQuery({
    limit: 100,
    offset: 0,
    role: 'volunteer', // Get all volunteer types
    gender: 'all',
    isVerified: 'all',
    isProfileComplete: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  }, {
    enabled: !!user && userProfile?.role === 'admin'
  });

  // Process volunteers data
  const volunteers = useMemo(() => {
    if (!usersData?.users) return [];
    
    return usersData.users.map(user => ({
      id: user.id || user.uid,
      uid: user.uid || user.id,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      phoneNumber: user.phone || user.phoneNumber || '',
      email: user.email,
      role: user.role as VolunteerRole,
      gender: user.gender as 'M' | 'F' | 'O',
      panchayat: user.panchayat,
      district: user.district,
      state: user.state,
      venueAssignment: user.venueAssignment || null,
      isVerified: true, // TODO: Fix verification mapping
      isProfileComplete: user.profileComplete || false,
      isActive: user.profileComplete || false,
      createdAt: user.createdAt
    }));
  }, [usersData?.users]);

  const loading = volunteersLoading || authLoading;
  const error = volunteersError?.message || '';

  // tRPC mutation for creating volunteers
  const createVolunteerMutation = api.admin.users.createUser.useMutation({
    onSuccess: (data) => {
      refetchVolunteers();
      addNotification('Volunteer created successfully!', 'success');
      setIsAddModalOpen(false);
    },
    onError: (error) => {
      console.error('Create volunteer error:', error);
      addNotification(error.message || 'Failed to create volunteer. Please try again.', 'error');
    },
  });

  // tRPC mutation for updating volunteers
  const updateVolunteerMutation = api.admin.users.updateUser.useMutation({
    onSuccess: (data) => {
      refetchVolunteers();
      addNotification('Volunteer updated successfully!', 'success');
      setIsAddModalOpen(false);
      setSelectedVolunteer(null);
    },
    onError: (error) => {
      console.error('Update volunteer error:', error);
      addNotification(error.message || 'Failed to update volunteer. Please try again.', 'error');
    },
  });

  // tRPC mutation for assigning volunteers to venue
  const assignVolunteersMutation = api.admin.venueAssignment.assignVolunteersToVenue.useMutation({
    onSuccess: (data) => {
      refetchVolunteers();
      addNotification(data.message, 'success');
      setShowAssignVenueModal(false);
      setSelectedAssignmentVenue('none');
      setSelectedAssignmentType('');
      setSelectedVolunteers(new Set());
    },
    onError: (error) => {
      console.error('Assign volunteers error:', error);
      addNotification(error.message || 'Failed to assign volunteers to venue', 'error');
    }
  });

  // Patch existing venue and role when modal opens
  useEffect(() => {
    if (showAssignVenueModal && selectedVolunteers.size > 0) {
      // Get the first selected volunteer to check for existing assignment
      const firstVolunteerId = Array.from(selectedVolunteers)[0];
      const firstVolunteer = volunteers.find(v => v.id === firstVolunteerId);
      
      console.log('🔍 Patching venue modal:', {
        firstVolunteerId,
        firstVolunteer: firstVolunteer ? {
          name: `${firstVolunteer.firstName} ${firstVolunteer.lastName}`,
          role: firstVolunteer.role,
          venueAssignmentId: firstVolunteer.venueAssignmentId
        } : null
      });
      
      // Set role based on volunteer's current role
      if (firstVolunteer?.role === 'technical_volunteer') {
        console.log('✅ Setting role to technical');
        setSelectedAssignmentType('technical');
      } else if (firstVolunteer?.role === 'general_volunteer') {
        console.log('✅ Setting role to general');
        setSelectedAssignmentType('general');
      } else {
        console.log('❌ No specific role, resetting');
        setSelectedAssignmentType('');
      }
      
      // For now, keep venue as none since we don't have venue ID in volunteer data
      // TODO: Include venue assignment ID in volunteer query response
      setSelectedAssignmentVenue('none');
    }
  }, [showAssignVenueModal, selectedVolunteers, volunteers]);

  // Fetch venue level mappings for assignment modal
  const {
    data: assignmentVenueData,
    isLoading: assignmentVenueLoading
  } = api.admin.venues.getVenueLevelMappings.useQuery({
    ...(selectedEvent && { eventId: selectedEvent }),
    level: 'all'
  }, {
    enabled: showAssignVenueModal
  });

  // Format assignment venue options for Select
  const assignmentVenueOptions = useMemo(() => {
    if (!assignmentVenueData) return [];
    
    // Handle both array response and object with venueLevelMappings property
    const mappings = Array.isArray(assignmentVenueData) ? assignmentVenueData : assignmentVenueData.venueLevelMappings || [];
    
    return mappings.map((mapping: any) => ({
      value: mapping.id,
      label: `${mapping.venue?.name || 'Unknown Venue'} - ${mapping.level}`,
      description: `${mapping.venue?.district || ''}, ${mapping.venue?.taluk || ''}`.replace(/^, |, $/, ''),
      data: mapping
    }));
  }, [assignmentVenueData]);

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
    },
    {
      key: 'venue',
      header: 'Venue',
      accessor: 'venueAssignment',
      sortable: true,
      minWidth: 150,
      render: (venue, v) => (
        <div className="text-sm text-gray-900">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span>{v.venueAssignment || '—'}</span>
          </div>
        </div>
      )
    }
  ], []);

  // Header actions for different selection states
  const getHeaderActions = () => (
    <button 
      onClick={() => setIsAddModalOpen(true)}
      className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#F28C38] border border-transparent rounded-lg hover:bg-[#E67A26] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
    >
      <Plus className="w-4 h-4 mr-2" />
      Add Volunteer
    </button>
  );

  const getHeaderActionsSingle = (selectedItems: AdminVolunteerRow[]) => (
    <button 
      onClick={() => setShowAssignVenueModal(true)}
      className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
    >
      <MapPin className="w-4 h-4 mr-2" />
      Assign Venue
    </button>
  );

  const handleRowClick = (volunteer: AdminVolunteerRow) => {
    setSelectedVolunteer(volunteer);
    setShowViewModal(true);
  };

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


  // Stats for SingleStatCard
  const statsData = useMemo(() => [
    {
      label: 'Total Volunteers',
      value: volunteers.length,
      icon: Users,
      color: 'info' as const
    },
    {
      label: 'General',
      value: volunteers.filter(v => v.role === 'general_volunteer').length,
      icon: UserCheck,
      color: 'success' as const
    },
    {
      label: 'Technical',
      value: volunteers.filter(v => v.role === 'technical_volunteer').length,
      icon: Users,
      color: 'warning' as const
    },
    {
      label: 'Verification',
      value: volunteers.filter(v => v.role === 'verification_volunteer').length,
      icon: Shield,
      color: 'primary' as const
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
      {/* Advanced Table */}
      <AdvancedTable<AdminVolunteerRow>
        data={volunteers}
        columns={columns}
        loading={loading}

        searchable={true}
        searchPlaceholder="Search by name, phone, email..."

        filterable={true}
        filters={filterFields}

        sortable={true}
        multiSort={false}
        defaultSort={[{ key: 'createdAt', direction: 'desc' }]}

        pagination={{ enabled: true }}

        selectable={true}
        selectedRows={selectedVolunteers}
        onSelectionChange={setSelectedVolunteers}
        onRowClick={handleRowClick}
        keyExtractor={(v) => v.id}
        stickyHeader={true}

        persistState={false}

        headerActions={getHeaderActions()}
        headerActionsSingle={getHeaderActionsSingle}

        emptyState={{
          icon: Users,
          title: 'No volunteers found',
          description: 'No volunteers have been created yet.',
          action: {
            label: 'Add Volunteer',
            onClick: () => setIsAddModalOpen(true)
          }
        }}
        noSearchResultsEmptyState={{
          icon: Users,
          title: 'No matching volunteers',
          description: 'Try adjusting your search or filters to find what you\'re looking for.',
        }}
      />

      {/* Stats Cards - Horizontal Layout */}
      {statsData.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-8">
          {statsData.map((stat, index) => (
            <div 
              key={index}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => {
                // TODO: Add filtering by stat type
              }}
            >
              <div className="flex items-center space-x-3">
                {stat.icon && (
                  <div className={cn(
                    'p-2 rounded-full',
                    stat.color === 'primary' ? 'bg-orange-50' :
                    stat.color === 'success' ? 'bg-green-50' :
                    stat.color === 'warning' ? 'bg-purple-50' :
                    stat.color === 'info' ? 'bg-blue-50' :
                    'bg-gray-50'
                  )}>
                    <stat.icon className={cn(
                      'w-5 h-5',
                      stat.color === 'primary' ? 'text-[#F28C38]' :
                      stat.color === 'success' ? 'text-green-600' :
                      stat.color === 'warning' ? 'text-purple-600' :
                      stat.color === 'info' ? 'text-blue-600' :
                      'text-gray-600'
                    )} />
                  </div>
                )}
                <div className="flex-1">
                  <div className={cn(
                    'text-2xl font-bold',
                    stat.color === 'primary' ? 'text-[#F28C38]' :
                    stat.color === 'success' ? 'text-green-600' :
                    stat.color === 'warning' ? 'text-purple-600' :
                    stat.color === 'info' ? 'text-blue-600' :
                    'text-gray-600'
                  )}>
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-600 font-medium truncate">
                    {stat.label}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Add Volunteer Modal */}
      <AddVolunteerModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedVolunteer(null);
        }}
        createMutation={createVolunteerMutation}
        updateMutation={updateVolunteerMutation}
        selectedEvent={selectedEvent}
        editVolunteer={selectedVolunteer}
      />

      {/* View Volunteer Modal */}
      {selectedVolunteer && (
        <EnhancedModal
          isOpen={showViewModal}
          onClose={() => setShowViewModal(false)}
          title="Volunteer Details"
          subtitle={`${selectedVolunteer.firstName} ${selectedVolunteer.lastName} - Complete Information`}
          size="lg"
          mobileFullScreen={true}
          scrollableBody={true}
          footer={
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedVolunteer(selectedVolunteer);
                  setIsAddModalOpen(true);
                }}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#F28C38] rounded-lg hover:bg-[#E67A26] transition-colors"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Volunteer
              </button>
            </div>
          }
        >
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Volunteer Name</h3>
                <p className="text-gray-900 text-lg font-semibold">{selectedVolunteer.firstName} {selectedVolunteer.lastName}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Role</h3>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  selectedVolunteer.role === 'technical_volunteer' ? 'bg-purple-100 text-purple-800' :
                  selectedVolunteer.role === 'general_volunteer' ? 'bg-blue-100 text-blue-800' :
                  selectedVolunteer.role === 'verification_volunteer' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {selectedVolunteer.role.replace('_', ' ')}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Phone Number</h3>
                <p className="text-gray-900">{selectedVolunteer.phoneNumber}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Email</h3>
                <p className="text-gray-900">{selectedVolunteer.email || 'Not provided'}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Gender</h3>
                <p className="text-gray-900">{selectedVolunteer.gender === 'M' ? 'Male' : selectedVolunteer.gender === 'F' ? 'Female' : 'Other'}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Status</h3>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  selectedVolunteer.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {selectedVolunteer.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            {/* Location Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-gray-200">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Panchayat</h3>
                <p className="text-gray-900">{selectedVolunteer.panchayat || 'Not provided'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">District</h3>
                <p className="text-gray-900">{selectedVolunteer.district || 'Not provided'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">State</h3>
                <p className="text-gray-900">{selectedVolunteer.state || 'Not provided'}</p>
              </div>
            </div>

            {/* Timestamps */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Created At</h3>
                <p className="text-gray-900">
                  {selectedVolunteer.createdAt 
                    ? new Date(selectedVolunteer.createdAt).toLocaleDateString() 
                    : 'Unknown'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Profile Status</h3>
                <p className="text-gray-900">
                  {selectedVolunteer.profileComplete ? 'Complete' : 'Incomplete'}
                </p>
              </div>
            </div>
          </div>
        </EnhancedModal>
      )}

      {/* Assign Venue Modal */}
      <EnhancedModal
        isOpen={showAssignVenueModal}
        onClose={() => setShowAssignVenueModal(false)}
        title="Assign Venue to Volunteers"
        subtitle={`Assign selected ${selectedVolunteers.size} volunteer${selectedVolunteers.size !== 1 ? 's' : ''} to a venue`}
        size="md"
        mobileFullScreen={true}
        scrollableBody={true}
        footer={
          <div className="flex flex-row space-x-3 sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setShowAssignVenueModal(false);
                setSelectedAssignmentVenue('none');
                setSelectedAssignmentType('');
              }}
              className="flex-1 sm:flex-initial sm:px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (!selectedAssignmentVenue || selectedAssignmentVenue === 'none') {
                  addNotification('Please select a venue before assigning', 'warning');
                  return;
                }
                
                if (!selectedAssignmentType) {
                  addNotification('Please select an assignment type', 'warning');
                  return;
                }
                
                if (!selectedEvent) {
                  addNotification('No ongoing event found', 'error');
                  return;
                }
                
                console.log('Assignment data:', {
                  volunteerIds: Array.from(selectedVolunteers),
                  venueLevelMappingId: selectedAssignmentVenue,
                  eventId: selectedEvent,
                  volunteerType: selectedAssignmentType === 'technical' ? 'technical_volunteer' : 'general_volunteer',
                });
                
                // Call the assignment mutation
                assignVolunteersMutation.mutate({
                  volunteerIds: Array.from(selectedVolunteers) as string[],
                  venueLevelMappingId: selectedAssignmentVenue,
                  eventId: selectedEvent,
                  volunteerType: selectedAssignmentType === 'technical' ? 'technical_volunteer' : 'general_volunteer',
                });
              }}
              disabled={!selectedAssignmentVenue || selectedAssignmentVenue === 'none' || assignmentVenueLoading || assignVolunteersMutation.isPending}
              className="flex-1 sm:flex-initial sm:px-4 bg-[#F28C38] text-white rounded-lg hover:bg-[#E67A26] transition-colors font-medium py-2 text-sm disabled:opacity-50"
            >
              {assignVolunteersMutation.isPending ? 'Assigning...' : 'Assign Venue'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Selected Volunteers</h3>
            <div className="bg-gray-50 rounded-lg p-3">
              {Array.from(selectedVolunteers).map(id => {
                const volunteer = volunteers.find(v => v.id === id);
                return volunteer ? (
                  <div key={id} className="flex items-center justify-between py-1">
                    <span className="text-sm text-gray-900">
                      {volunteer.firstName} {volunteer.lastName}
                    </span>
                    <span className="text-xs text-gray-500">
                      {volunteer.role.replace('_', ' ')}
                    </span>
                  </div>
                ) : null;
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Venue
            </label>
            <Select 
              value={selectedAssignmentVenue} 
              onValueChange={setSelectedAssignmentVenue} 
              disabled={assignmentVenueLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={assignmentVenueLoading ? "Loading venues..." : "Select a venue..."} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No venue selected</SelectItem>
                {assignmentVenueOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span className="font-medium">{option.label}</span>
                    {option.description && (
                      <span className="block text-xs text-gray-500 mt-0.5">{option.description}</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assignment Type
            </label>
            <Select value={selectedAssignmentType} onValueChange={setSelectedAssignmentType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select assignment type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General Support</SelectItem>
                <SelectItem value="technical">Technical Support</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="Add any notes for this venue assignment..."
            />
          </div>
        </div>
      </EnhancedModal>
    </div>
  );
}