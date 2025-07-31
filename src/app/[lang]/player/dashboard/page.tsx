"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { useTranslation } from "@/lib/utils/i18n";
import Image from "next/image";
import { 
  Users, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  User,
  Trophy,
  MapPin,
  Phone,
  Calendar,
  Edit,
  FileText,
  Upload,
  Eye
} from "lucide-react";

interface TeamMembership {
  teamId: string;
  teamName: string;
  sportId: string;
  captainName: string;
  captainPhone: string;
  position: string;
  status: string;
  verificationStatus: string;
  joinedAt: string;
  panchayat: string;
  district: string;
  gender: string;
}

interface PlayerStats {
  totalTeams: number;
  verifiedTeams: number;
  pendingTeams: number;
  documentsComplete: boolean;
}

export default function PlayerDashboard() {
  const [teams, setTeams] = useState<TeamMembership[]>([]);
  const [stats, setStats] = useState<PlayerStats>({
    totalTeams: 0,
    verifiedTeams: 0,
    pendingTeams: 0,
    documentsComplete: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const router = useRouter();
  const { lang } = useParams();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push(`/${lang}/login`);
      return;
    }

    if (!userProfile?.isProfileComplete) {
      router.push(`/${lang}/complete-profile`);
      return;
    }

    loadPlayerData();
  }, [user, userProfile, authLoading, router, lang]);

  const loadPlayerData = async () => {
    if (!user) return;

    try {
      // Load teams where current user is a player
      const teamsQuery = query(collection(db, "teams"));
      const querySnapshot = await getDocs(teamsQuery);
      
      const playerTeams: TeamMembership[] = [];
      
      querySnapshot.forEach((docSnapshot) => {
        const teamData = docSnapshot.data();
        const players = teamData.players || [];
        
        // Check if current user is in this team's players
        const playerData = players.find((p: any) => p.userId === user.uid);
        
        if (playerData) {
          playerTeams.push({
            teamId: docSnapshot.id,
            teamName: teamData.teamName || '',
            sportId: teamData.sportId || teamData.sport || '',
            captainName: teamData.captainName || '',
            captainPhone: teamData.captainPhone || '',
            position: playerData.position || 'main',
            status: teamData.status || 'draft',
            verificationStatus: playerData.verificationStatus || 'pending',
            joinedAt: playerData.addedAt || teamData.createdAt || '',
            panchayat: teamData.panchayat || '',
            district: teamData.district || '',
            gender: teamData.gender || 'M'
          });
        }
      });

      setTeams(playerTeams);
      
      // Check document completeness
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.data();
      const documents = userData?.documents || {};
      const documentsComplete = !!(
        documents.profilePhoto?.url && 
        documents.aadhaarFront?.url && 
        documents.aadhaarBack?.url
      );
      
      // Calculate stats
      const newStats: PlayerStats = {
        totalTeams: playerTeams.length,
        verifiedTeams: playerTeams.filter(t => t.verificationStatus === 'approved').length,
        pendingTeams: playerTeams.filter(t => t.verificationStatus === 'pending').length,
        documentsComplete
      };
      
      setStats(newStats);
    } catch (err: any) {
      console.error("Error loading player data:", err);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleViewTeam = (teamId: string) => {
    router.push(`/${lang}/player/teams/${teamId}`);
  };

  const handleUpdateProfile = () => {
    router.push(`/${lang}/profile/edit`);
  };

  const handleUploadDocuments = () => {
    router.push(`/${lang}/profile/documents`);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <Edit className="w-5 h-5 text-gray-600" />;
      case 'submitted':
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'verified':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'rejected':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'submitted':
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'verified':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getVerificationStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-4">
            <Image 
              src="https://ishalogin.sadhguru.org/app/images/3e8fd38d1d957c44372b.svg" 
              alt="Isha Logo" 
              width={80} 
              height={80} 
              className="mx-auto"
            />
          </div>
          <h1 className="text-3xl font-bold text-[#4A2F1D] mb-2">
            Player Dashboard
          </h1>
          <p className="text-gray-600">
            Welcome back, {userProfile?.firstName || 'Player'}! Track your team memberships and profile.
          </p>
        </div>

        {/* Alert for incomplete documents */}
        {!stats.documentsComplete && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-yellow-600 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-yellow-800">
                  Complete Your Profile
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Upload your documents (Profile Photo, Aadhaar Front & Back) to participate in teams.
                </p>
              </div>
              <button
                onClick={handleUploadDocuments}
                className="ml-auto bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Upload Documents
              </button>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="w-8 h-8 text-[#F28C38]" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Teams Joined</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalTeams}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Verified</p>
                <p className="text-2xl font-bold text-gray-900">{stats.verifiedTeams}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingTeams}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className={`w-8 h-8 ${stats.documentsComplete ? 'text-green-600' : 'text-red-600'}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Documents</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.documentsComplete ? 'Complete' : 'Incomplete'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center mb-4">
              <User className="w-6 h-6 text-[#F28C38] mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Profile</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div><span className="font-medium">Name:</span> {userProfile?.firstName} {userProfile?.lastName}</div>
              <div><span className="font-medium">Phone:</span> +91 {userProfile?.phoneNumber}</div>
              <div><span className="font-medium">Village:</span> {userProfile?.village || 'Not specified'}</div>
              <div><span className="font-medium">District:</span> {userProfile?.district || 'Not specified'}</div>
            </div>
            <button
              onClick={handleUpdateProfile}
              className="w-full mt-4 bg-[#F28C38] hover:bg-[#E67A26] text-white py-2 px-4 rounded-lg font-medium transition-colors"
            >
              Update Profile
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center mb-4">
              <Upload className="w-6 h-6 text-blue-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Documents</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Profile Photo:</span>
                <span className={stats.documentsComplete ? 'text-green-600' : 'text-red-600'}>
                  {stats.documentsComplete ? '✓' : '✗'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Aadhaar Front:</span>
                <span className={stats.documentsComplete ? 'text-green-600' : 'text-red-600'}>
                  {stats.documentsComplete ? '✓' : '✗'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Aadhaar Back:</span>
                <span className={stats.documentsComplete ? 'text-green-600' : 'text-red-600'}>
                  {stats.documentsComplete ? '✓' : '✗'}
                </span>
              </div>
            </div>
            <button
              onClick={handleUploadDocuments}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
            >
              {stats.documentsComplete ? 'View Documents' : 'Upload Documents'}
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center mb-4">
              <Trophy className="w-6 h-6 text-purple-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Event Info</h3>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <div>Gramotsavam 2025</div>
              <div>Rural Sports Festival</div>
              <div>Karnataka State</div>
            </div>
            <button className="w-full mt-4 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg font-medium transition-colors">
              View Event Details
            </button>
          </div>
        </div>

        {/* Teams Section */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-[#4A2F1D]">Your Teams</h2>
          </div>

          {teams.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No team memberships
              </h3>
              <p className="text-gray-600 mb-4">
                You haven't joined any teams yet. Contact team captains to get added to teams.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Team</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Sport</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Position</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Captain</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Verification</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {teams.map((team) => (
                      <tr key={team.teamId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-semibold text-gray-900">{team.teamName}</div>
                            <div className="text-sm text-gray-600">{team.panchayat}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <div className="text-gray-900 capitalize">{team.sportId}</div>
                            <div className="text-gray-600">{team.gender === 'F' ? 'Women' : 'Men'}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            team.position === 'main' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {team.position === 'main' ? 'Main' : 'Substitute'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <div className="text-gray-900">{team.captainName}</div>
                            <div className="text-gray-600">+91 {team.captainPhone}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            {getStatusIcon(team.status)}
                            <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(team.status)}`}>
                              {team.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getVerificationStatusColor(team.verificationStatus)}`}>
                            {team.verificationStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleViewTeam(team.teamId)}
                            className="text-[#F28C38] hover:text-[#E67A26] font-medium text-sm transition-colors flex items-center"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-gray-200">
                {teams.map((team) => (
                  <div key={team.teamId} className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{team.teamName}</h3>
                        <p className="text-sm text-gray-600">{team.sportId} • {team.gender === 'F' ? 'Women' : 'Men'}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(team.status)}
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(team.status)}`}>
                          {team.status}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-1 text-sm text-gray-600 mb-3">
                      <div><span className="font-medium">Position:</span> {team.position}</div>
                      <div><span className="font-medium">Captain:</span> {team.captainName} (+91 {team.captainPhone})</div>
                      <div><span className="font-medium">Location:</span> {team.panchayat}</div>
                      <div><span className="font-medium">Verification:</span> 
                        <span className={`ml-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getVerificationStatusColor(team.verificationStatus)}`}>
                          {team.verificationStatus}
                        </span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleViewTeam(team.teamId)}
                      className="w-full bg-[#F28C38] hover:bg-[#E67A26] text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Team
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}