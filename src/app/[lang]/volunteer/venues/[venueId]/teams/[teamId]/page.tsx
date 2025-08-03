'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getTeamForMatchDayVerification, verifyPlayerMatchDay, uploadTeamImage } from '@/lib/actions/volunteer/matchDayVerification';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  User, 
  Phone, 
  Calendar,
  MapPin,
  Camera,
  Upload,
  ArrowLeft,
  Eye,
  Edit3
} from 'lucide-react';
import Image from 'next/image';


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
  currentPlayers: number;
  maxPlayers: number;
  status: string;
  matchDayStatus?: string;
  teamImageUrl?: string;
}

interface PlayerData {
  id: string;
  name: string;
  phone: string;
  age: number;
  gender: string;
  position: string;
  documents: {
    profilePhoto: { url?: string | null; verified: boolean };
    aadhaarFront: { url?: string | null; verified: boolean };
    aadhaarBack: { url?: string | null; verified: boolean };
  };
  verificationStatus: string;
  matchDayVerificationStatus?: string;
  matchDayComments?: string;
}

export default function TeamMatchDayVerificationPage() {
  const params = useParams();
  const { venueId, teamId } = params as { venueId: string; teamId: string; lang: string };
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [team, setTeam] = useState<TeamData | null>(null);
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerData | null>(null);
  const [showImageUpload, setShowImageUpload] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      setError('Please log in to access this page');
      setLoading(false);
      return;
    }

    loadTeamData();
  }, [user, authLoading, teamId]);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      const result = await getTeamForMatchDayVerification(teamId, user!.uid);
      
      if (result.success) {
        setTeam(result.team);
        setPlayers(result.players);
      } else {
        setError(result.error || 'Failed to load team data');
      }
    } catch (err) {
      console.error('Error loading team data:', err);
      setError('Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayerVerification = async (playerId: string, status: 'verified' | 'rejected', comments?: string) => {
    try {
      setSubmitting(true);
      
      const result = await verifyPlayerMatchDay({
        playerId,
        status,
        comments: comments || '',
        verifiedBy: user!.uid,
        verificationIssues: status === 'rejected' ? ['Match day verification failed'] : [],
        teamId: teamId, // Pass teamId for direct access
        venueId: venueId // Pass venueId for auto check-in
      });

      if (result.success) {
        // Reload team data to get updated verification status
        await loadTeamData();
        
        if (result.teamAutoCheckedIn) {
          alert(`Player ${status} successfully! Team has been automatically checked in as all players are now verified.`);
        } else {
          alert(`Player ${status} successfully!`);
        }
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error verifying player:', error);
      alert('Failed to verify player. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getPlayerStatusColor = (player: PlayerData) => {
    switch (player.matchDayVerificationStatus) {
      case 'verified': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getPlayerStatusIcon = (player: PlayerData) => {
    switch (player.matchDayVerificationStatus) {
      case 'verified': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getDocumentStatus = (player: PlayerData) => {
    const docs = player.documents;
    const hasAllDocs = docs.profilePhoto?.url && docs.aadhaarFront?.url && docs.aadhaarBack?.url;
    
    if (!hasAllDocs) {
      return { status: 'incomplete', message: 'Missing documents', color: 'text-red-600' };
    }
    
    return { status: 'complete', message: 'All documents uploaded', color: 'text-green-600' };
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#F28C38] mx-auto mb-4" />
          <p className="text-gray-600">Loading team verification data...</p>
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
            onClick={loadTeamData}
            className="mt-4 bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Team Not Found</h1>
          <p className="mt-2 text-gray-600">The requested team could not be found.</p>
        </div>
      </div>
    );
  }

  const verifiedCount = players.filter(p => p.matchDayVerificationStatus === 'verified').length;
  const rejectedCount = players.filter(p => p.matchDayVerificationStatus === 'rejected').length;
  const pendingCount = players.length - verifiedCount - rejectedCount;
  const allVerified = verifiedCount === players.length;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <button 
            onClick={() => router.back()} 
            className="text-[#F28C38] hover:text-[#E67A26] flex items-center mr-4"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            Back to Teams
          </button>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Team Verification</h1>
        <p className="text-gray-600 text-sm">Match day verification for team players</p>
      </div>

      {/* Team Info Card */}
      <div className="bg-white rounded-lg border shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{team.name}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center">
                <User className="w-4 h-4 mr-2 text-gray-400" />
                <div>
                  <span className="text-gray-500">Captain:</span>
                  <div className="font-medium">{team.captainProfile.name}</div>
                </div>
              </div>
              <div className="flex items-center">
                <Phone className="w-4 h-4 mr-2 text-gray-400" />
                <div>
                  <span className="text-gray-500">Phone:</span>
                  <div className="font-medium">{team.captainProfile.phone}</div>
                </div>
              </div>
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                <div>
                  <span className="text-gray-500">Location:</span>
                  <div className="font-medium">{team.panchayat}, {team.district}</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="ml-6 flex flex-col items-end">
            {team.teamImageUrl ? (
              <Image 
                src={team.teamImageUrl} 
                alt="Team photo" 
                width={120} 
                height={120} 
                className="rounded-lg object-cover border"
              />
            ) : (
              <div className="w-[120px] h-[120px] bg-gray-100 rounded-lg border flex items-center justify-center">
                <Camera className="w-8 h-8 text-gray-400" />
              </div>
            )}
            {!team.teamImageUrl && (
              <button
                onClick={() => setShowImageUpload(true)}
                className="mt-2 text-sm text-[#F28C38] hover:text-[#E67A26] flex items-center"
              >
                <Upload className="w-4 h-4 mr-1" />
                Add Photo
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Progress Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Players</p>
              <p className="text-2xl font-bold text-gray-900">{players.length}</p>
            </div>
            <User className="w-8 h-8 text-gray-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Verified</p>
              <p className="text-2xl font-bold text-green-600">{verifiedCount}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Rejected</p>
              <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-yellow-400" />
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-lg border shadow-sm p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Verification Progress</span>
          <span className="text-sm text-gray-500">{verifiedCount}/{players.length} completed</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              allVerified ? 'bg-green-500' : 'bg-[#F28C38]'
            }`}
            style={{ width: `${(verifiedCount / players.length) * 100}%` }}
          />
        </div>
        {allVerified && (
          <div className="mt-2 flex items-center text-green-600">
            <CheckCircle className="w-4 h-4 mr-2" />
            <span className="text-sm font-medium">Team Auto-Checked In - All Players Verified</span>
          </div>
        )}
      </div>

      {/* Players Table - Desktop */}
      {players.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No players found</h3>
          <p className="text-gray-600">No players have been added to this team yet.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block bg-white rounded-lg border overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Player</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Documents</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {players.map((player) => {
                    const docStatus = getDocumentStatus(player);
                    return (
                      <tr key={player.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            {player.documents.profilePhoto?.url && (
                              <Image
                                src={player.documents.profilePhoto.url}
                                alt="Profile"
                                width={40}
                                height={40}
                                className="rounded-full object-cover mr-3"
                              />
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900">{player.name}</div>
                              <div className="text-sm text-gray-500">{player.age} years • {player.gender === 'M' ? 'Male' : 'Female'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 capitalize">{player.position}</td>
                        <td className="px-6 py-4">
                          <span className={`text-sm ${docStatus.color}`}>
                            {docStatus.message}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPlayerStatusColor(player)}`}>
                            {getPlayerStatusIcon(player)}
                            <span className="ml-1 capitalize">{player.matchDayVerificationStatus || 'pending'}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setSelectedPlayer(player)}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {player.matchDayVerificationStatus !== 'verified' && player.matchDayVerificationStatus !== 'rejected' && (
                              <>
                                <button
                                  onClick={() => handlePlayerVerification(player.id, 'verified')}
                                  disabled={submitting || docStatus.status === 'incomplete'}
                                  className="text-green-600 hover:text-green-900 disabled:opacity-50"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handlePlayerVerification(player.id, 'rejected', 'Match day verification failed')}
                                  disabled={submitting}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-4">
            {players.map((player) => {
              const docStatus = getDocumentStatus(player);
              
              return (
                <div key={player.id} className="bg-white rounded-lg border p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center flex-1">
                      {player.documents.profilePhoto?.url && (
                        <Image
                          src={player.documents.profilePhoto.url}
                          alt="Profile"
                          width={48}
                          height={48}
                          className="rounded-full object-cover mr-3"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">{player.name}</h3>
                        <p className="text-sm text-gray-500">{player.age} years • {player.gender === 'M' ? 'Male' : 'Female'}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPlayerStatusColor(player)} ml-2`}>
                      {getPlayerStatusIcon(player)}
                      <span className="ml-1 capitalize">{player.matchDayVerificationStatus || 'pending'}</span>
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <span className="text-xs text-gray-500">Position</span>
                      <p className="text-sm font-medium text-gray-900 capitalize">{player.position}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Documents</span>
                      <p className={`text-sm font-medium ${docStatus.color}`}>{docStatus.message}</p>
                    </div>
                  </div>

                  {player.matchDayComments && (
                    <div className="bg-gray-50 p-2 rounded text-sm text-gray-600 mb-3">
                      <strong>Comments:</strong> {player.matchDayComments}
                    </div>
                  )}
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setSelectedPlayer(player)}
                      className="flex-1 flex items-center justify-center px-3 py-2 text-sm text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-md border border-indigo-200"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View Details
                    </button>
                    {player.matchDayVerificationStatus !== 'verified' && player.matchDayVerificationStatus !== 'rejected' && (
                      <>
                        <button
                          onClick={() => handlePlayerVerification(player.id, 'verified')}
                          disabled={submitting || docStatus.status === 'incomplete'}
                          className="flex items-center justify-center px-3 py-2 text-sm text-green-600 hover:text-green-900 hover:bg-green-50 rounded-md border border-green-200 disabled:opacity-50"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handlePlayerVerification(player.id, 'rejected', 'Match day verification failed')}
                          disabled={submitting}
                          className="flex items-center justify-center px-3 py-2 text-sm text-red-600 hover:text-red-900 hover:bg-red-50 rounded-md border border-red-200"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Success Banner */}
      {allVerified && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-green-800">Team Auto-Checked In Successfully</h3>
              <p className="text-sm text-green-700 mt-1">All {players.length} players have been verified and the team is ready for matches.</p>
            </div>
          </div>
        </div>
      )}

      {/* Player Details Modal */}
      {selectedPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Player Details</h3>
              <button 
                onClick={() => setSelectedPlayer(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Player Basic Info */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Basic Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Name:</span>
                    <div className="font-medium">{selectedPlayer.name}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Phone:</span>
                    <div className="font-medium">{selectedPlayer.phone}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Age:</span>
                    <div className="font-medium">{selectedPlayer.age} years</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Gender:</span>
                    <div className="font-medium">{selectedPlayer.gender === 'M' ? 'Male' : 'Female'}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Position:</span>
                    <div className="font-medium capitalize">{selectedPlayer.position}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Verification Status:</span>
                    <div className={`font-medium capitalize ${
                      selectedPlayer.matchDayVerificationStatus === 'verified' ? 'text-green-600' :
                      selectedPlayer.matchDayVerificationStatus === 'rejected' ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                      {selectedPlayer.matchDayVerificationStatus || 'pending'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Documents</h4>
                <div className="grid grid-cols-3 gap-4">
                  {selectedPlayer.documents.profilePhoto?.url && (
                    <div className="text-center">
                      <Image
                        src={selectedPlayer.documents.profilePhoto.url}
                        alt="Profile Photo"
                        width={120}
                        height={120}
                        className="rounded-lg object-cover w-full h-32 mx-auto"
                      />
                      <p className="text-xs text-gray-500 mt-1">Profile Photo</p>
                    </div>
                  )}
                  {selectedPlayer.documents.aadhaarFront?.url && (
                    <div className="text-center">
                      <Image
                        src={selectedPlayer.documents.aadhaarFront.url}
                        alt="Aadhaar Front"
                        width={120}
                        height={120}
                        className="rounded-lg object-cover w-full h-32 mx-auto"
                      />
                      <p className="text-xs text-gray-500 mt-1">Aadhaar Front</p>
                    </div>
                  )}
                  {selectedPlayer.documents.aadhaarBack?.url && (
                    <div className="text-center">
                      <Image
                        src={selectedPlayer.documents.aadhaarBack.url}
                        alt="Aadhaar Back"
                        width={120}
                        height={120}
                        className="rounded-lg object-cover w-full h-32 mx-auto"
                      />
                      <p className="text-xs text-gray-500 mt-1">Aadhaar Back</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Verification Comments */}
              {selectedPlayer.matchDayComments && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Verification Comments</h4>
                  <div className="bg-gray-50 p-3 rounded-lg text-sm">
                    {selectedPlayer.matchDayComments}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {selectedPlayer.matchDayVerificationStatus !== 'verified' && (
                <div className="flex space-x-3">
                  <Button
                    onClick={() => {
                      handlePlayerVerification(selectedPlayer.id, 'verified');
                      setSelectedPlayer(null);
                    }}
                    disabled={submitting}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Verify Player
                  </Button>
                  <Button
                    onClick={() => {
                      handlePlayerVerification(selectedPlayer.id, 'rejected', 'Rejected during detailed review');
                      setSelectedPlayer(null);
                    }}
                    disabled={submitting}
                    variant="outline"
                    className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject Player
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Team Image Upload Modal */}
      {showImageUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Upload Team Photo</h3>
              <button 
                onClick={() => setShowImageUpload(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Camera className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 mb-4">Select a team photo to upload</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const file = e.target.files[0];
                      // Simple URL for demo - in production use proper file upload
                      const imageUrl = URL.createObjectURL(file);
                      uploadTeamImage(teamId, imageUrl, user!.uid).then((result) => {
                        if (result.success) {
                          setShowImageUpload(false);
                          loadTeamData(); // Refresh data
                          alert('Team photo uploaded successfully!');
                        } else {
                          alert(`Error: ${result.error}`);
                        }
                      });
                    }
                  }}
                  className="hidden"
                  id="team-photo-upload"
                />
                <label 
                  htmlFor="team-photo-upload"
                  className="bg-[#F28C38] text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-[#E67A26] transition-colors inline-block"
                >
                  Choose Photo
                </label>
              </div>
              
              <div className="flex space-x-3">
                <Button
                  onClick={() => setShowImageUpload(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}