'use client';

import { useState, useEffect } from 'react';
import { getVenueTeamsForMatchDay } from '@/lib/actions/volunteer/matchDayVerification';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useParams } from 'next/navigation';
import { 
  Loader2, 
  Users, 
  CheckCircle, 
  Clock, 
  Eye, 
  Camera,
  MapPin,
  Trophy,
  UserCheck,
  AlertCircle
} from 'lucide-react';

export default function MatchDayTeamsPage() {
  const params = useParams();
  const { venueId } = params as { venueId: string; lang: string };
  const { user, loading: authLoading } = useAuth();
  
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      setError('Please log in to access this page');
      setLoading(false);
      return;
    }

    loadTeams();
  }, [user, authLoading, venueId]);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const teamsResult = await getVenueTeamsForMatchDay(venueId, user!.uid);
      
      if (teamsResult.success) {
        setTeams(teamsResult.teams ?? []);
      } else {
        setError(teamsResult.error || 'Failed to load teams');
      }
    } catch (err) {
      console.error('Error loading teams:', err);
      setError('Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#F28C38] mx-auto mb-4" />
          <p className="text-gray-600">Loading teams...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Error</h1>
          <p className="mt-2 text-gray-600">{error}</p>
          <button 
            onClick={loadTeams}
            className="mt-4 bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'checked_in':
        return 'bg-green-100 text-green-800';
      case 'verified':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'checked_in':
        return <CheckCircle className="w-4 h-4" />;
      case 'verified':
        return <UserCheck className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Team Verification</h1>
        <p className="text-gray-600 text-sm">Match day verification for venue teams</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Teams</p>
              <p className="text-2xl font-bold text-gray-900">{teams.length}</p>
            </div>
            <Users className="w-8 h-8 text-gray-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Checked In</p>
              <p className="text-2xl font-bold text-green-600">
                {teams.filter(t => t.matchDayStatus === 'checked_in').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Verified</p>
              <p className="text-2xl font-bold text-yellow-600">
                {teams.filter(t => t.matchDayStatus === 'verified').length}
              </p>
            </div>
            <UserCheck className="w-8 h-8 text-yellow-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Pending</p>
              <p className="text-2xl font-bold text-red-600">
                {teams.filter(t => t.matchDayStatus === 'pending').length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-red-400" />
          </div>
        </div>
      </div>

      {/* Teams Table - Desktop */}
      {teams.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No teams found</h3>
          <p className="text-gray-600">No teams have been assigned to this venue yet.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Team</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sport</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Players</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {teams.map((team) => (
                    <tr key={team.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{team.name}</div>
                          <div className="text-sm text-gray-500">{team.captainName}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <Trophy className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">{team.sportName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {team.verifiedPlayersCount || 0}/{team.currentPlayers || 0}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm text-gray-900">{team.panchayat}</div>
                            <div className="text-sm text-gray-500">{team.district}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(team.matchDayStatus)}`}>
                          {getStatusIcon(team.matchDayStatus)}
                          <span className="ml-1 capitalize">{team.matchDayStatus || 'pending'}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">
                        <div className="flex space-x-2">
                          <Link href={`/en/volunteer/venues/${venueId}/teams/${team.id}`}>
                            <button className="text-indigo-600 hover:text-indigo-900">
                              <Eye className="w-4 h-4" />
                            </button>
                          </Link>
                          {team.teamImageUrl && (
                            <button className="text-purple-600 hover:text-purple-900">
                              <Camera className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {teams.map((team) => (
              <div key={team.id} className="bg-white rounded-lg border p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">{team.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{team.captainName}</p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(team.matchDayStatus)} ml-2`}>
                    {getStatusIcon(team.matchDayStatus)}
                    <span className="ml-1 capitalize">{team.matchDayStatus || 'pending'}</span>
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <span className="text-xs text-gray-500">Sport</span>
                    <div className="mt-1 flex items-center">
                      <Trophy className="w-4 h-4 text-gray-400 mr-1" />
                      <span className="text-sm font-medium text-gray-900">{team.sportName}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Players</span>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {team.verifiedPlayersCount || 0}/{team.currentPlayers || 0}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs text-gray-500">Location</span>
                    <div className="mt-1 flex items-center">
                      <MapPin className="w-4 h-4 text-gray-400 mr-1" />
                      <span className="text-sm font-medium text-gray-900">{team.panchayat}, {team.district}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-2 pt-3 border-t">
                  <Link href={`/en/volunteer/venues/${venueId}/teams/${team.id}`} className="flex-1">
                    <button className="w-full flex items-center justify-center px-3 py-2 text-sm text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-md">
                      <Eye className="w-4 h-4 mr-1" />
                      {team.matchDayStatus === 'checked_in' ? 'View' : 'Verify'}
                    </button>
                  </Link>
                  {team.teamImageUrl && (
                    <button className="flex items-center justify-center px-3 py-2 text-sm text-purple-600 hover:text-purple-900 hover:bg-purple-50 rounded-md">
                      <Camera className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
