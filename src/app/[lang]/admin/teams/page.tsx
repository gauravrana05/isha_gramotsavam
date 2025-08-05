"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getAdminTeams, getAdminTeamStats } from '@/lib/actions/admin/optimizedTeamQueries';
import { 
  Users,
  Trophy,
  MapPin,
  Calendar,
  Clock,
  Eye,
  Search,
  ChevronDown,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  Mail,
  Phone,
  Download,
  Loader2
} from 'lucide-react';

interface TeamData {
  id: string;
  name: string;
  sportName: string;
  sportId: string;
  captainProfile: {
    name: string;
    phone: string;
  };
  panchayat: string;
  district: string;
  state: string;
  genderCategory: string;
  currentPlayers: number;
  maxPlayers: number;
  status: string;
  createdAt: any;
  eventId: string;
  clusterVenue?: string;
}

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sportFilter, setSportFilter] = useState<string>('all');
  const [districtFilter, setDistrictFilter] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  
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

    loadTeams();
    loadStats();
  }, [user, userProfile, authLoading, lang, router, statusFilter, sportFilter, districtFilter, genderFilter, currentPage]);

  const loadTeams = async () => {
    try {
      setLoading(true);
      
      if (!user?.uid) {
        throw new Error('User not authenticated');
      }

      const result = await getAdminTeams({
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
        status: statusFilter as any,
        sportName: sportFilter !== 'all' ? sportFilter : undefined,
        district: districtFilter !== 'all' ? districtFilter : undefined,
        genderCategory: genderFilter as any,
        searchQuery: searchTerm || undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      }, user.uid);

      if (!result.success) {
        throw new Error(result.error);
      }

      setTeams(result.teams);
      setHasMore(result.pagination.hasMore);
      
    } catch (err: any) {
      console.error('Error loading teams:', err);
      setError(err.message || 'Failed to load teams. Please check your permissions.');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      if (!user?.uid) return;

      const result = await getAdminTeamStats({
        district: districtFilter !== 'all' ? districtFilter : undefined,
        sportName: sportFilter !== 'all' ? sportFilter : undefined,
        genderCategory: genderFilter as any
      }, user.uid);

      if (result.success) {
        setStats(result.stats);
      }
    } catch (err: any) {
      console.error('Error loading team stats:', err);
    }
  };

  // Remove client-side filtering since it's now handled by the server
  const filteredTeams = teams;

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified': return <CheckCircle className="w-4 h-4" />;
      case 'submitted': case 'pending': return <Clock className="w-4 h-4" />;
      case 'draft': return <AlertCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const exportTeamsData = () => {
    const csvContent = [
      ['Team Name', 'Sport', 'Gender Category', 'Captain', 'Location', 'Players', 'Status', 'Created Date'].join(','),
      ...filteredTeams.map(team => [
        team.name,
        team.sportName,
        team.genderCategory,
        team.captainProfile.name,
        `${team.panchayat}, ${team.district}`,
        `${team.currentPlayers}/${team.maxPlayers}`,
        team.status,
        team.createdAt ? team.createdAt.toDate?.() ? team.createdAt.toDate().toLocaleDateString() : new Date(team.createdAt).toLocaleDateString() : 'Unknown'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'teams_export.csv';
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
            Teams Management
          </h1>
          <p className="text-sm sm:text-base text-gray-600 font-fira">
            View team registrations and status - Read-only access
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total</p>
                <p className="text-2xl font-bold text-[#4A2F1D]">{stats?.total || teams.length}</p>
              </div>
              <Users className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Verified</p>
                <p className="text-2xl font-bold text-green-600">{stats?.byStatus?.verified || teams.filter(t => t.status === 'verified').length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Submitted</p>
                <p className="text-2xl font-bold text-blue-600">{stats?.byStatus?.submitted || teams.filter(t => t.status === 'submitted').length}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats?.byStatus?.pending || teams.filter(t => t.status === 'pending').length}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-yellow-400" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Players</p>
                <p className="text-2xl font-bold text-purple-600">{stats?.playerStats?.totalPlayers || teams.reduce((total, team) => total + team.currentPlayers, 0)}</p>
              </div>
              <Trophy className="w-8 h-8 text-purple-400" />
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
                  placeholder="Search teams, captains, or locations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadTeams()}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F28C38] focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-[#F28C38] focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
              </select>

              <select
                value={sportFilter}
                onChange={(e) => setSportFilter(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-[#F28C38] focus:border-transparent"
              >
                <option value="all">All Sports</option>
                <option value="Volleyball">Volleyball</option>
                <option value="Throwball">Throwball</option>
                <option value="Football">Football</option>
                <option value="Cricket">Cricket</option>
                <option value="Badminton">Badminton</option>
                <option value="Kabaddi">Kabaddi</option>
              </select>

              <select
                value={districtFilter}
                onChange={(e) => setDistrictFilter(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-[#F28C38] focus:border-transparent"
              >
                <option value="all">All Districts</option>
                {stats?.byDistrict && Object.keys(stats.byDistrict).sort().map(district => (
                  <option key={district} value={district}>{district} ({stats.byDistrict[district]})</option>
                ))}
              </select>

              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-[#F28C38] focus:border-transparent"
              >
                <option value="all">All Gender</option>
                <option value="men">Men</option>
                <option value="women">Women</option>
                <option value="mixed">Mixed</option>
              </select>

              <button
                onClick={exportTeamsData}
                className="bg-[#F28C38] hover:bg-[#E67A26] text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
            </div>
          </div>

          {/* Applied Filters */}
          {(statusFilter !== 'all' || sportFilter !== 'all' || districtFilter !== 'all' || genderFilter !== 'all' || searchTerm) && (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-gray-600">Active filters:</span>
              {statusFilter !== 'all' && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                  Status: {statusFilter}
                </span>
              )}
              {sportFilter !== 'all' && (
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                  Sport: {sportFilter}
                </span>
              )}
              {districtFilter !== 'all' && (
                <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                  District: {districtFilter}
                </span>
              )}
              {genderFilter !== 'all' && (
                <span className="px-2 py-1 bg-pink-100 text-pink-800 rounded-full text-xs">
                  Gender: {genderFilter}
                </span>
              )}
              {searchTerm && (
                <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">
                  Search: "{searchTerm}"
                </span>
              )}
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setSportFilter('all');
                  setDistrictFilter('all');
                  setGenderFilter('all');
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

        {/* Teams List */}
        {filteredTeams.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 font-fira mb-2">
              No teams found
            </h3>
            <p className="text-gray-600 font-fira">
              {searchTerm || statusFilter !== 'all' || sportFilter !== 'all'
                ? 'Try adjusting your search or filters' 
                : 'Teams will appear here as they register'}
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sport</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Captain</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Venue</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Players</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
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
                        {team.clusterVenue || <span className="text-gray-400 italic">Not assigned</span>}
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
                        {team.createdAt ? team.createdAt.toDate?.() ? team.createdAt.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date(team.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => router.push(`/${lang}/admin/teams/${team.id}`)}
                          className="text-[#F28C38] hover:text-[#E67A26] font-medium text-sm flex items-center"
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
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {filteredTeams.map((team) => (
                <div key={team.id} className="bg-white rounded-lg shadow-sm border p-4">
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
                    <div><strong>Phone:</strong> {team.captainProfile.phone}</div>
                    <div><strong>Location:</strong> {team.panchayat}, {team.district}</div>
                    <div><strong>Venue:</strong> {team.clusterVenue || <span className="text-gray-400 italic">Not assigned</span>}</div>
                    <div><strong>Players:</strong> {team.currentPlayers}/{team.maxPlayers}</div>
                    <div><strong>Created:</strong> {team.createdAt ? team.createdAt.toDate?.() ? team.createdAt.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date(team.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Unknown'}</div>
                  </div>

                  <button
                    onClick={() => router.push(`/${lang}/admin/teams/${team.id}`)}
                    className="w-full bg-[#F28C38] hover:bg-[#E67A26] text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Team Details
                  </button>
                </div>
              ))}
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
                'Load More Teams'
              )}
            </button>
          </div>
        )}
    </div>
  );
}