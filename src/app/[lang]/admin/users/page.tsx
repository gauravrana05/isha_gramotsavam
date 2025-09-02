"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { pincodeService } from '@/lib/services/pincodeService';
import { api } from '@/server/trpc/react';
import {
  Users,
  Eye,
  Mail,
  Phone,
  Edit,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/AdvancedSelect';
import { EnhancedModal } from '@/components/ui/EnhancedModal';
import DocumentPreview from '@/components/documents/DocumentPreview';
import DocumentUpload from '@/components/documents/DocumentUpload';
import { formatPhoneForDisplay } from '@/lib/utils/phone';

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
  pincode?: string;
  panchayat?: string;
  district?: string;
  taluk?: string;
  state?: string;
  venueAssignment?: string;
  venueAssignmentId?: string;
  isVerified: boolean;
  isProfileComplete: boolean;
  profileComplete: boolean;
  createdAt: string | null;
  profileImages?: {
    profilePhotoPath?: string;
    aadhaarFrontPath?: string;
    aadhaarBackPath?: string;
    verifiedAt?: string;
  };
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { lang } = useParams();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { addNotification } = useNotification();

  // tRPC query for users
  const [tableParams, setTableParams] = useState<TableParams>({
    search: '',
    sort: [],
    filters: [],
    page: 1,
    pageSize: 25,
  });

  // Modal states
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUserRow | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<AdminUserRow>>({});

  // Location selection states
  const [districts, setDistricts] = useState<string[]>([]);
  const [taluks, setTaluks] = useState<string[]>([]);
  const [panchayats, setPanchayats] = useState<string[]>([]);
  const [addressLoading, setAddressLoading] = useState(false);

  const transformTableParams = (params: TableParams) => ({
    limit: params.pageSize,
    offset: (params.page - 1) * params.pageSize,
    role: 'all',
    gender: 'all',
    isVerified: 'all',
    isProfileComplete: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  const {
    data: usersData,
    isLoading: usersLoading,
    error: usersError,
    refetch: refetchUsers
  } = api.admin.users.getUsers.useQuery(transformTableParams(tableParams), {
    enabled: !!user && userProfile?.role === 'admin'
  });

  const handleDataLoad = useCallback((params: TableParams) => {
    setTableParams(params);
  }, []);

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
      render: (phoneNumber, u) => (
        <div className="text-sm text-gray-900">
          <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" />{formatPhoneForDisplay(u.phoneNumber)}</div>
          {u.email && (
            <div className="flex items-center gap-2 text-gray-600 mt-1"><Mail className="w-4 h-4 text-gray-400" />{u.email}</div>
          )}
        </div>
      )
    },
    {
      key: 'team',
      header: 'Assignment',
      accessor: 'venueAssignment',
      minWidth: 180,
      render: (_, u) => (
        <div className="text-sm text-gray-900">
          {u.venueAssignment || '—'}
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

  // Handle row click to view user details
  const handleRowClick = (user: AdminUserRow) => {
    setSelectedUser(user);
    setEditFormData(user);
    setShowViewModal(true);
  };

  // Location fetch functions
  const fetchAddressByPincode = async (pincode: string) => {
    if (pincode.length !== 6) return;
    setAddressLoading(true);
    try {
      const addressData = await pincodeService.getAddressByPincode(pincode);
      setEditFormData(prev => ({
        ...prev,
        state: addressData.state,
        district: '',
        taluk: '',
        panchayat: ''
      }));
      setDistricts([]);
      setTaluks([]);
      setPanchayats([]);
      if (addressData.state) {
        await fetchDistricts(addressData.state);
      }
    } catch (err: any) {
      addNotification(`Invalid pincode: ${err.message}`, 'error');
    } finally {
      setAddressLoading(false);
    }
  };

  const fetchDistricts = async (state: string) => {
    if (!state) return;
    setAddressLoading(true);
    try {
      const districtList = await pincodeService.getDistrictsByState(state);
      setDistricts(districtList);
    } catch (err: any) {
      addNotification(`Failed to fetch districts: ${err.message}`, 'error');
    } finally {
      setAddressLoading(false);
    }
  };

  const fetchTaluks = async (state: string, district: string) => {
    if (!state || !district) return;
    setAddressLoading(true);
    try {
      const { taluks } = await pincodeService.getTaluksByDistrict(state, district);
      setTaluks(taluks);
    } catch (err: any) {
      addNotification(`Failed to fetch taluks: ${err.message}`, 'error');
    } finally {
      setAddressLoading(false);
    }
  };

  const fetchPanchayats = async (state: string, district: string, taluk: string) => {
    if (!state || !district || !taluk) return;
    setAddressLoading(true);
    try {
      const panchayatList = await pincodeService.getPanchayatsByTaluk(state, district, taluk);
      setPanchayats(panchayatList);
    } catch (err: any) {
      addNotification(`Failed to fetch panchayats: ${err.message}`, 'error');
    } finally {
      setAddressLoading(false);
    }
  };

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
            u.phone,
            u.email || '',
            u.role,
            u.gender,
            u.panchayat || '',
            u.district || '',
            u.isVerified ? 'Yes' : 'No',
            u.profileComplete ? 'Yes' : 'No',
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
      <div className="lg:min-h-screen bg-gray-50 flex items-center justify-center">
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
      <AdvancedTable<AdminUserRow>
        data={users}
        columns={columns}
        loading={loading}
        onRowClick={handleRowClick}

        searchable={true}
        searchPlaceholder="Search by name, phone, email..."

        filterable={true}
        filters={filterFields}

        sortable={true}
        multiSort={true}
        defaultSort={[{ key: 'createdAt', direction: 'desc' }]}

        pagination={{ 
          enabled: true, 
          serverSide: true, 
          total: usersData?.total || 0,
          pageSize: 25,
          pageSizeOptions: [10, 25, 50, 100]
        }}
        onDataLoad={handleDataLoad}

        exportOptions={exportOptions}

        selectable={false}
        keyExtractor={(u) => u.id}
        stickyHeader={true}

        persistState={false}

        emptyState={{
          icon: Users,
          title: 'No users found',
          description: 'Try adjusting your search or filters'
        }}
      />

      {/* User View Modal */}
      {selectedUser && (
        <EnhancedModal
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false);
            setIsEditMode(false);
            setEditFormData({});
          }}
          title={isEditMode ? "Edit User" : "User Details"}
          subtitle={`${selectedUser.firstName} ${selectedUser.lastName} - ${isEditMode ? 'Edit Information' : 'Complete Information'}`}
          size="xl"
          mobileFullScreen={true}
          scrollableBody={true}
          footer={
            <div className="flex justify-end space-x-2">
              {!isEditMode ? (
                <button
                  onClick={() => setIsEditMode(true)}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#F28C38] rounded-lg hover:bg-[#E67A26] transition-colors"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit User
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditMode(false)}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      // TODO: Implement save functionality
                      console.log('Saving user data:', editFormData);
                      setIsEditMode(false);
                    }}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#F28C38] rounded-lg hover:bg-[#E67A26] transition-colors"
                  >
                    Save Changes
                  </button>
                </>
              )}
            </div>
          }
        >
          <div className="space-y-6">
            {/* Profile Photo - At the very top */}
            <div className="flex justify-center">
              <div className="w-32 h-32 flex justify-center items-center">
                {isEditMode ? (
                  <DocumentUpload
                    type="profilePhoto"
                    label="Profile Photo"
                    currentUrl={selectedUser.profileImages?.profilePhotoPath}
                    variant="profile"
                    className="flex flex-col justify-center items-center"
                    onSuccess={async (url) => {
                      // Update both form data and selected user
                      setEditFormData(prev => ({
                        ...prev,
                        profileImages: {
                          ...prev.profileImages,
                          profilePhotoPath: url
                        }
                      }));
                      setSelectedUser(prev => prev ? {
                        ...prev,
                        profileImages: {
                          ...prev.profileImages,
                          profilePhotoPath: url
                        }
                      } : null);
                      // Refetch users data to get updated images
                      await refetchUsers();
                      addNotification('Profile photo uploaded successfully!', 'success');
                    }}
                    onError={(error) => {
                      addNotification(`Failed to upload profile photo: ${error}`, 'error');
                    }}
                  />
                ) : selectedUser.profileImages?.profilePhotoPath ? (
                  <div className="flex justify-center">
                    <DocumentPreview
                      type="profilePhoto"
                      url={selectedUser.profileImages.profilePhotoPath}
                      label="Profile Photo"
                      verified={!!selectedUser.profileImages.verifiedAt}
                      showActions={false}
                      size="lg"
                    />
                  </div>
                ) : (
                  <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center border-2 border-dashed border-gray-300">
                    <span className="text-gray-400 text-sm text-center">No Photo</span>
                  </div>
                )}
              </div>
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">First Name</h3>
                {isEditMode ? (
                  <input
                    type="text"
                    value={editFormData.firstName || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F28C38] focus:border-[#F28C38]"
                  />
                ) : (
                  <p className="text-gray-900 text-lg font-semibold">{selectedUser.firstName}</p>
                )}
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Last Name</h3>
                {isEditMode ? (
                  <input
                    type="text"
                    value={editFormData.lastName || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F28C38] focus:border-[#F28C38]"
                  />
                ) : (
                  <p className="text-gray-900 text-lg font-semibold">{selectedUser.lastName}</p>
                )}
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Role</h3>
                {isEditMode ? (
                  <select
                    value={editFormData.role || selectedUser.role}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, role: e.target.value as UserRole }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F28C38] focus:border-[#F28C38]"
                  >
                    <option value="admin">Admin</option>
                    <option value="captain">Captain</option>
                    <option value="player">Player</option>
                    <option value="general_volunteer">General Volunteer</option>
                    <option value="technical_volunteer">Technical Volunteer</option>
                    <option value="verification_volunteer">Verification Volunteer</option>
                  </select>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                    {selectedUser.role.replace('_', ' ')}
                  </span>
                )}
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Email</h3>
                {isEditMode ? (
                  <input
                    type="email"
                    value={editFormData.email || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F28C38] focus:border-[#F28C38]"
                  />
                ) : (
                  <p className="text-gray-900">{selectedUser.email || 'Not provided'}</p>
                )}
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Gender</h3>
                {isEditMode ? (
                  <select
                    value={editFormData.gender || selectedUser.gender}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, gender: e.target.value as 'M' | 'F' | 'O' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F28C38] focus:border-[#F28C38]"
                  >
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="O">Other</option>
                  </select>
                ) : (
                  <p className="text-gray-900">{selectedUser.gender === 'M' ? 'Male' : selectedUser.gender === 'F' ? 'Female' : 'Other'}</p>
                )}
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Phone Number</h3>
                <p className="text-gray-900">{selectedUser.phone}</p>
                <p className="text-xs text-gray-500">Phone number cannot be changed</p>
              </div>
            </div>

            {/* Location Information */}
            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Location Information</h3>
              
              {isEditMode ? (
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Pincode
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          maxLength={6}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F28C38] focus:border-[#F28C38] pr-10"
                          placeholder="Enter 6-digit pincode"
                          value={editFormData.pincode || ''}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            setEditFormData(prev => ({ ...prev, pincode: value }));
                            if (value.length === 6) {
                              fetchAddressByPincode(value);
                            }
                          }}
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          {addressLoading && <div className="w-4 h-4 border-2 border-[#F28C38] border-t-transparent rounded-full animate-spin"></div>}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                        placeholder="Select pincode first"
                        value={editFormData.state || ''}
                        disabled={!editFormData.pincode}
                        readOnly
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">District</label>
                      <Select
                        value={editFormData.district || ''}
                        onValueChange={(value) => {
                          setEditFormData(prev => ({ 
                            ...prev, 
                            district: value,
                            panchayat: ''
                          }));
                          setPanchayats([]);
                          if (value && editFormData.state) {
                            fetchTaluks(editFormData.state, value);
                          }
                        }}
                        disabled={!editFormData.state || !districts.length}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select District" />
                        </SelectTrigger>
                        <SelectContent>
                          {districts.map(district => (
                            <SelectItem key={district} value={district}>{district}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Taluk</label>
                      <Select
                        value={editFormData.taluk || ''}
                        onValueChange={(value) => {
                          setEditFormData(prev => ({ 
                            ...prev, 
                            taluk: value,
                            panchayat: ''
                          }));
                          setPanchayats([]);
                          if (value && editFormData.state && editFormData.district) {
                            fetchPanchayats(editFormData.state, editFormData.district, value);
                          }
                        }}
                        disabled={!editFormData.district || !taluks.length}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select Taluk" />
                        </SelectTrigger>
                        <SelectContent>
                          {taluks.map(taluk => (
                            <SelectItem key={taluk} value={taluk}>{taluk}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Panchayat</label>
                      <Select
                        value={editFormData.panchayat || ''}
                        onValueChange={(value) => {
                          setEditFormData(prev => ({ ...prev, panchayat: value }));
                        }}
                        disabled={!editFormData.taluk || !panchayats.length}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select Panchayat" />
                        </SelectTrigger>
                        <SelectContent>
                          {panchayats.map(panchayat => (
                            <SelectItem key={panchayat} value={panchayat}>{panchayat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-1">Pincode</div>
                    <div className="text-gray-900">{selectedUser.pincode || 'Not Available'}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-1">State</div>
                    <div className="text-gray-900">{selectedUser.state || 'Not Available'}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-1">District</div>
                    <div className="text-gray-900">{selectedUser.district || 'Not Available'}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-1">Taluk</div>
                    <div className="text-gray-900">{selectedUser.taluk || 'Not Available'}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-1">Panchayat</div>
                    <div className="text-gray-900">{selectedUser.panchayat || 'Not Available'}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Documents Section */}
            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-lg font-bold text-[#4A2F1D] mb-4">Identity Documents</h3>
              
              <div className="space-y-4">
                {/* Aadhaar Front */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">Aadhaar Front</span>
                    <div className={`w-3 h-3 rounded-full ${selectedUser.profileImages?.aadhaarFrontPath ? 'bg-[#3A7F3F]' : 'bg-gray-300'}`}></div>
                  </div>
                  {isEditMode ? (
                    <DocumentUpload
                      type="aadhaarFront"
                      label="Aadhaar Front"
                      currentUrl={selectedUser.profileImages?.aadhaarFrontPath}
                      variant="card"
                      onSuccess={async (url) => {
                        // Update both form data and selected user
                        setEditFormData(prev => ({
                          ...prev,
                          profileImages: {
                            ...prev.profileImages,
                            aadhaarFrontPath: url
                          }
                        }));
                        setSelectedUser(prev => prev ? {
                          ...prev,
                          profileImages: {
                            ...prev.profileImages,
                            aadhaarFrontPath: url
                          }
                        } : null);
                        // Refetch users data to get updated images
                        await refetchUsers();
                        addNotification('Aadhaar front uploaded successfully!', 'success');
                      }}
                      onError={(error) => {
                        addNotification(`Failed to upload Aadhaar front: ${error}`, 'error');
                      }}
                    />
                  ) : selectedUser.profileImages?.aadhaarFrontPath ? (
                    <DocumentPreview
                      type="aadhaarFront"
                      url={selectedUser.profileImages.aadhaarFrontPath}
                      label="Aadhaar Front"
                      verified={!!selectedUser.profileImages.verifiedAt}
                      showActions={false}
                      size="md"
                    />
                  ) : (
                    <div className="text-sm text-gray-500 py-4 text-center border-2 border-dashed border-gray-200 rounded">
                      No Aadhaar front uploaded
                    </div>
                  )}
                </div>

                {/* Aadhaar Back */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">Aadhaar Back</span>
                    <div className={`w-3 h-3 rounded-full ${selectedUser.profileImages?.aadhaarBackPath ? 'bg-[#3A7F3F]' : 'bg-gray-300'}`}></div>
                  </div>
                  {isEditMode ? (
                    <DocumentUpload
                      type="aadhaarBack"
                      label="Aadhaar Back"
                      currentUrl={selectedUser.profileImages?.aadhaarBackPath}
                      variant="card"
                      onSuccess={async (url) => {
                        // Update both form data and selected user
                        setEditFormData(prev => ({
                          ...prev,
                          profileImages: {
                            ...prev.profileImages,
                            aadhaarBackPath: url
                          }
                        }));
                        setSelectedUser(prev => prev ? {
                          ...prev,
                          profileImages: {
                            ...prev.profileImages,
                            aadhaarBackPath: url
                          }
                        } : null);
                        // Refetch users data to get updated images
                        await refetchUsers();
                        addNotification('Aadhaar back uploaded successfully!', 'success');
                      }}
                      onError={(error) => {
                        addNotification(`Failed to upload Aadhaar back: ${error}`, 'error');
                      }}
                    />
                  ) : selectedUser.profileImages?.aadhaarBackPath ? (
                    <DocumentPreview
                      type="aadhaarBack"
                      url={selectedUser.profileImages.aadhaarBackPath}
                      label="Aadhaar Back"
                      verified={!!selectedUser.profileImages.verifiedAt}
                      showActions={false}
                      size="md"
                    />
                  ) : (
                    <div className="text-sm text-gray-500 py-4 text-center border-2 border-dashed border-gray-200 rounded">
                      No Aadhaar back uploaded
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Profile Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Verification Status</h3>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  selectedUser.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {selectedUser.isVerified ? 'Verified' : 'Pending'}
                </span>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Created At</h3>
                <p className="text-gray-900">
                  {selectedUser.createdAt 
                    ? new Date(selectedUser.createdAt).toLocaleDateString('en-IN', { 
                        day: '2-digit', 
                        month: 'long', 
                        year: 'numeric' 
                      }) 
                    : 'Unknown'}
                </p>
              </div>
            </div>
          </div>
        </EnhancedModal>
      )}
    </div>
  );
}