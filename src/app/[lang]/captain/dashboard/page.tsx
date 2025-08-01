"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { useTranslation } from "@/lib/utils/i18n";
import Image from "next/image";
import { 
  Users, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Plus, 
  Eye, 
  Edit,
  Trophy,
  MapPin,
  Phone,
  Calendar,
  UserCheck
} from "lucide-react";

interface TeamData {
  id: string;
  teamName: string;
  sportId: string;
  captainName: string;
  captainPhone: string;
  panchayat: string;
  district: string;
  state: string;
  players: any[];
  maxPlayers: number;
  status: string;
  submittedAt: string;
  createdAt: string;
  gender: string;
  eventId: string;
}

interface DashboardStats {
  totalTeams: number;
  activeTeams: number;
  verifiedTeams: number;
  pendingTeams: number;
  totalPlayers: number;
}

export default function CaptainDashboard() {
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalTeams: 0,
    activeTeams: 0,
    verifiedTeams: 0,
    pendingTeams: 0,
    totalPlayers: 0
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

    loadCaptainData();
  }, [user, userProfile, authLoading, router, lang]);

  const loadCaptainData = async () => {
    if (!user) return;

    try {
      // Load teams where current user is the captain
      const teamsQuery = query(
        collection(db, "teams"),
        where("captainId", "==", user.uid)
      );
      
      const querySnapshot = await getDocs(teamsQuery);
      const teamsData: TeamData[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        teamsData.push({
          id: doc.id,
          teamName: data.teamName || '',
          sportId: data.sportId || data.sport || '',
          captainName: data.captainName || '',
          captainPhone: data.captainPhone || '',
          panchayat: data.panchayat || '',
          district: data.district || '',
          state: data.state || '',
          players: data.players || [],
          maxPlayers: data.maxPlayers || 12,
          status: data.status || 'draft',
          submittedAt: data.submittedAt || '',
          createdAt: data.createdAt || '',
          gender: data.gender || 'M',
          eventId: data.eventId || 'gramotsavam_2025'
        });
      });

      // Sort teams by creation date (newest first)
      teamsData.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate?.() ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB.getTime() - dateA.getTime();
      });

      setTeams(teamsData);
      
      // Calculate stats
      const totalPlayers = teamsData.reduce((sum, team) => sum + team.currentPlayers, 0);
      const newStats: DashboardStats = {
        totalTeams: teamsData.length,
        activeTeams: teamsData.filter(t => t.status !== 'draft').length,
        verifiedTeams: teamsData.filter(t => t.status === 'verified').length,
        pendingTeams: teamsData.filter(t => t.status === 'submitted' || t.status === 'pending').length,
        totalPlayers
      };
      
      setStats(newStats);
    } catch (err: any) {
      console.error("Error loading captain data:", err);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = () => {
    router.push(`/${lang}/captain/teams/create`);
  };

  const handleViewTeam = (teamId: string) => {
    router.push(`/${lang}/captain/teams/${teamId}/players/invite`);
  };

  const handleEditTeam = (teamId: string) => {
    router.push(`/${lang}/captain/teams/${teamId}/edit`);
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

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Draft';
      case 'submitted':
        return 'Submitted';
      case 'pending':
        return 'Under Review';
      case 'verified':
        return 'Verified';
      case 'rejected':
        return 'Rejected';
      default:
        return status;
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
            Captain Dashboard
          </h1>
          <p className="text-gray-600">
            Welcome back, {userProfile?.firstName || 'Captain'}! Manage your teams and players.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="w-8 h-8 text-[#F28C38]" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Teams</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalTeams}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Trophy className="w-8 h-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Teams</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeTeams}</p>
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
                <UserCheck className="w-8 h-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Players</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalPlayers}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Teams Section */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-[#4A2F1D]">Your Teams</h2>
              <button
                onClick={handleCreateTeam}
                className="bg-[#F28C38] hover:bg-[#E67A26] text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Team
              </button>
            </div>
          </div>

          {teams.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No teams yet
              </h3>
              <p className="text-gray-600 mb-4">
                Create your first team to get started with Gramotsavam 2025
              </p>
              <button
                onClick={handleCreateTeam}
                className="bg-[#F28C38] hover:bg-[#E67A26] text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Create Team
              </button>
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
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Players</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Created</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {teams.map((team) => (
                      <tr key={team.id} className="hover:bg-gray-50 transition-colors">
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
                          <div className="text-sm text-gray-900">
                            {team.players.length} / {team.maxPlayers}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            {getStatusIcon(team.status)}
                            <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(team.status)}`}>
                              {getStatusText(team.status)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {team.createdAt ? new Date(team.createdAt).toLocaleDateString() : 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleViewTeam(team.id)}
                              className="text-[#F28C38] hover:text-[#E67A26] font-medium text-sm transition-colors flex items-center"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </button>
                            {team.status === 'draft' && (
                              <button
                                onClick={() => handleEditTeam(team.id)}
                                className="text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors flex items-center"
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                Edit
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-gray-200">
                {teams.map((team) => (
                  <div key={team.id} className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{team.teamName}</h3>
                        <p className="text-sm text-gray-600">{team.sportId} • {team.gender === 'F' ? 'Women' : 'Men'}</p>
                      </div>
                      <div className="flex items-center">
                        {getStatusIcon(team.status)}
                        <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(team.status)}`}>
                          {getStatusText(team.status)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-1 text-sm text-gray-600 mb-3">
                      <div><span className="font-medium">Location:</span> {team.panchayat}</div>
                      <div><span className="font-medium">Players:</span> {team.players.length} / {team.maxPlayers}</div>
                      <div><span className="font-medium">Created:</span> {team.createdAt ? new Date(team.createdAt).toLocaleDateString() : 'N/A'}</div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewTeam(team.id)}
                        className="flex-1 bg-[#F28C38] hover:bg-[#E67A26] text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Team
                      </button>
                      {team.status === 'draft' && (
                        <button
                          onClick={() => handleEditTeam(team.id)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </button>
                      )}
                    </div>
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
