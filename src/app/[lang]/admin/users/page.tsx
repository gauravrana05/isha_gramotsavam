"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Plus, 
  Users,
  Shield,
  UserCheck,
  Calendar,
  Clock,
  Edit,
  Eye,
  Trash2,
  Filter,
  Search,
  ChevronDown,
  CheckCircle,
  XCircle,
  AlertCircle,
  Mail,
  Phone,
  MapPin,
  Download,
  Ban,
  RefreshCw
} from 'lucide-react';
import Button from '@/components/ui/Button';

interface User {
  uid: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  whatsappNumber: string;
  dob: string; // YYYY-MM-DD format
  gender: 'M' | 'F' | 'O';
  village: string;
  panchayat: string;
  taluk: string;
  district: string;
  state: string;
  pincode: string;
  role: 'admin' | 'captain' | 'player' | 'volunteer_general' | 'volunteer_technical';
  currentTeamId?: string;
  isProfileComplete: boolean;
  isVerified: boolean;
  documents: {
    profilePhoto: {
      storagePath: string;
      verified: boolean;
      uploadedAt: any;
      uploadedBy: string | null;
    };
    aadhaarFront: {
      storagePath: string;
      verified: boolean;
      uploadedAt: any;
      uploadedBy: string | null;
    };
    aadhaarBack: {
      storagePath: string;
      verified: boolean;
      uploadedAt: any;
      uploadedBy: string | null;
    };
  };
  createdAt: any;
  updatedAt: any;
}

