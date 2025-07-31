"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { useTranslation } from "@/lib/utils/i18n";
import Image from "next/image";
import { Users, Loader2, AlertCircle, CheckCircle, Clock, X, Eye, Filter } from "lucide-react";

interface TeamData {
  id: string;
  teamName: string;
  sportId: string;
  captainName: string;
  captainPhone: string;
  panchayat: string;
  district: string;
  state: string;
  playersCount: number;
  maxPlayers: number;
  status: string;
  submittedAt: string;
  gender: string;
  eventId: string;
}

export default function VerificationTeamsPage() {
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [filteredTeams, setFilteredTeams] = useState<TeamData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");

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

    if (userProfile.role !== 'verification_volunteer' && userProfile.role !== 'admin') {
      router.push(`/${lang}/player/dashboard`);
      return;
    }

    loadTeams();
  }, [user, userProfile, authLoading, router, lang]);

  const loadTeams = async () => {
    try {
      const teamsQuery = query(
        collection(db, "teams"),
        where("status", "in", ["submitted", "pending", "partial_verification"]),
        orderBy("submittedAt", "desc")
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
          playersCount: data.players?.length || 0,
          maxPlayers: data.maxPlayers || 12,
          status: data.status || 'pending',
          submittedAt: data.submittedAt || data.createdAt || '',
          gender: data.gender || 'M',
          eventId: data.eventId || 'gramotsavam_2025'
        });
      });

      setTeams(teamsData);
      applyFilters(teamsData, selectedFilter, searchQuery);
    } catch (err: any) {
      console.error("Error loading teams:", err);
      setError("Failed to load teams data");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (teamsData: TeamData[], filter: string, search: string) => {
    let filtered = [...teamsData];

    // Apply status filter
    if (filter !== 'all') {
      switch (filter) {
        case 'pending':
          filtered = filtered.filter(t => t.status === 'submitted' || t.status === 'pending');
          break;
        case 'partial':
          filtered = filtered.filter(t => t.status === 'partial_verification');
          break;
      }
    }

    // Apply search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(t => 
        t.teamName.toLowerCase().includes(searchLower) ||
        t.captainName.toLowerCase().includes(searchLower) ||
        t.panchayat.toLowerCase().includes(searchLower) ||
        t.district.toLowerCase().includes(searchLower) ||
        t.sportId.toLowerCase().includes(searchLower)
      );
    }

    setFilteredTeams(filtered);
  };

  const handleFilterChange = (filter: string) => {
    setSelectedFilter(filter);
    applyFilters(teams, filter, searchQuery);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    applyFilters(teams, selectedFilter, query);
  };

  const handleTeamClick = (teamId: string) => {
    router.push(`/${lang}/verification/teams/${teamId}`);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted':
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'partial_verification':
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
      case 'verified':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'rejected':
        return <X className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'partial_verification':
        return 'bg-orange-100 text-orange-800';
      case 'verified':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
            onClick={() => router.push(`/${lang}/verification/dashboard`)}
            className="bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const pendingCount = teams.filter(t => t.status === 'submitted' || t.status === 'pending').length;
  const partialCount = teams.filter(t => t.status === 'partial_verification').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push(`/${lang}/verification/dashboard`)}
            className="flex items-center text-[#F28C38] hover:text-[#E67A26] mb-6 transition-colors"
          >
            ← Back to Dashboard
          </button>
          
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
              Teams Verification
            </h1>
            <p className="text-gray-600">
              Review and verify team registrations
            </p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => handleFilterChange('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedFilter === 'all' 
                    ? 'bg-[#F28C38] text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All ({teams.length})
              </button>
              <button
                onClick={() => handleFilterChange('pending')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedFilter === 'pending' 
                    ? 'bg-[#F28C38] text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Pending ({pendingCount})
              </button>
              <button
                onClick={() => handleFilterChange('partial')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedFilter === 'partial' 
                    ? 'bg-[#F28C38] text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Partial ({partialCount})
              </button>
            </div>
            
            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search teams, captains, or locations..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28C38] focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Teams Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-[#4A2F1D] flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Teams ({filteredTeams.length})
            </h2>
          </div>

          {filteredTeams.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No teams found
              </h3>
              <p className="text-gray-600">
                {searchQuery || selectedFilter !== 'all' 
                  ? "Try adjusting your search or filter criteria."
                  : "No teams are pending verification."
                }
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
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Captain</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Location</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Players</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredTeams.map((team) => (
                      <tr key={team.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-semibold text-gray-900">{team.teamName}</div>
                            <div className="text-sm text-gray-600">{team.sportId} • {team.gender === 'F' ? 'Women' : 'Men'}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <div className="text-gray-900">{team.captainName}</div>
                            <div className="text-gray-600">+91 {team.captainPhone}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <div className="text-gray-900">{team.panchayat}</div>
                            <div className="text-gray-600">{team.district}, {team.state}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {team.playersCount} / {team.maxPlayers}
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
                          <button
                            onClick={() => handleTeamClick(team.id)}
                            className="text-[#F28C38] hover:text-[#E67A26] font-medium text-sm transition-colors flex items-center"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-gray-200">
                {filteredTeams.map((team) => (
                  <div key={team.id} className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{team.teamName}</h3>
                        <p className="text-sm text-gray-600">{team.sportId} • {team.gender === 'F' ? 'Women' : 'Men'}</p>
                      </div>
                      <div className="flex items-center">
                        {getStatusIcon(team.status)}
                        <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(team.status)}`}>
                          {team.status}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-1 text-sm text-gray-600 mb-3">
                      <div><span className="font-medium">Captain:</span> {team.captainName} (+91 {team.captainPhone})</div>
                      <div><span className="font-medium">Location:</span> {team.panchayat}, {team.district}</div>
                      <div><span className="font-medium">Players:</span> {team.playersCount} / {team.maxPlayers}</div>
                    </div>
                    
                    <button
                      onClick={() => handleTeamClick(team.id)}
                      className="w-full bg-[#F28C38] hover:bg-[#E67A26] text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Review Team
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