"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getAdminPlayers, getAdminPlayerStats } from '@/lib/actions/admin/optimizedPlayerQueries';
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

interface PlayerData {
  id: string;
  name: string;
  phone: string;
  gender: 'M' | 'F';
  age?: number;
  position?: string;
  verificationStatus: string;
  addedAt: string | null;
  verifiedAt: string | null;
  team?: {
    id: string;
    name: string;
    sportName: string;
    status: string;
    genderCategory: string;
  } | null;
  documents?: {
    profilePhoto?: {
      url?: string;
      verified: boolean;
    };
    aadhaarFront?: {
      url?: string;
      verified: boolean;
    };
    aadhaarBack?: {
      url?: string;
      verified: boolean;
    };
  };
  profileData?: {
    panchayat?: string;
    district?: string;
    state?: string;
  };
}

export default function AdminPlayersPage() {
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [verificationFilter, setVerificationFilter] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [teamStatusFilter, setTeamStatusFilter] = useState<string>('all');
  const [sportFilter, setSportFilter] = useState<string>('');
  const [districtFilter, setDistrictFilter] = useState<string>('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const pageSize = 25;

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

    loadPlayers();
    loadStats();
  }, [user, userProfile, authLoading, lang, router, verificationFilter, genderFilter, teamStatusFilter, sportFilter, districtFilter, currentPage]);

  const loadPlayers = async () => {
    try {
      setLoading(true);
      
      if (!user?.uid) {
        throw new Error('User not authenticated');
      }

      const result = await getAdminPlayers({
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
        verificationStatus: verificationFilter as any,
        gender: genderFilter as any,
        teamStatus: teamStatusFilter as any,
        sportName: sportFilter || undefined,
        district: districtFilter || undefined,
        searchQuery: searchTerm || undefined,
        sortBy: 'addedAt',
        sortOrder: 'desc'
      }, user.uid);

      if (!result.success) {
        console.error('Error loading players:', result.error);
        // Don't throw error, just set empty state and show message
        setPlayers([]);
        setHasMore(false);
        setError(result.error || 'Failed to load players. Please check that Firestore indexes are deployed.');
        return;
      }

      setPlayers(result.players);
      setHasMore(result.pagination.hasMore);
      setError(''); // Clear any previous errors
      
    } catch (err: any) {
      console.error('Error loading players:', err);
      setPlayers([]);
      setHasMore(false);
      setError(err.message || 'Failed to load players. Please check your permissions and that Firestore indexes are deployed.');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      if (!user?.uid) return;

      const result = await getAdminPlayerStats({
        district: districtFilter || undefined,
        sportName: sportFilter || undefined,
        genderCategory: genderFilter as any,
        teamStatus: teamStatusFilter as any
      }, user.uid);

      if (result.success) {
        setStats(result.stats);
      } else {
        console.error('Error loading player stats:', result.error);
        // Set stats to null on error so fallbacks are used
        setStats(null);
      }
    } catch (err: any) {
      console.error('Error loading player stats:', err);
      // Set stats to null on error so fallbacks are used
      setStats(null);
    }
  };

  // Remove client-side filtering since it's now handled by the server
  const filteredPlayers = players;

  const getVerificationStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getVerificationStatusIcon = (status: string) => {
    switch (status) {
      case 'verified': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getDocumentStatus = (player: PlayerData) => {
    const docs = player.documents || {};
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

  const exportPlayers = () => {
    const csvContent = [
      ['Name', 'Phone', 'Gender', 'Age', 'Team', 'Sport', 'Position', 'Verification Status', 'Location', 'Documents Status', 'Added Date'].join(','),
      ...filteredPlayers.map(player => [
        player.name,
        player.phone,
        player.gender === 'M' ? 'Male' : 'Female',
        player.age || '',
        player.team?.name || 'No Team',
        player.team?.sportName || '',
        player.position || 'main',
        player.verificationStatus,
        `${player.profileData?.panchayat || ''}, ${player.profileData?.district || ''}`,
        getDocumentStatus(player).status,
        player.addedAt ? new Date(player.addedAt).toLocaleDateString() : 'Unknown'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `players_export_${new Date().toISOString().split('T')[0]}.csv`;
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

  if (error && players.length === 0 && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Unable to Load Players</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          {error.includes('index') && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 text-left">
              <p className="text-sm text-yellow-800">
                <strong>Firestore Index Required:</strong> This error occurs when the required database indexes haven&apos;t been deployed yet. 
                The indexes are defined in the codebase but need to be deployed to Firebase.
              </p>
            </div>
          )}
          <div className="flex gap-2 justify-center">
            <button 
              onClick={() => {
                setError('');
                loadPlayers();
              }}
              className="bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors"
            >
              Retry
            </button>
            <button 
              onClick={() => router.push(`/${lang}/admin/dashboard`)}
              className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold font-fira mb-2 text-[#4A2F1D]">
            Player Management
          </h1>
          <p className="text-sm sm:text-base text-gray-600 font-fira">
            View and manage player registrations across all teams
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Players</p>
                <p className="text-2xl font-bold text-[#4A2F1D]">{stats?.total || players.length}</p>
              </div>
              <Users className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Verified</p>
                <p className="text-2xl font-bold text-green-600">{stats?.byVerificationStatus?.verified || players.filter(p => p.verificationStatus === 'verified').length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats?.byVerificationStatus?.pending || players.filter(p => p.verificationStatus === 'pending').length}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-400" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">With Teams</p>
                <p className="text-2xl font-bold text-blue-600">{stats?.teamAssociation?.withTeam || players.filter(p => p.team).length}</p>
              </div>
              <Shield className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Complete Docs</p>
                <p className="text-2xl font-bold text-purple-600">{stats?.documentStats?.allDocumentsComplete || players.filter(p => getDocumentStatus(p).status === 'complete').length}</p>
              </div>
              <UserCheck className="w-8 h-8 text-purple-400" />
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search players by name, phone, or team..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadPlayers()}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F28C38] focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <select
                value={verificationFilter}
                onChange={(e) => setVerificationFilter(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-[#F28C38] focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
              </select>

              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-[#F28C38] focus:border-transparent"
              >
                <option value="all">All Gender</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>

              <select
                value={teamStatusFilter}
                onChange={(e) => setTeamStatusFilter(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-[#F28C38] focus:border-transparent"
              >
                <option value="all">All Teams</option>
                <option value="verified">Verified Teams</option>
                <option value="submitted">Submitted Teams</option>
                <option value="draft">Draft Teams</option>
              </select>

              <input
                type="text"
                placeholder="Sport"
                value={sportFilter}
                onChange={(e) => setSportFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 w-24 focus:ring-2 focus:ring-[#F28C38] focus:border-transparent"
              />

              <input
                type="text"
                placeholder="District"
                value={districtFilter}
                onChange={(e) => setDistrictFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 w-24 focus:ring-2 focus:ring-[#F28C38] focus:border-transparent"
              />

              <button
                onClick={exportPlayers}
                className="bg-[#F28C38] hover:bg-[#E67A26] text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
            </div>
          </div>

          {/* Applied Filters */}
          {(verificationFilter !== 'all' || genderFilter !== 'all' || teamStatusFilter !== 'all' || sportFilter || districtFilter || searchTerm) && (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-gray-600">Active filters:</span>
              {verificationFilter !== 'all' && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                  Status: {verificationFilter}
                </span>
              )}
              {genderFilter !== 'all' && (
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                  Gender: {genderFilter === 'M' ? 'Male' : 'Female'}
                </span>
              )}
              {teamStatusFilter !== 'all' && (
                <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                  Team: {teamStatusFilter}
                </span>
              )}
              {sportFilter && (
                <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">
                  Sport: {sportFilter}
                </span>
              )}
              {districtFilter && (
                <span className="px-2 py-1 bg-pink-100 text-pink-800 rounded-full text-xs">
                  District: {districtFilter}
                </span>
              )}
              {searchTerm && (
                <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">
                  Search: &quot;{searchTerm}&quot;
                </span>
              )}
              <button
                onClick={() => {
                  setVerificationFilter('all');
                  setGenderFilter('all');
                  setTeamStatusFilter('all');
                  setSportFilter('');
                  setDistrictFilter('');
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs hover:bg-red-200 transition-colors"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Players List */}
        {filteredPlayers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 font-fira mb-2">
              No players found
            </h3>
            <p className="text-gray-600 font-fira">
              {searchTerm || verificationFilter !== 'all' || genderFilter !== 'all' || teamStatusFilter !== 'all' || sportFilter || districtFilter
                ? 'Try adjusting your search or filters' 
                : 'Players will appear here as they register'}
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Player</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Documents</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Added</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPlayers.map((player) => {
                    const docStatus = getDocumentStatus(player);
                    return (
                      <tr key={player.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{player.name}</div>
                          <div className="text-xs text-gray-500">
                            {player.gender === 'M' ? 'Male' : 'Female'} • Age: {player.age || 'N/A'} • {player.position || 'Main'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {player.team ? (
                            <div>
                              <div className="text-sm font-medium text-gray-900">{player.team.name}</div>
                              <div className="text-xs text-gray-500">{player.team.sportName} • {player.team.genderCategory}</div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400 italic">No Team</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{player.phone}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{player.profileData?.panchayat || 'Not provided'}</div>
                          <div className="text-xs text-gray-500">{player.profileData?.district || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getVerificationStatusColor(player.verificationStatus)}`}>
                            {getVerificationStatusIcon(player.verificationStatus)}
                            <span className="ml-1 capitalize">{player.verificationStatus}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`flex items-center ${docStatus.color}`}>
                            {docStatus.icon}
                            <span className="ml-1 text-xs capitalize">{docStatus.status}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {player.addedAt ? new Date(player.addedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => router.push(`/${lang}/admin/teams/${player.team?.id}#player-${player.id}`)}
                            className="text-[#F28C38] hover:text-[#E67A26] font-medium text-sm flex items-center"
                            disabled={!player.team}
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
            <div className="md:hidden space-y-4 mb-6">
              {filteredPlayers.map((player) => {
                const docStatus = getDocumentStatus(player);
                return (
                  <div key={player.id} className="bg-white rounded-lg shadow-sm border p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{player.name}</h3>
                        <p className="text-sm text-gray-600">{player.phone}</p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getVerificationStatusColor(player.verificationStatus)}`}>
                        {getVerificationStatusIcon(player.verificationStatus)}
                        <span className="ml-1 capitalize">{player.verificationStatus}</span>
                      </span>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <div><strong>Team:</strong> {player.team ? `${player.team.name} (${player.team.sportName})` : 'No Team'}</div>
                      <div><strong>Gender & Age:</strong> {player.gender === 'M' ? 'Male' : 'Female'}, {player.age || 'N/A'} years</div>
                      <div><strong>Position:</strong> {player.position || 'Main'}</div>
                      <div><strong>Location:</strong> {player.profileData?.panchayat || 'Not provided'}, {player.profileData?.district || 'N/A'}</div>
                      <div className={`flex items-center ${docStatus.color}`}>
                        <strong>Documents:</strong>
                        {docStatus.icon}
                        <span className="ml-1 text-xs capitalize">{docStatus.status}</span>
                      </div>
                      <div><strong>Added:</strong> {player.addedAt ? new Date(player.addedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Unknown'}</div>
                    </div>

                    <button
                      onClick={() => router.push(`/${lang}/admin/teams/${player.team?.id}#player-${player.id}`)}
                      disabled={!player.team}
                      className="w-full bg-[#F28C38] hover:bg-[#E67A26] text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
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

        {/* Pagination */}
        {hasMore && (
          <div className="mt-6 text-center">
            <button
              onClick={() => setCurrentPage(prev => prev + 1)}
              disabled={loading}
              className="px-6 py-2 bg-[#F28C38] text-white rounded-lg hover:bg-[#E67A26] transition-colors disabled:opacity-50 flex items-center mx-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Loading...
                </>
              ) : (
                'Load More Players'
              )}
            </button>
          </div>
        )}
    </div>
  );
}