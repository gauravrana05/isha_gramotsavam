'use client';

import Image from 'next/image';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
// import { db } from '@/lib/firebase/config';
// import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { 
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  FileText,
  Users,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface UserData {
  uid: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  whatsappNumber?: string;
  email?: string;
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
      uploadedBy?: string;
    };
    aadhaarFront?: {
      url?: string;
      verified: boolean;
      uploadedAt?: any;
      uploadedBy?: string;
    };
    aadhaarBack?: {
      url?: string;
      verified: boolean;
      uploadedAt?: any;
      uploadedBy?: string;
    };
  };
  createdAt?: any;
  updatedAt?: any;
}

interface TeamData {
  id: string;
  name: string;
  sportName: string;
  status: string;
  role: string; // captain or player
}

export default function UserDetailPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const router = useRouter();
  const { lang, userId } = useParams();
  const { user: currentUser, userProfile, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    
    if (!currentUser) {
      router.push(`/${lang}/login`);
      return;
    }

    if (userProfile?.role !== 'admin') {
      router.push(`/${lang}/player/dashboard`);
      return;
    }

    loadUserData();
    loadUserTeams();
  }, [currentUser, userProfile, authLoading, lang, router, userId]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const userDoc = await getDoc(doc(db, 'users', userId as string));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUser({
          uid: userDoc.id,
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          phoneNumber: userData.phoneNumber || '',
          whatsappNumber: userData.whatsappNumber,
          email: userData.email,
          dob: userData.dob,
          gender: userData.gender,
          village: userData.village,
          panchayat: userData.panchayat,
          taluk: userData.taluk,
          district: userData.district,
          state: userData.state,
          pincode: userData.pincode,
          role: userData.role || 'public',
          currentTeamId: userData.currentTeamId,
          isProfileComplete: userData.isProfileComplete || false,
          documents: userData.documents || {},
          createdAt: userData.createdAt,
          updatedAt: userData.updatedAt
        });
      } else {
        setError('User not found');
      }
    } catch (err: any) {
      // Error handling removed
      setError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const loadUserTeams = async () => {
    try {
      // Load teams where user is captain
      const captainTeamsQuery = query(
        collection(db, 'teams'),
        where('captainId', '==', userId)
      );
      const captainTeamsSnapshot = await getDocs(captainTeamsQuery);
      
      const userTeams: TeamData[] = [];
      
      // Add captain teams
      captainTeamsSnapshot.docs.forEach(doc => {
        const team = doc.data();
        userTeams.push({
          id: doc.id,
          name: team.name || '',
          sportName: team.sportName || '',
          status: team.status || 'draft',
          role: 'captain'
        });
      });

      // Load teams where user is a player
      const allTeamsQuery = query(collection(db, 'teams'));
      const allTeamsSnapshot = await getDocs(allTeamsQuery);
      
      allTeamsSnapshot.docs.forEach(doc => {
        const team = doc.data();
        const players = team.players || [];
        const playerData = players.find((p: any) => p.userId === userId);
        
        if (playerData && !userTeams.find(t => t.id === doc.id)) {
          userTeams.push({
            id: doc.id,
            name: team.name || '',
            sportName: team.sportName || '',
            status: team.status || 'draft',
            role: 'player'
          });
        }
      });

      setTeams(userTeams);
    } catch (err: any) {
      // Error handling removed
    }
  };

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-green-100 text-green-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDocumentStatus = (doc?: { url?: string; verified: boolean }) => {
    if (!doc?.url) {
      return { status: 'missing', color: 'text-red-600', icon: <XCircle width={64} height={64} className="w-4 h-4" /> };
    }
    if (doc.verified) {
      return { status: 'verified', color: 'text-green-600', icon: <CheckCircle width={64} height={64} className="w-4 h-4" /> };
    }
    return { status: 'pending', color: 'text-yellow-600', icon: <Clock width={64} height={64} className="w-4 h-4" /> };
  };

  if (authLoading || loading) {
    return (
      <div className="lg:min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 width={64} height={64} className="w-8 h-8 animate-spin text-[#F28C38]" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="lg:min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle width={64} height={64} className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-4">{error || 'User not found'}</p>
          <button 
            onClick={() => router.push(`/${lang}/admin/users`)}
            className="bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors"
          >
            Back to Users
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push(`/${lang}/admin/users`)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft width={64} height={64} className="w-4 h-4 mr-2" />
          Back to Users
        </button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold font-fira mb-2 text-[#4A2F1D]">
              {user.firstName} {user.lastName}
            </h1>
            <p className="text-sm sm:text-base text-gray-600 font-fira">
              User Details and Activity
            </p>
          </div>
          
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(user.role)}`}>
            <Shield width={64} height={64} className="w-4 h-4 mr-1" />
            {user.role.replace('_', ' ').charAt(0).toUpperCase() + user.role.replace('_', ' ').slice(1)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Personal Information */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <User width={64} height={64} className="w-5 h-5 mr-2 text-[#F28C38]" />
              Personal Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Full Name</label>
                <p className="text-gray-900">{user.firstName} {user.lastName}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Gender</label>
                <p className="text-gray-900">
                  {user.gender === 'M' ? 'Male' : user.gender === 'F' ? 'Female' : user.gender === 'O' ? 'Other' : 'Not specified'}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Date of Birth</label>
                <p className="text-gray-900">{user.dob || 'Not provided'}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Phone Number</label>
                <p className="text-gray-900">{user.phoneNumber}</p>
              </div>
              
              {user.whatsappNumber && user.whatsappNumber !== user.phoneNumber && (
                <div>
                  <label className="text-sm font-medium text-gray-500">WhatsApp Number</label>
                  <p className="text-gray-900">{user.whatsappNumber}</p>
                </div>
              )}
              
              {user.email && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-gray-900">{user.email}</p>
                </div>
              )}
            </div>
          </div>

          {/* Address Information */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <MapPin width={64} height={64} className="w-5 h-5 mr-2 text-[#F28C38]" />
              Address Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Village</label>
                <p className="text-gray-900">{user.village || 'Not provided'}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Panchayat</label>
                <p className="text-gray-900">{user.panchayat || 'Not provided'}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Taluk</label>
                <p className="text-gray-900">{user.taluk || 'Not provided'}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">District</label>
                <p className="text-gray-900">{user.district || 'Not provided'}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">State</label>
                <p className="text-gray-900">{user.state || 'Not provided'}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Pincode</label>
                <p className="text-gray-900">{user.pincode || 'Not provided'}</p>
              </div>
            </div>
          </div>

          {/* Teams */}
          {teams.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Users width={64} height={64} className="w-5 h-5 mr-2 text-[#F28C38]" />
                Teams ({teams.length})
              </h2>
              
              <div className="space-y-3">
                {teams.map((team) => (
                  <div key={team.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div>
                      <h3 className="font-medium text-gray-900">{team.name}</h3>
                      <p className="text-sm text-gray-600">{team.sportName}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        team.role === 'captain' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {team.role}
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(team.status)}`}>
                        {team.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          
          {/* Account Status */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Status</h2>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Profile Complete</span>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  user.isProfileComplete ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {user.isProfileComplete ? 'Complete' : 'Incomplete'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Member Since</span>
                <span className="text-sm text-gray-900">
                  {user.createdAt ? 
                    user.createdAt.toDate?.() ? 
                      user.createdAt.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 
                      new Date(user.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 
                    'Unknown'
                  }
                </span>
              </div>
              
              {user.updatedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Last Updated</span>
                  <span className="text-sm text-gray-900">
                    {user.updatedAt.toDate?.() ? 
                      user.updatedAt.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 
                      new Date(user.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                    }
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Documents */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FileText width={64} height={64} className="w-5 h-5 mr-2 text-[#F28C38]" />
              Documents
            </h2>
            
            <div className="space-y-4">
              {/* Profile Photo */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Profile Photo</p>
                  <div className="flex items-center mt-1">
                    {getDocumentStatus(user.documents?.profilePhoto).icon}
                    <span className={`ml-1 text-xs ${getDocumentStatus(user.documents?.profilePhoto).color}`}>
                      {getDocumentStatus(user.documents?.profilePhoto).status}
                    </span>
                  </div>
                </div>
                {user.documents?.profilePhoto?.url && (
                  <button
                    onClick={() => setSelectedImage(user.documents?.profilePhoto?.url || '')}
                    className="text-[#F28C38] hover:text-[#E67A26] text-sm flex items-center"
                  >
                    <Eye width={64} height={64} className="w-4 h-4 mr-1" />
                    View
                  </button>
                )}
              </div>

              {/* Aadhaar Front */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Aadhaar Front</p>
                  <div className="flex items-center mt-1">
                    {getDocumentStatus(user.documents?.aadhaarFront).icon}
                    <span className={`ml-1 text-xs ${getDocumentStatus(user.documents?.aadhaarFront).color}`}>
                      {getDocumentStatus(user.documents?.aadhaarFront).status}
                    </span>
                  </div>
                </div>
                {user.documents?.aadhaarFront?.url && (
                  <button
                    onClick={() => setSelectedImage(user.documents?.aadhaarFront?.url || '')}
                    className="text-[#F28C38] hover:text-[#E67A26] text-sm flex items-center"
                  >
                    <Eye width={64} height={64} className="w-4 h-4 mr-1" />
                    View
                  </button>
                )}
              </div>

              {/* Aadhaar Back */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Aadhaar Back</p>
                  <div className="flex items-center mt-1">
                    {getDocumentStatus(user.documents?.aadhaarBack).icon}
                    <span className={`ml-1 text-xs ${getDocumentStatus(user.documents?.aadhaarBack).color}`}>
                      {getDocumentStatus(user.documents?.aadhaarBack).status}
                    </span>
                  </div>
                </div>
                {user.documents?.aadhaarBack?.url && (
                  <button
                    onClick={() => setSelectedImage(user.documents?.aadhaarBack?.url || '')}
                    className="text-[#F28C38] hover:text-[#E67A26] text-sm flex items-center"
                  >
                    <Eye width={64} height={64} className="w-4 h-4 mr-1" />
                    View
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
            >
              <XCircle width={64} height={64} className="w-8 h-8" />
            </button>
            <Image
              src={selectedImage}
              alt="Document"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}
