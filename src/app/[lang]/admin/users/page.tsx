"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { 
  Users,
  Shield,
  UserCheck,
  Calendar,
  Clock,
  Edit,
  Eye,
  Search,
  ChevronDown,
  CheckCircle,
  XCircle,
  AlertCircle,
  Mail,
  Phone,
  MapPin,
  Download,
  Loader2
} from 'lucide-react';

interface UserData {
  uid: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  whatsappNumber?: string;
  dob?: string;
  gender?: 'M' | 'F' | 'O';
  village?: string;
  panchayat?: string;
  taluk?: string;
  district?: string;
  state?: string;
  pincode?: string;
  role: string;
  currentTeamId?: string;
  isProfileComplete: boolean;
  documents?: {
    profilePhoto?: {
      url?: string;
      verified: boolean;
      uploadedAt?: any;
    };
    aadhaarFront?: {
      url?: string;
      verified: boolean;
      uploadedAt?: any;
    };
    aadhaarBack?: {
      url?: string;
      verified: boolean;
      uploadedAt?: any;
    };
  };
  createdAt?: any;
  updatedAt?: any;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [verificationFilter, setVerificationFilter] = useState<string>('all');

  const router = useRouter();
  const { lang } = useParams();
  const { user, userProfile, loading: authLoading } = useAuth();

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

