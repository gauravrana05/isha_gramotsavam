"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import Image from "next/image";
import { Users, Loader2, AlertCircle, Search, Filter, CheckCircle, Clock, X, Eye } from "lucide-react";

interface TeamData {
  id: string;
  name: string;
  sportName: string;
  captainProfile: {
    name: string;
    phone: string;
  };
  panchayat: string;
  district: string;
  state: string;
  currentPlayers: number;
  maxPlayers: number;
  status: string;
  submittedAt: any;
  genderCategory: string;
}

export default function VerificationDashboardPage() {
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [filteredTeams, setFilteredTeams] = useState<TeamData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const router = useRouter();
  const { lang } = useParams();
  const { user, userProfile, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;

    loadTeams();
  }, [user, userProfile, authLoading, router, lang]);

  const loadTeams = async () => {
    try {
      const teamsQuery = query(
        collection(db, "teams"), 
        orderBy("submittedAt", "desc")
      );
      
      const querySnapshot = await getDocs(teamsQuery);
      const teamsData: TeamData[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Only include teams submitted for verification
        if (data.status === 'submitted' || data.status === 'pending' || data.status === 'verified' || data.status === 'rejected' || data.status === 'partial_verification') {
          teamsData.push({
            id: doc.id,
            name: data.name || '',
            sportName: data.sportName || '',
            captainProfile: {
              name: data.captainProfile?.name || '',
              phone: data.captainProfile?.phone || ''
            },
            panchayat: data.panchayat || '',
            district: data.district || '',
            state: data.state || '',
            currentPlayers: data.currentPlayers || 0,
            maxPlayers: data.maxPlayers || 12,
            status: data.status || 'pending',
            submittedAt: data.submittedAt,
            genderCategory: data.genderCategory || 'mixed'
          });
        }
      });

      setTeams(teamsData);
      setFilteredTeams(teamsData);
    } catch (err: any) {
      console.error("Error loading teams:", err);
      setError("Failed to load teams data");
    } finally {
      setLoading(false);
    }
  };

  // Filter teams based on search and status
  useEffect(() => {
    let filtered = teams;

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(team => 
        team.name.toLowerCase().includes(searchLower) ||
        team.captainProfile.name.toLowerCase().includes(searchLower) ||
        team.panchayat.toLowerCase().includes(searchLower) ||
        team.district.toLowerCase().includes(searchLower) ||
        team.sportName.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      switch (statusFilter) {
        case 'pending':
          filtered = filtered.filter(t => t.status === 'submitted' || t.status === 'pending');
          break;
        case 'verified':
          filtered = filtered.filter(t => t.status === 'verified');
          break;
        case 'rejected':
          filtered = filtered.filter(t => t.status === 'rejected');
          break;
        case 'partial':
          filtered = filtered.filter(t => t.status === 'partial_verification');
          break;
      }
    }

    setFilteredTeams(filtered);
  }, [teams, searchTerm, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'partial_verification':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
        return <X className="w-4 h-4" />;
      case 'partial_verification':
        return <Clock className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#CE4520]" />
      </div>
    );
  }

  if (error || !user || !userProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            {error || "You don't have permission to access this page."}
          </p>
          <button 
            onClick={() => router.push(`/${lang}/player/dashboard`)}
            className="bg-[#CE4520] text-white px-6 py-2 rounded-lg hover:bg-[#1565C0] transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const stats = {
    total: teams.length,
    pending: teams.filter(t => t.status === 'submitted' || t.status === 'pending').length,
    verified: teams.filter(t => t.status === 'verified').length,
    rejected: teams.filter(t => t.status === 'rejected').length,
    partial: teams.filter(t => t.status === 'partial_verification').length
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="mb-3 sm:mb-4">
            <Image 
              src="https://ishalogin.sadhguru.org/app/images/3e8fd38d1d957c44372b.svg" 
              alt="Isha Logo" 
              width={60} 
              height={60} 
              className="mx-auto sm:w-20 sm:h-20"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold font-fira mb-2 text-[#4A2F1D]">
            Team Verification
          </h1>
          <p className="text-sm sm:text-base text-gray-600 font-fira">
            Review and verify team registrations
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total</p>
                <p className="text-2xl font-bold text-[#4A2F1D]">{stats.total}</p>
              </div>
              <Users className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-400" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Verified</p>
                <p className="text-2xl font-bold text-green-600">{stats.verified}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
              </div>
              <X className="w-8 h-8 text-red-400" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Partial</p>
                <p className="text-2xl font-bold text-orange-600">{stats.partial}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-400" />
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search teams, captains, or locations..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F28C38] focus:border-[#F28C38]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="sm:w-48">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select
                  className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F28C38] focus:border-[#F28C38] appearance-none bg-white"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                  <option value="rejected">Rejected</option>
                  <option value="partial">Partial</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Teams Table - Desktop */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sport</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Captain</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Players</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTeams.map((team) => (
                  <tr key={team.id} className="hover:bg-gray-50">
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {team.currentPlayers}/{team.maxPlayers}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(team.status)}`}>
                        {getStatusIcon(team.status)}
                        <span className="ml-1 capitalize">{team.status.replace('_', ' ')}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(team.submittedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => router.push(`/${lang}/verification/teams/${team.id}`)}
                        className="text-[#F28C38] hover:text-[#E67A26] font-medium text-sm flex items-center"
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
        </div>

        {/* Teams Cards - Mobile */}
        <div className="md:hidden space-y-4">
          {filteredTeams.map((team) => (
            <div key={team.id} className="bg-white rounded-lg shadow-sm p-4">
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
                <div><strong>Captain:</strong> {team.captainProfile.name}</div>
                <div><strong>Location:</strong> {team.panchayat}, {team.district}</div>
                <div><strong>Players:</strong> {team.currentPlayers}/{team.maxPlayers}</div>
                <div><strong>Submitted:</strong> {formatDate(team.submittedAt)}</div>
              </div>

              <button
                onClick={() => router.push(`/${lang}/verification/teams/${team.id}`)}
                className="w-full bg-[#F28C38] hover:bg-[#E67A26] text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center"
              >
                <Eye className="w-4 h-4 mr-2" />
                Review Team
              </button>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredTeams.length === 0 && !loading && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 font-fira mb-2">
              No teams found
            </h3>
            <p className="text-gray-600 font-fira">
              {searchTerm || statusFilter !== 'all' 
                ? "Try adjusting your search or filter criteria."
                : "No teams have been submitted for verification yet."
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}