export default function UsersManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [verificationFilter, setVerificationFilter] = useState<string>('all');

  const { lang } = useParams();
  const router = useRouter();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      // Simulate API call - replace with actual data fetching
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockUsers: User[] = [
        {
          uid: 'captain_001',
          firstName: 'Murugan',
          lastName: 'Selvam',
          phoneNumber: '+91 8351000002',
          whatsappNumber: '+91 8351000002',
          dob: '1992-08-15',
          gender: 'M',
          village: 'Kondampatti',
          panchayat: 'Kondampatti Panchayat',
          taluk: 'Sulur',
          district: 'Coimbatore',
          state: 'Tamil Nadu',
          pincode: '641109',
          role: 'captain',
          currentTeamId: 'team_001',
          isProfileComplete: true,
          isVerified: true,
          documents: {
            profilePhoto: {
              storagePath: '',
              verified: true,
              uploadedAt: new Date('2025-01-20T10:00:00Z'),
              uploadedBy: 'admin_001'
            },
            aadhaarFront: {
              storagePath: '',
              verified: true,
              uploadedAt: new Date('2025-01-20T10:05:00Z'),
              uploadedBy: 'admin_001'
            },
            aadhaarBack: {
              storagePath: '',
              verified: true,
              uploadedAt: new Date('2025-01-20T10:05:00Z'),
              uploadedBy: 'admin_001'
            }
          },
          createdAt: new Date('2024-12-15T10:30:00Z'),
          updatedAt: new Date('2025-01-29T14:45:00Z')
        },
        {
          uid: 'admin_001',
          firstName: 'Rajesh',
          lastName: 'Kumar',
          phoneNumber: '+91 8351000000',
          whatsappNumber: '+91 8351000000',
          dob: '1985-06-15',
          gender: 'M',
          village: 'Coimbatore City',
          panchayat: 'Coimbatore Corporation',
          taluk: 'Coimbatore',
          district: 'Coimbatore',
          state: 'Tamil Nadu',
          pincode: '641001',
          role: 'admin',
          isProfileComplete: true,
          isVerified: true,
          documents: {
            profilePhoto: {
              storagePath: '',
              verified: true,
              uploadedAt: new Date(),
              uploadedBy: 'system'
            },
            aadhaarFront: {
              storagePath: '',
              verified: true,
              uploadedAt: new Date(),
              uploadedBy: 'system'
            },
            aadhaarBack: {
              storagePath: '',
              verified: true,
              uploadedAt: new Date(),
              uploadedBy: 'system'
            }
          },
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date()
        },
        {
          uid: 'player_001',
          firstName: 'Senthil',
          lastName: 'Kumar',
          phoneNumber: '+91 8351000006',
          whatsappNumber: '+91 8351000006',
          dob: '1995-04-12',
          gender: 'M',
          village: 'Kondampatti',
          panchayat: 'Kondampatti Panchayat',
          taluk: 'Sulur',
          district: 'Coimbatore',
          state: 'Tamil Nadu',
          pincode: '641109',
          role: 'player',
          isProfileComplete: true,
          isVerified: true,
          documents: {
            profilePhoto: {
              storagePath: '',
              verified: true,
              uploadedAt: new Date('2025-01-20T10:00:00Z'),
              uploadedBy: 'admin_001'
            },
            aadhaarFront: {
              storagePath: '',
              verified: true,
              uploadedAt: new Date('2025-01-20T10:05:00Z'),
              uploadedBy: 'admin_001'
            },
            aadhaarBack: {
              storagePath: '',
              verified: true,
              uploadedAt: new Date('2025-01-20T10:05:00Z'),
              uploadedBy: 'admin_001'
            }
          },
          createdAt: new Date('2024-12-20T09:15:00Z'),
          updatedAt: new Date('2025-01-28T16:20:00Z')
        },
        {
          uid: 'volunteer_general_001',
          firstName: 'Arjun',
          lastName: 'Singh',
          phoneNumber: '+91 8351000014',
          whatsappNumber: '+91 8351000014',
          dob: '1989-11-12',
          gender: 'M',
          village: 'Pollachi',
          panchayat: 'Pollachi Municipality',
          taluk: 'Pollachi',
          district: 'Coimbatore',
          state: 'Tamil Nadu',
          pincode: '642001',
          role: 'volunteer_general',
          isProfileComplete: true,
          isVerified: true,
          documents: {
            profilePhoto: {
              storagePath: '',
              verified: true,
              uploadedAt: new Date('2025-01-20T10:00:00Z'),
              uploadedBy: 'admin_001'
            },
            aadhaarFront: {
              storagePath: '',
              verified: true,
              uploadedAt: new Date('2025-01-20T10:05:00Z'),
              uploadedBy: 'admin_001'
            },
            aadhaarBack: {
              storagePath: '',
              verified: false,
              uploadedAt: null,
              uploadedBy: null
            }
          },
          createdAt: new Date('2024-11-10T14:00:00Z'),
          updatedAt: new Date('2025-01-29T08:30:00Z')
        }
      ];

      setUsers(mockUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.phone.includes(searchTerm);
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    const matchesVerification = verificationFilter === 'all' || user.verificationStatus === verificationFilter;
    
    return matchesSearch && matchesRole && matchesStatus && matchesVerification;
  });

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'captain': return 'bg-blue-100 text-blue-800';
      case 'volunteer': return 'bg-green-100 text-green-800';
      case 'player': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="w-3 h-3 mr-1" />;
      case 'captain': return <UserCheck className="w-3 h-3 mr-1" />;
      case 'volunteer': return <Users className="w-3 h-3 mr-1" />;
      case 'player': return <Users className="w-3 h-3 mr-1" />;
      default: return <Users className="w-3 h-3 mr-1" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4" />;
      case 'inactive': return <XCircle className="w-4 h-4" />;
      case 'suspended': return <Ban className="w-4 h-4" />;
      case 'pending': return <AlertCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getVerificationColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const exportUsersData = () => {
    const csvContent = [
      ['Name', 'Email', 'Phone', 'Role', 'Status', 'Verification', 'Join Date', 'Last Login', 'Login Count'].join(','),
      ...filteredUsers.map(user => [
        `${user.firstName} ${user.lastName}`,
        user.email,
        user.phone,
        user.role,
        user.status,
        user.verificationStatus,
        new Date(user.joinDate).toLocaleDateString(),
        new Date(user.lastLogin).toLocaleDateString(),
        user.loginCount
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users_export.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleUserAction = (userId: string, action: string) => {
    console.log(`${action} user:`, userId);
    // Implement user actions (suspend, activate, etc.)
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Users Management</h1>
          <p className="text-gray-600 mt-2">Manage user accounts, roles, and verification status</p>
        </div>
        
        <div className="mt-4 sm:mt-0 flex gap-3">
          <Button
            onClick={exportUsersData}
            variant="outline"
            className="flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button
            onClick={() => router.push(`/${lang}/admin/users/verification`)}
            variant="outline"
            className="flex items-center"
          >
            <UserCheck className="w-4 h-4 mr-2" />
            Verification Queue
          </Button>
          <Button
            onClick={loadUsers}
            className="bg-[#3A7F3F] hover:bg-green-700 flex items-center"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F28C38] focus:border-transparent"
            />
          </div>

          {/* Filters */}
          <div className="flex space-x-4">
            <div className="relative">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-[#F28C38] focus:border-transparent"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="captain">Captain</option>
                <option value="volunteer">Volunteer</option>
                <option value="player">Player</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            </div>

            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-[#F28C38] focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
                <option value="pending">Pending</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            </div>

            <div className="relative">
              <select
                value={verificationFilter}
                onChange={(e) => setVerificationFilter(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-[#F28C38] focus:border-transparent"
              >
                <option value="all">All Verification</option>
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Users List */}
      {filteredUsers.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || roleFilter !== 'all' || verificationFilter !== 'all'
              ? 'Try adjusting your search or filters' 
              : 'Users will appear here as they register'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredUsers.map((user) => (
            <div key={user.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {user.firstName} {user.lastName}
                    </h3>
                    
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                      {getRoleIcon(user.role)}
                      <span className="capitalize">{user.role}</span>
                    </span>
                    
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>
                      {getStatusIcon(user.status)}
                      <span className="ml-1 capitalize">{user.status}</span>
                    </span>

                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getVerificationColor(user.verificationStatus)}`}>
                      <span className="capitalize">{user.verificationStatus}</span>
                    </span>

                    {!user.isProfileComplete && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        Incomplete Profile
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center">
                      <Mail className="w-4 h-4 mr-2" />
                      <span>{user.email}</span>
                    </div>
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 mr-2" />
                      <span>{user.phone}</span>
                    </div>
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2" />
                      <span>{user.address.city}, {user.address.state}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <Button
                    onClick={() => router.push(`/${lang}/admin/users/${user.id}`)}
                    variant="outline"
                    className="text-xs py-1 px-3"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    View
                  </Button>
                  
                  <Button
                    onClick={() => router.push(`/${lang}/admin/users/${user.id}/edit`)}
                    variant="outline"
                    className="text-xs py-1 px-3"
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  
                  {user.status === 'active' ? (
                    <Button
                      onClick={() => handleUserAction(user.id, 'suspend')}
                      variant="outline"
                      className="text-xs py-1 px-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Ban className="w-3 h-3 mr-1" />
                      Suspend
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleUserAction(user.id, 'activate')}
                      variant="outline"
                      className="text-xs py-1 px-3 text-green-600 hover:text-green-700 hover:bg-green-50"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Activate
                    </Button>
                  )}
                </div>
              </div>

              {/* User Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>Joined: {new Date(user.joinDate).toLocaleDateString()}</span>
                </div>
                
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>Last Login: {new Date(user.lastLogin).toLocaleDateString()}</span>
                </div>
                
                <div className="flex items-center text-sm text-gray-600">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  <span>Logins: {user.loginCount}</span>
                </div>
                
                <div className="flex items-center text-sm text-gray-600">
                  <Users className="w-4 h-4 mr-2" />
                  <span>Teams: {user.teams.length}</span>
                </div>
              </div>

              {/* Additional Info */}
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center space-x-4">
                  <span>Age: {new Date().getFullYear() - new Date(user.dateOfBirth).getFullYear()}</span>
                  <span className="capitalize">Gender: {user.gender}</span>
                  <span>Emergency: {user.emergencyContact.name} ({user.emergencyContact.relationship})</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  {user.documents.profilePhoto && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Photo
                    </span>
                  )}
                  {user.documents.idProof && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      ID Proof
                    </span>
                  )}
                  {user.documents.addressProof && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      Address Proof
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {users.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Users Overview</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-[#3A7F3F]">
                {users.length}
              </div>
              <div className="text-sm text-gray-600">Total Users</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {users.filter(u => u.status === 'active').length}
              </div>
              <div className="text-sm text-gray-600">Active</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {users.filter(u => u.role === 'captain').length}
              </div>
              <div className="text-sm text-gray-600">Captains</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {users.filter(u => u.role === 'volunteer').length}
              </div>
              <div className="text-sm text-gray-600">Volunteers</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {users.filter(u => u.verificationStatus === 'pending').length}
              </div>
              <div className="text-sm text-gray-600">Pending Verification</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-[#F28C38]">
                {users.filter(u => u.verificationStatus === 'verified').length}
              </div>
              <div className="text-sm text-gray-600">Verified</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
