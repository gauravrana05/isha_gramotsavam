"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getAdminVerificationQueue, bulkProcessVerifications } from '@/lib/actions/admin/optimizedVerificationQueries';
import { 
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Users,
  Eye,
  Search,
  Filter,
  ChevronDown,
  Loader2,
  Download,
  AlertCircle,
  FileText,
  Phone,
  MapPin,
  User,
  Calendar
} from 'lucide-react';

interface VerificationTeam {
  id: string;
  name: string;
  sportName: string;
  captainProfile: {
    name: string;
    phone: string;
  };
  panchayat: string;
  district: string;
  genderCategory: string;
  currentPlayers: number;
  maxPlayers: number;
  status: string;
  verificationStatus: string;
  submittedAt: string | null;
  players: any[];
  metrics: {
    totalPlayers: number;
    verifiedPlayers: number;
    rejectedPlayers: number;
    pendingPlayers: number;
    hasIncompleteDocuments: boolean;
    hasRejectedPlayers: boolean;
    documentCompleteness: string;
    completionPercentage: number;
  };
  priority: 'high' | 'medium' | 'low';
  urgency: 'critical' | 'standard' | 'low';
}

export default function AdminTeamVerificationPage() {
  const [teams, setTeams] = useState<VerificationTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [verificationStatusFilter, setVerificationStatusFilter] = useState<string>('pending');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [districtFilter, setDistrictFilter] = useState<string>('');
  const [sportFilter, setSportFilter] = useState<string>('');
  
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

    if (!['admin', 'verification_volunteer'].includes(userProfile?.role ?? '')) {
      router.push(`/${lang}/player/dashboard`);
      return;
    }

    loadVerificationQueue();
  }, [user, userProfile, authLoading, lang, router, verificationStatusFilter, priorityFilter, urgencyFilter, districtFilter, sportFilter, currentPage]);

  const loadVerificationQueue = async () => {
    try {
      setLoading(true);
      
      if (!user?.uid) {
        throw new Error('User not authenticated');
      }

      const result = await getAdminVerificationQueue(
        {
          limit: pageSize,
          offset: (currentPage - 1) * pageSize,
          verificationStatus: verificationStatusFilter as 'pending' | 'all' | 'verified' | 'rejected',
          teamStatus: 'all', // or set from a filter if you have one
          priority: priorityFilter as 'high' | 'medium' | 'low' | 'all',
          urgency: urgencyFilter as 'critical' | 'standard' | 'low' | 'all',
          district: districtFilter || undefined,
          sportName: sportFilter || undefined,
          genderCategory: 'all', // or set from a filter if you have one
          documentCompleteness: 'all', // or set from a filter if you have one
          searchQuery: searchTerm || undefined,
          sortBy: 'submittedAt',
          sortOrder: 'desc'
        },
        user.uid
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      // Ensure each team has the required 'verificationStatus' property
      const teamsWithStatus = (result.teams ?? []).map((team: any) => ({
        ...team,
        verificationStatus: team.verificationStatus ?? (team.verification?.status ?? 'pending'),
      }));

      setTeams(teamsWithStatus);
      setHasMore(result.pagination?.hasMore ?? false);

    } catch (err: any) {
      // Error handling removed
      setError(err.message || 'Failed to load verification queue');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAction = async (action: 'verified' | 'rejected') => {
    if (selectedTeams.size === 0) return;
    
    try {
      setBulkProcessing(true);
      
      if (!user?.uid) {
        throw new Error('User not authenticated');
      }

      const verifications = Array.from(selectedTeams).map(teamId => ({
        teamId,
        status: action,
        comments: `Bulk ${action} by admin`
      }));

      const result = await bulkProcessVerifications({
        verifications,
        verifiedBy: user.uid
      }, user.uid);

      if (!result.success) {
        throw new Error(result.error);
      }

      // Refresh the queue
      setSelectedTeams(new Set());
      loadVerificationQueue();
      
    } catch (err: any) {
      // Error handling removed
      setError(err.message || 'Failed to process bulk action');
    } finally {
      setBulkProcessing(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'standard': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
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
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-semibold font-fira mb-2 text-[#4A2F1D]">
          Team Verification Queue
        </h1>
        <p className="text-sm sm:text-base text-gray-600 font-fira">
          Review and verify team registrations
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">In Queue</p>
              <p className="text-2xl font-bold text-orange-600">{teams.length}</p>
            </div>
            <Clock className="w-8 h-8 text-orange-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">High Priority</p>
              <p className="text-2xl font-bold text-red-600">{teams.filter(t => t.priority === 'high').length}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Critical</p>
              <p className="text-2xl font-bold text-red-600">{teams.filter(t => t.urgency === 'critical').length}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Selected</p>
              <p className="text-2xl font-bold text-blue-600">{selectedTeams.size}</p>
            </div>
            <Users className="w-8 h-8 text-blue-400" />
          </div>
        </div>
      </div>

      {/* Filters and Bulk Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 mb-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search teams, captains..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F28C38] focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              value={verificationStatusFilter}
              onChange={(e) => setVerificationStatusFilter(e.target.value)}
              className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-[#F28C38] focus:border-transparent"
            >
              <option value="pending">Pending</option>
              <option value="all">All Status</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-[#F28C38] focus:border-transparent"
            >
              <option value="all">All Priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-[#F28C38] focus:border-transparent"
            >
              <option value="all">All Urgency</option>
              <option value="critical">Critical</option>
              <option value="standard">Standard</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedTeams.size > 0 && (
          <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg">
            <span className="text-sm font-medium text-blue-800">
              {selectedTeams.size} team(s) selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkAction('verified')}
                disabled={bulkProcessing}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center"
              >
                {bulkProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Verify
              </button>
              <button
                onClick={() => handleBulkAction('rejected')}
                disabled={bulkProcessing}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center"
              >
                {bulkProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <XCircle className="w-4 h-4 mr-2" />
                )}
                Reject
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Teams List */}
      {teams.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 font-fira mb-2">
            No teams in queue
          </h3>
          <p className="text-gray-600 font-fira">
            All teams have been processed or no teams match your filters
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {teams.map((team) => (
            <div key={team.id} className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-4">
                  <input
                    type="checkbox"
                    checked={selectedTeams.has(team.id)}
                    onChange={(e) => {
                      const newSelected = new Set(selectedTeams);
                      if (e.target.checked) {
                        newSelected.add(team.id);
                      } else {
                        newSelected.delete(team.id);
                      }
                      setSelectedTeams(newSelected);
                    }}
                    className="mt-1 h-4 w-4 text-[#F28C38] focus:ring-[#F28C38] border-gray-300 rounded"
                  />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{team.name}</h3>
                    <p className="text-sm text-gray-600">{team.sportName} • {team.genderCategory}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(team.priority)}`}>
                    {team.priority}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getUrgencyColor(team.urgency)}`}>
                    {team.urgency}
                  </span>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(team.verificationStatus)}`}>
                    {getStatusIcon(team.verificationStatus)}
                    <span className="ml-1 capitalize">{team.verificationStatus}</span>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Captain</p>
                  <p className="font-medium text-gray-900">{team.captainProfile.name}</p>
                  <p className="text-sm text-gray-600">{team.captainProfile.phone}</p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-500 mb-1">Location</p>
                  <p className="font-medium text-gray-900">{team.panchayat}</p>
                  <p className="text-sm text-gray-600">{team.district}</p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-500 mb-1">Players</p>
                  <p className="font-medium text-gray-900">{team.currentPlayers}/{team.maxPlayers}</p>
                  <p className="text-sm text-gray-600">{team.metrics.completionPercentage}% verified</p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-500 mb-1">Submitted</p>
                  <p className="font-medium text-gray-900">
                    {team.submittedAt ? new Date(team.submittedAt).toLocaleDateString() : 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {team.submittedAt ? Math.ceil((Date.now() - new Date(team.submittedAt).getTime()) / (1000 * 60 * 60 * 24)) : 0} days ago
                  </p>
                </div>
              </div>

              {/* Team Metrics */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                    <span>{team.metrics.verifiedPlayers} verified</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 text-yellow-500 mr-1" />
                    <span>{team.metrics.pendingPlayers} pending</span>
                  </div>
                  {team.metrics.rejectedPlayers > 0 && (
                    <div className="flex items-center">
                      <XCircle className="w-4 h-4 text-red-500 mr-1" />
                      <span>{team.metrics.rejectedPlayers} rejected</span>
                    </div>
                  )}
                  {team.metrics.hasIncompleteDocuments && (
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 text-orange-500 mr-1" />
                      <span>Incomplete docs</span>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => router.push(`/${lang}/admin/teams/${team.id}`)}
                  className="flex items-center px-4 py-2 text-[#F28C38] hover:text-[#E67A26] font-medium transition-colors"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Review Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {hasMore && (
        <div className="mt-6 text-center">
          <button
            onClick={() => setCurrentPage(prev => prev + 1)}
            className="px-6 py-2 bg-[#F28C38] text-white rounded-lg hover:bg-[#E67A26] transition-colors"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
}