    loadUsers();
  }, [user, userProfile, authLoading, lang, router]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersCollection = collection(db, 'users');
      const usersQuery = query(usersCollection, orderBy('createdAt', 'desc'));
      const usersSnapshot = await getDocs(usersQuery);
      
      const usersData: UserData[] = usersSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          uid: doc.id,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          phoneNumber: data.phoneNumber || '',
          whatsappNumber: data.whatsappNumber,
          dob: data.dob,
          gender: data.gender,
          village: data.village,
          panchayat: data.panchayat,
          taluk: data.taluk,
          district: data.district,
          state: data.state,
          pincode: data.pincode,
          role: data.role || 'public',
          currentTeamId: data.currentTeamId,
          isProfileComplete: data.isProfileComplete || false,
          documents: data.documents || {},
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        };
      });
      
      setUsers(usersData);
    } catch (err: any) {
      console.error('Error loading users:', err);
      setError('Failed to load users. Please check your permissions.');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phoneNumber.includes(searchTerm) ||
      user.village?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.panchayat?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.district?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    const matchesVerification = verificationFilter === 'all' || 
      (verificationFilter === 'complete' && user.isProfileComplete) ||
      (verificationFilter === 'incomplete' && !user.isProfileComplete);
    
    return matchesSearch && matchesRole && matchesVerification;
  });

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'captain': return 'bg-blue-100 text-blue-800';
      case 'player': return 'bg-green-100 text-green-800';
      case 'verification_volunteer': return 'bg-purple-100 text-purple-800';
      case 'volunteer_general': return 'bg-orange-100 text-orange-800';
      case 'volunteer_technical': return 'bg-indigo-100 text-indigo-800';
      case 'public': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="w-4 h-4" />;
      case 'captain': case 'player': return <Users className="w-4 h-4" />;
      case 'verification_volunteer': case 'volunteer_general': case 'volunteer_technical': 
        return <UserCheck className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  const getDocumentStatus = (user: UserData) => {
    const docs = user.documents || {};
    const hasProfilePhoto = docs.profilePhoto?.url;
    const hasAadhaarFront = docs.aadhaarFront?.url;
    const hasAadhaarBack = docs.aadhaarBack?.url;
    
    if (hasProfilePhoto && hasAadhaarFront && hasAadhaarBack) {
      return { status: 'complete', color: 'text-green-600', icon: <CheckCircle className="w-4 h-4" /> };
    } else if (hasProfilePhoto || hasAadhaarFront || hasAadhaarBack) {
      return { status: 'partial', color: 'text-yellow-600', icon: <Clock className="w-4 h-4" /> };
    } else {
      return { status: 'none', color: 'text-red-600', icon: <XCircle className="w-4 h-4" /> };
    }
  };

  const exportUsers = () => {
    const csvContent = [
      ['Name', 'Phone', 'Role', 'Village', 'Panchayat', 'District', 'Profile Complete', 'Documents Status', 'Created Date'].join(','),
      ...filteredUsers.map(user => [
        `${user.firstName} ${user.lastName}`,
        user.phoneNumber,
        user.role,
        user.village || '',
        user.panchayat || '',
        user.district || '',
        user.isProfileComplete ? 'Yes' : 'No',
        getDocumentStatus(user).status,
        user.createdAt ? user.createdAt.toDate?.() ? user.createdAt.toDate().toLocaleDateString() : new Date(user.createdAt).toLocaleDateString() : 'Unknown'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

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
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold font-fira mb-2 text-[#4A2F1D]">
            User Management
          </h1>
          <p className="text-sm sm:text-base text-gray-600 font-fira">
            View and manage user accounts - Read-only access
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total</p>
                <p className="text-2xl font-bold text-[#4A2F1D]">{users.length}</p>
              </div>
              <Users className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Complete Profiles</p>
                <p className="text-2xl font-bold text-green-600">{users.filter(u => u.isProfileComplete).length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Captains</p>
                <p className="text-2xl font-bold text-blue-600">{users.filter(u => u.role === 'captain').length}</p>
              </div>
              <Shield className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Players</p>
                <p className="text-2xl font-bold text-green-600">{users.filter(u => u.role === 'player').length}</p>
              </div>
              <Users className="w-8 h-8 text-green-400" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Volunteers</p>
                <p className="text-2xl font-bold text-purple-600">{users.filter(u => u.role.includes('volunteer')).length}</p>
              </div>
              <UserCheck className="w-8 h-8 text-purple-400" />
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search users by name, phone, or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F28C38] focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="relative">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-[#F28C38] focus:border-transparent"
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="captain">Captain</option>
                  <option value="player">Player</option>
                  <option value="verification_volunteer">Verification Volunteer</option>
                  <option value="volunteer_general">General Volunteer</option>
                  <option value="volunteer_technical">Technical Volunteer</option>
                  <option value="public">Public</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              </div>

              <div className="relative">
                <select
                  value={verificationFilter}
                  onChange={(e) => setVerificationFilter(e.target.value)}
                  className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-[#F28C38] focus:border-transparent"
                >
                  <option value="all">All Profiles</option>
                  <option value="complete">Complete</option>
                  <option value="incomplete">Incomplete</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              </div>

              <button
                onClick={exportUsers}
                className="bg-[#F28C38] hover:bg-[#E67A26] text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Users List */}
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 font-fira mb-2">
              No users found
            </h3>
            <p className="text-gray-600 font-fira">
              {searchTerm || roleFilter !== 'all' || verificationFilter !== 'all'
                ? 'Try adjusting your search or filters' 
                : 'Users will appear here as they register'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-lg shadow-sm border mb-6 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-gray-200" style={{minWidth: '800px'}}>
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profile</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Documents</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => {
                    const docStatus = getDocumentStatus(user);
                    return (
                      <tr key={user.uid} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{user.firstName} {user.lastName}</div>
                          <div className="text-xs text-gray-500">{user.gender === 'M' ? 'Male' : user.gender === 'F' ? 'Female' : 'Other'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{user.phoneNumber}</div>
                          {user.whatsappNumber && user.whatsappNumber !== user.phoneNumber && (
                            <div className="text-xs text-gray-500">WA: {user.whatsappNumber}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                            {getRoleIcon(user.role)}
                            <span className="ml-1 capitalize">{user.role.replace('_', ' ')}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{user.village || 'Not provided'}</div>
                          <div className="text-xs text-gray-500">{user.panchayat}, {user.district}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.isProfileComplete ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {user.isProfileComplete ? 'Complete' : 'Incomplete'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`flex items-center ${docStatus.color}`}>
                            {docStatus.icon}
                            <span className="ml-1 text-xs capitalize">{docStatus.status}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.createdAt ? user.createdAt.toDate?.() ? user.createdAt.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date(user.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => router.push(`/${lang}/admin/users/${user.uid}`)}
                            className="text-[#F28C38] hover:text-[#E67A26] font-medium text-sm flex items-center"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {filteredUsers.map((user) => {
                const docStatus = getDocumentStatus(user);
                return (
                  <div key={user.uid} className="bg-white rounded-lg shadow-sm border p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{user.firstName} {user.lastName}</h3>
                        <p className="text-sm text-gray-600">{user.phoneNumber}</p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                        {getRoleIcon(user.role)}
                        <span className="ml-1 capitalize">{user.role.replace('_', ' ')}</span>
                      </span>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <div><strong>Location:</strong> {user.village || 'Not provided'}, {user.panchayat}</div>
                      <div><strong>District:</strong> {user.district}</div>
                      <div className="flex items-center gap-4">
                        <div>
                          <strong>Profile:</strong>
                          <span className={`ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            user.isProfileComplete ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {user.isProfileComplete ? 'Complete' : 'Incomplete'}
                          </span>
                        </div>
                        <div className={`flex items-center ${docStatus.color}`}>
                          <strong>Docs:</strong>
                          {docStatus.icon}
                          <span className="ml-1 text-xs capitalize">{docStatus.status}</span>
                        </div>
                      </div>
                      <div><strong>Created:</strong> {user.createdAt ? user.createdAt.toDate?.() ? user.createdAt.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date(user.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Unknown'}</div>
                    </div>

                    <button
                      onClick={() => router.push(`/${lang}/admin/users/${user.uid}`)}
                      className="w-full bg-[#F28C38] hover:bg-[#E67A26] text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
    </div>
  );
}