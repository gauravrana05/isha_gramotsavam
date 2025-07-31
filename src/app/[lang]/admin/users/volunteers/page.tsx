"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Plus, 
  UserCheck,
  MapPin,
  Users,
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
  Phone,
  Mail,
  Shield
} from 'lucide-react';
import Button from '@/components/ui/Button';

interface Volunteer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: 'volunteer' | 'coordinator' | 'head_volunteer';
  status: 'active' | 'inactive' | 'pending';
  assignedVenues: string[];
  assignedSports: string[];
  availability: {
    dates: string[];
    timeSlots: string[];
  };
  experience: {
    years: number;
    previousEvents: string[];
    specializations: string[];
  };
  skills: string[];
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  verificationStatus: 'verified' | 'pending' | 'rejected';
  documents: {
    idProof: string;
    addressProof: string;
    medicalCertificate?: string;
  };
  joinDate: string;
  lastActive: string;
}

export default function VolunteersManagement() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const { lang } = useParams();
  const router = useRouter();

  useEffect(() => {
    loadVolunteers();
  }, []);

  const loadVolunteers = async () => {
    try {
      // Simulate API call - replace with actual data fetching
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockVolunteers: Volunteer[] = [
        {
          id: '1',
          firstName: 'Ananya',
          lastName: 'Sharma',
          email: 'ananya.sharma@email.com',
          phone: '+91 9876543210',
          role: 'head_volunteer',
          status: 'active',
          assignedVenues: ['1', '2'],
          assignedSports: ['volleyball', 'throwball'],
          availability: {
            dates: ['2025-03-01', '2025-03-02', '2025-03-03'],
            timeSlots: ['morning', 'afternoon']
          },
          experience: {
            years: 5,
            previousEvents: ['Isha Gramotsavam 2024', 'Youth Sports Festival 2023'],
            specializations: ['Event Coordination', 'Team Management']
          },
          skills: ['Leadership', 'Communication', 'First Aid', 'Sports Knowledge'],
          emergencyContact: {
            name: 'Rajesh Sharma',
            relationship: 'Father',
            phone: '+91 9876543211'
          },
          verificationStatus: 'verified',
          documents: {
            idProof: '/documents/ananya_id.pdf',
            addressProof: '/documents/ananya_address.pdf',
            medicalCertificate: '/documents/ananya_medical.pdf'
          },
          joinDate: '2024-01-15T00:00:00Z',
          lastActive: '2025-01-28T14:30:00Z'
        },
        {
          id: '2',
          firstName: 'Vikram',
          lastName: 'Patel',
          email: 'vikram.patel@email.com',
          phone: '+91 9876543212',
          role: 'coordinator',
          status: 'active',
          assignedVenues: ['1'],
          assignedSports: ['volleyball'],
          availability: {
            dates: ['2025-03-01', '2025-03-02'],
            timeSlots: ['morning', 'evening']
          },
          experience: {
            years: 3,
            previousEvents: ['Isha Gramotsavam 2024'],
            specializations: ['Venue Management', 'Player Coordination']
          },
          skills: ['Organization', 'Problem Solving', 'Sports Rules'],
          emergencyContact: {
            name: 'Meera Patel',
            relationship: 'Mother',
            phone: '+91 9876543213'
          },
          verificationStatus: 'verified',
          documents: {
            idProof: '/documents/vikram_id.pdf',
            addressProof: '/documents/vikram_address.pdf'
          },
          joinDate: '2024-02-20T00:00:00Z',
          lastActive: '2025-01-29T09:15:00Z'
        },
        {
          id: '3',
          firstName: 'Priya',
          lastName: 'Kumar',
          email: 'priya.kumar@email.com',
          phone: '+91 9876543214',
          role: 'volunteer',
          status: 'pending',
          assignedVenues: [],
          assignedSports: [],
          availability: {
            dates: ['2025-03-01', '2025-03-02', '2025-03-03', '2025-03-04'],
            timeSlots: ['afternoon', 'evening']
          },
          experience: {
            years: 1,
            previousEvents: [],
            specializations: ['General Support']
          },
          skills: ['Enthusiasm', 'Learning Attitude', 'Team Work'],
          emergencyContact: {
            name: 'Suresh Kumar',
            relationship: 'Father',
            phone: '+91 9876543215'
          },
          verificationStatus: 'pending',
          documents: {
            idProof: '/documents/priya_id.pdf',
            addressProof: '/documents/priya_address.pdf'
          },
          joinDate: '2025-01-20T00:00:00Z',
          lastActive: '2025-01-27T16:45:00Z'
        }
      ];

      setVolunteers(mockVolunteers);
    } catch (error) {
      console.error('Error loading volunteers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredVolunteers = volunteers.filter(volunteer => {
    const matchesSearch = volunteer.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         volunteer.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         volunteer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         volunteer.phone.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || volunteer.status === statusFilter;
    const matchesRole = roleFilter === 'all' || volunteer.role === roleFilter;
    
    return matchesSearch && matchesStatus && matchesRole;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4" />;
      case 'inactive': return <XCircle className="w-4 h-4" />;
      case 'pending': return <AlertCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'head_volunteer': return 'bg-purple-100 text-purple-800';
      case 'coordinator': return 'bg-blue-100 text-blue-800';
      case 'volunteer': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'head_volunteer': return <Shield className="w-3 h-3 mr-1" />;
      case 'coordinator': return <UserCheck className="w-3 h-3 mr-1" />;
      case 'volunteer': return <Users className="w-3 h-3 mr-1" />;
      default: return <Users className="w-3 h-3 mr-1" />;
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

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
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
          <h1 className="text-3xl font-bold text-gray-900">Volunteers Management</h1>
          <p className="text-gray-600 mt-2">Manage volunteers, assignments, and coordination</p>
        </div>
        
        <div className="mt-4 sm:mt-0 flex gap-3">
          <Button
            onClick={() => router.push(`/${lang}/admin/users/volunteers/assign-venues`)}
            variant="outline"
            className="flex items-center"
          >
            <MapPin className="w-4 h-4 mr-2" />
            Assign Venues
          </Button>
          <Button
            onClick={() => router.push(`/${lang}/admin/users/volunteers/invite`)}
            className="bg-[#3A7F3F] hover:bg-green-700 flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Invite Volunteer
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
              placeholder="Search volunteers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F28C38] focus:border-transparent"
            />
          </div>

          {/* Filters */}
          <div className="flex space-x-4">
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-[#F28C38] focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            </div>

            <div className="relative">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-[#F28C38] focus:border-transparent"
              >
                <option value="all">All Roles</option>
                <option value="head_volunteer">Head Volunteer</option>
                <option value="coordinator">Coordinator</option>
                <option value="volunteer">Volunteer</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Volunteers List */}
      {filteredVolunteers.length === 0 ? (
        <div className="text-center py-12">
          <UserCheck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No volunteers found</h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || statusFilter !== 'all' || roleFilter !== 'all' 
              ? 'Try adjusting your search or filters' 
              : 'Invite your first volunteer to get started'}
          </p>
          {!searchTerm && statusFilter === 'all' && roleFilter === 'all' && (
            <Button
              onClick={() => router.push(`/${lang}/admin/users/volunteers/invite`)}
              className="bg-[#3A7F3F] hover:bg-green-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Invite First Volunteer
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredVolunteers.map((volunteer) => (
            <div key={volunteer.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {volunteer.firstName} {volunteer.lastName}
                    </h3>
                    
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(volunteer.status)}`}>
                      {getStatusIcon(volunteer.status)}
                      <span className="ml-1 capitalize">{volunteer.status}</span>
                    </span>
                    
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(volunteer.role)}`}>
                      {getRoleIcon(volunteer.role)}
                      <span className="capitalize">{volunteer.role.replace('_', ' ')}</span>
                    </span>

                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getVerificationColor(volunteer.verificationStatus)}`}>
                      <span className="capitalize">{volunteer.verificationStatus}</span>
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center">
                      <Mail className="w-4 h-4 mr-2" />
                      <span>{volunteer.email}</span>
                    </div>
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 mr-2" />
                      <span>{volunteer.phone}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <Button
                    onClick={() => router.push(`/${lang}/admin/users/volunteers/${volunteer.id}`)}
                    variant="outline"
                    className="text-xs py-1 px-3"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    View
                  </Button>
                  
                  <Button
                    onClick={() => router.push(`/${lang}/admin/users/volunteers/${volunteer.id}/edit`)}
                    variant="outline"
                    className="text-xs py-1 px-3"
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="text-xs py-1 px-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* Volunteer Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>Experience: {volunteer.experience.years} years</span>
                </div>
                
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span>Venues: {volunteer.assignedVenues.length}</span>
                </div>
                
                <div className="flex items-center text-sm text-gray-600">
                  <Users className="w-4 h-4 mr-2" />
                  <span>Sports: {volunteer.assignedSports.length}</span>
                </div>
                
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>Available: {volunteer.availability.dates.length} days</span>
                </div>
              </div>

              {/* Skills and Assignments */}
              <div className="space-y-3">
                {/* Skills */}
                <div className="flex items-start space-x-2">
                  <span className="text-sm font-medium text-gray-700 mt-1">Skills:</span>
                  <div className="flex flex-wrap gap-1">
                    {volunteer.skills.map((skill, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Assigned Sports */}
                {volunteer.assignedSports.length > 0 && (
                  <div className="flex items-start space-x-2">
                    <span className="text-sm font-medium text-gray-700 mt-1">Assigned Sports:</span>
                    <div className="flex flex-wrap gap-1">
                      {volunteer.assignedSports.map((sport, index) => (
                        <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {sport}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Experience */}
                {volunteer.experience.previousEvents.length > 0 && (
                  <div className="flex items-start space-x-2">
                    <span className="text-sm font-medium text-gray-700 mt-1">Previous Events:</span>
                    <div className="flex flex-wrap gap-1">
                      {volunteer.experience.previousEvents.map((event, index) => (
                        <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {event}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {volunteers.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Volunteers Overview</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-[#3A7F3F]">
                {volunteers.length}
              </div>
              <div className="text-sm text-gray-600">Total Volunteers</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {volunteers.filter(v => v.status === 'active').length}
              </div>
              <div className="text-sm text-gray-600">Active</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {volunteers.filter(v => v.status === 'pending').length}
              </div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {volunteers.filter(v => v.role === 'head_volunteer').length}
              </div>
              <div className="text-sm text-gray-600">Head Volunteers</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-[#F28C38]">
                {volunteers.filter(v => v.verificationStatus === 'verified').length}
              </div>
              <div className="text-sm text-gray-600">Verified</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
