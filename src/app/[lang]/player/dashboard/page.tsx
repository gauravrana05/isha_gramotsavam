"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { useTranslation } from "@/lib/utils/i18n";
import Image from "next/image";
import { PageLoader } from "@/components/ui/loaders";
import { 
  Users, 
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
  name: string;
  sportName: string;
  captainProfile: {
    name: string;
    phone: string;
  };
  position: string;
  status: string;
  verificationStatus: string;
  joinedAt: any;
  panchayat: string;
  district: string;
  genderCategory: string;
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
      router.push(`/${lang}/profile/complete`);
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
            name: teamData.name || teamData.teamName || '',
            sportName: teamData.sportName || teamData.sportId || '',
            captainProfile: {
              name: teamData.captainProfile?.name || teamData.captainName || '',
              phone: teamData.captainProfile?.phone || teamData.captainPhone || ''
            },
            position: playerData.position || 'main',
            status: teamData.status || 'draft',
            verificationStatus: playerData.verificationStatus || 'pending',
            joinedAt: playerData.addedAt || teamData.createdAt || '',
            panchayat: teamData.panchayat || '',
            district: teamData.district || '',
            genderCategory: teamData.genderCategory || teamData.gender || 'mixed'
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
    router.push(`/${lang}/profile`);
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
      <PageLoader 
        title={t('loading_player_dashboard', 'Loading Player Dashboard...')}
        variant="brand"
        size="lg"
      />
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('error', 'Error')}</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors"
          >
            {t('retry', 'Retry')}
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
            {t('player_dashboard', 'Player Dashboard')}
          </h1>
          <p className="text-gray-600">
            {t('welcome_back_player', 'Welcome back, {name}! Track your team memberships and profile.').replace('{name}', userProfile?.firstName || 'Player')}
          </p>
        </div>

        {/* Alert for incomplete documents */}
        {!stats.documentsComplete && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-yellow-800 font-fira">
                  {t('complete_your_profile', 'Complete Your Profile')}
                </h3>
                <p className="text-sm text-yellow-700 mt-1 font-fira">
                  {t('upload_documents_message', 'Upload your documents (Profile Photo, Aadhaar Front & Back) to participate in teams.')}
                </p>
              </div>
              <button
                onClick={handleUploadDocuments}
                className="w-full sm:w-auto bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {t('upload_documents', 'Upload Documents')}
              </button>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">{t('teams', 'Teams')}</p>
                <p className="text-2xl font-bold text-[#4A2F1D]">{stats.totalTeams}</p>
              </div>
              <Users className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">{t('verified', 'Verified')}</p>
                <p className="text-2xl font-bold text-green-600">{stats.verifiedTeams}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">{t('pending', 'Pending')}</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pendingTeams}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-400" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">{t('documents', 'Documents')}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.documentsComplete ? '✓' : '✗'}
                </p>
              </div>
              <FileText className={`w-8 h-8 ${stats.documentsComplete ? 'text-green-400' : 'text-red-400'}`} />
            </div>
          </div>
        </div>


        {/* Teams Section */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h2 className="text-lg sm:text-xl font-semibold text-[#4A2F1D]">{t('your_teams', 'Your Teams')}</h2>
          </div>

          {teams.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 font-fira mb-2">
                {t('no_team_memberships', 'No team memberships')}
              </h3>
              <p className="text-gray-600 font-fira mb-4">
                {t('no_team_memberships_message', "You haven't joined any teams yet. Contact team captains to get added to teams.")}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('team', 'Team')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('sport', 'Sport')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('captain', 'Captain')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('location', 'Location')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('status', 'Status')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('joined', 'Joined')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('actions', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {teams.map((team) => (
                      <tr key={team.teamId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{team.name}</div>
                          <div className="text-xs text-gray-500 capitalize">{team.genderCategory}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {team.sportName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{team.captainProfile.name}</div>
                          <div className="text-xs text-gray-500">{team.captainProfile.phone}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{team.panchayat}</div>
                          <div className="text-xs text-gray-500">{team.district}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(team.status)}`}>
                            {getStatusIcon(team.status)}
                            <span className="ml-1 capitalize">{team.status.replace('_', ' ')}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {team.joinedAt ? team.joinedAt.toDate?.() ? team.joinedAt.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date(team.joinedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : t('unknown', 'Unknown')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleViewTeam(team.teamId)}
                            className="text-[#F28C38] hover:text-[#E67A26] font-medium text-sm flex items-center"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            {t('view', 'View')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4 p-4">
                {teams.map((team) => (
                  <div key={team.teamId} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{team.name}</h3>
                        <p className="text-sm text-gray-600">{team.sportName} • {team.genderCategory}</p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(team.status)}`}>
                        {getStatusIcon(team.status)}
                        <span className="ml-1 capitalize">{team.status.replace('_', ' ')}</span>
                      </span>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <div><strong>{t('captain', 'Captain')}:</strong> {team.captainProfile.name}</div>
                      <div><strong>{t('phone', 'Phone')}:</strong> +91 {team.captainProfile.phone}</div>
                      <div><strong>{t('location', 'Location')}:</strong> {team.panchayat}, {team.district}</div>
                      <div><strong>{t('joined', 'Joined')}:</strong> {team.joinedAt ? team.joinedAt.toDate?.() ? team.joinedAt.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date(team.joinedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : t('unknown', 'Unknown')}</div>
                    </div>

                    <button
                      onClick={() => handleViewTeam(team.teamId)}
                      className="w-full bg-[#F28C38] hover:bg-[#E67A26] text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      {t('view_team', 'View Team')}
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