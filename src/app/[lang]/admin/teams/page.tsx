"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Plus, 
  Users,
  Trophy,
  MapPin,
  Calendar,
  Clock,
  Edit,
  Eye,
  Trash2,
  Filter,
  Search,
  ChevronDown,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  Mail,
  Phone,
  Download
} from 'lucide-react';
import Button from '@/components/ui/Button';

interface Team {
  id: string;
  name: string;
  sport: string;
  category: 'men' | 'women' | 'mixed';
  captainId: string;
  captain: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  players: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: 'player' | 'substitute';
    verified: boolean;
  }[];
  venue?: string;
  status: 'draft' | 'registered' | 'verified' | 'disqualified';
  verificationStatus: 'pending' | 'in_review' | 'verified' | 'rejected';
  registrationDate: string;
  lastUpdated: string;
  documents: {
    teamPhoto: string;
    captainId: string;
    additionalDocs: string[];
  };
  stats?: {
    matchesPlayed: number;
    wins: number;
    losses: number;
    points: number;
  };
}

export default function TeamsManagement() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sportFilter, setSportFilter] = useState<string>('all');
  const [verificationFilter, setVerificationFilter] = useState<string>('all');

  const { lang } = useParams();
  const router = useRouter();

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      // Simulate API call - replace with actual data fetching
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockTeams: Team[] = [
        {
          id: '1',
          name: 'Thunder Bolts',
          sport: 'volleyball',
          category: 'men',
          captainId: 'capt1',
          captain: {
            firstName: 'Arjun',
            lastName: 'Singh',
            email: 'arjun.singh@email.com',
            phone: '+91 9876543210'
          },
          players: [
            { id: 'p1', firstName: 'Arjun', lastName: 'Singh', email: 'arjun.singh@email.com', role: 'player', verified: true },
            { id: 'p2', firstName: 'Rahul', lastName: 'Kumar', email: 'rahul.kumar@email.com', role: 'player', verified: true },
            { id: 'p3', firstName: 'Vikash', lastName: 'Patel', email: 'vikash.patel@email.com', role: 'player', verified: true },
            { id: 'p4', firstName: 'Suresh', lastName: 'Reddy', email: 'suresh.reddy@email.com', role: 'player', verified: true },
            { id: 'p5', firstName: 'Amit', lastName: 'Sharma', email: 'amit.sharma@email.com', role: 'player', verified: true },
            { id: 'p6', firstName: 'Ravi', lastName: 'Gupta', email: 'ravi.gupta@email.com', role: 'player', verified: true },
            { id: 'p7', firstName: 'Deepak', lastName: 'Joshi', email: 'deepak.joshi@email.com', role: 'substitute', verified: true },
            { id: 'p8', firstName: 'Manoj', lastName: 'Verma', email: 'manoj.verma@email.com', role: 'substitute', verified: true }
          ],
          venue: '1',
          status: 'verified',
          verificationStatus: 'verified',
          registrationDate: '2025-01-15T10:30:00Z',
          lastUpdated: '2025-01-20T14:45:00Z',
          documents: {
            teamPhoto: '/documents/thunder_bolts_photo.jpg',
            captainId: '/documents/arjun_id.pdf',
            additionalDocs: []
          },
          stats: {
            matchesPlayed: 5,
            wins: 4,
            losses: 1,
            points: 12
          }
        },
        {
          id: '2',
          name: 'Lightning Strikers',
          sport: 'volleyball',
          category: 'women',
          captainId: 'capt2',
          captain: {
            firstName: 'Priya',
            lastName: 'Sharma',
            email: 'priya.sharma@email.com',
            phone: '+91 9876543211'
          },
          players: [
            { id: 'p9', firstName: 'Priya', lastName: 'Sharma', email: 'priya.sharma@email.com', role: 'player', verified: true },
            { id: 'p10', firstName: 'Anita', lastName: 'Patel', email: 'anita.patel@email.com', role: 'player', verified: true },
            { id: 'p11', firstName: 'Sunita', lastName: 'Kumar', email: 'sunita.kumar@email.com', role: 'player', verified: true },
            { id: 'p12', firstName: 'Kavya', lastName: 'Reddy', email: 'kavya.reddy@email.com', role: 'player', verified: true },
            { id: 'p13', firstName: 'Meera', lastName: 'Joshi', email: 'meera.joshi@email.com', role: 'player', verified: true },
            { id: 'p14', firstName: 'Rekha', lastName: 'Gupta', email: 'rekha.gupta@email.com', role: 'player', verified: false },
            { id: 'p15', firstName: 'Neha', lastName: 'Verma', email: 'neha.verma@email.com', role: 'substitute', verified: true },
            { id: 'p16', firstName: 'Pooja', lastName: 'Singh', email: 'pooja.singh@email.com', role: 'substitute', verified: false }
          ],
          venue: '2',
          status: 'registered',
          verificationStatus: 'in_review',
          registrationDate: '2025-01-18T09:15:00Z',
          lastUpdated: '2025-01-25T11:20:00Z',
          documents: {
            teamPhoto: '/documents/lightning_strikers_photo.jpg',
            captainId: '/documents/priya_id.pdf',
            additionalDocs: []
          },
          stats: {
            matchesPlayed: 3,
            wins: 2,
            losses: 1,
            points: 6
          }
        },
        {
          id: '3',
          name: 'Fire Eagles',
          sport: 'throwball',
          category: 'women',
          captainId: 'capt3',
          captain: {
            firstName: 'Anjali',
            lastName: 'Kumar',
            email: 'anjali.kumar@email.com',
            phone: '+91 9876543212'
          },
          players: [
            { id: 'p17', firstName: 'Anjali', lastName: 'Kumar', email: 'anjali.kumar@email.com', role: 'player', verified: false },
            { id: 'p18', firstName: 'Sita', lastName: 'Rao', email: 'sita.rao@email.com', role: 'player', verified: false },
            { id: 'p19', firstName: 'Gita', lastName: 'Sharma', email: 'gita.sharma@email.com', role: 'player', verified: false }
          ],
          status: 'draft',
          verificationStatus: 'pending',
          registrationDate: '2025-01-25T16:00:00Z',
          lastUpdated: '2025-01-26T10:30:00Z',
          documents: {
            teamPhoto: '',
            captainId: '',
            additionalDocs: []
          }
        }
      ];

      setTeams(mockTeams);
    } catch (error) {
      console.error('Error loading teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTeams = teams.filter(team => {
    const matchesSearch = team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         team.captain.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         team.captain.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         team.captain.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || team.status === statusFilter;
    const matchesSport = sportFilter === 'all' || team.sport === sportFilter;
    const matchesVerification = verificationFilter === 'all' || team.verificationStatus === verificationFilter;
    
    return matchesSearch && matchesStatus && matchesSport && matchesVerification;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-green-100 text-green-800';
      case 'registered': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'disqualified': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified': return <CheckCircle className="w-4 h-4" />;
      case 'registered': return <Clock className="w-4 h-4" />;
      case 'draft': return <AlertCircle className="w-4 h-4" />;
      case 'disqualified': return <XCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getVerificationColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-green-100 text-green-800';
      case 'in_review': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'men': return 'bg-blue-100 text-blue-800';
      case 'women': return 'bg-pink-100 text-pink-800';
      case 'mixed': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const exportTeamsData = () => {
    const csvContent = [
      ['Team Name', 'Sport', 'Category', 'Captain', 'Players Count', 'Status', 'Verification', 'Registration Date'].join(','),
      ...filteredTeams.map(team => [
        team.name,
        team.sport,
        team.category,
        `${team.captain.firstName} ${team.captain.lastName}`,
        team.players.length,
        team.status,
        team.verificationStatus,
        new Date(team.registrationDate).toLocaleDateString()
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

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Teams Management</h1>
          <p className="text-gray-600 mt-2">Manage team registrations, verification, and status</p>
        </div>
        
        <div className="mt-4 sm:mt-0 flex gap-3">
          <Button
            onClick={exportTeamsData}
            variant="outline"
            className="flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button
            onClick={() => router.push(`/${lang}/admin/teams/verification`)}
            variant="outline"
            className="flex items-center"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Verification Queue
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search teams..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F28C38] focus:border-transparent"
            />
          </div>

          {/* Filters */}
          <div className="flex space-x-4">
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-[#F28C38] focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="registered">Registered</option>
                <option value="verified">Verified</option>
                <option value="disqualified">Disqualified</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            </div>

            <div className="relative">
              <select
                value={sportFilter}
                onChange={(e) => setSportFilter(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-[#F28C38] focus:border-transparent"
              >
                <option value="all">All Sports</option>
                <option value="volleyball">Volleyball</option>
                <option value="throwball">Throwball</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            </div>

            <div className="relative">
              <select
                value={verificationFilter}
                onChange={(e) => setVerificationFilter(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-[#F28C38] focus:border-transparent"
              >
                <option value="all">All Verification</option>
                <option value="pending">Pending</option>
                <option value="in_review">In Review</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Teams List */}
      {filteredTeams.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No teams found</h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || statusFilter !== 'all' || sportFilter !== 'all' || verificationFilter !== 'all'
              ? 'Try adjusting your search or filters' 
              : 'Teams will appear here as they register'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTeams.map((team) => (
            <div key={team.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{team.name}</h3>
                    
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(team.status)}`}>
                      {getStatusIcon(team.status)}
                      <span className="ml-1 capitalize">{team.status}</span>
                    </span>
                    
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getVerificationColor(team.verificationStatus)}`}>
                      <span className="capitalize">{team.verificationStatus.replace('_', ' ')}</span>
                    </span>

                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(team.category)}`}>
                      <span className="capitalize">{team.category}</span>
                    </span>

                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      <Trophy className="w-3 h-3 mr-1" />
                      {team.sport}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      <span>Captain: {team.captain.firstName} {team.captain.lastName}</span>
                    </div>
                    <div className="flex items-center">
                      <Mail className="w-4 h-4 mr-2" />
                      <span>{team.captain.email}</span>
                    </div>
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 mr-2" />
                      <span>{team.captain.phone}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <Button
                    onClick={() => router.push(`/${lang}/admin/teams/${team.id}`)}
                    variant="outline"
                    className="text-xs py-1 px-3"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    View
                  </Button>
                  
                  <Button
                    onClick={() => router.push(`/${lang}/admin/teams/${team.id}/edit`)}
                    variant="outline"
                    className="text-xs py-1 px-3"
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="text-xs py-1 px-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* Team Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Users className="w-4 h-4 mr-2" />
                  <span>Players: {team.players.length}</span>
                </div>
                
                <div className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  <span>Verified: {team.players.filter(p => p.verified).length}</span>
                </div>
                
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>Registered: {new Date(team.registrationDate).toLocaleDateString()}</span>
                </div>
                
                {team.venue && (
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span>Venue: {team.venue}</span>
                  </div>
                )}
              </div>

              {/* Team Stats */}
              {team.stats && (
                <div className="flex items-center space-x-6 text-sm text-gray-600 mb-4">
                  <span>Matches: {team.stats.matchesPlayed}</span>
                  <span className="text-green-600">Wins: {team.stats.wins}</span>
                  <span className="text-red-600">Losses: {team.stats.losses}</span>
                  <span className="text-blue-600">Points: {team.stats.points}</span>
                </div>
              )}

              {/* Players Summary */}
              <div className="flex items-start space-x-2">
                <span className="text-sm font-medium text-gray-700 mt-1">Players:</span>
                <div className="flex flex-wrap gap-1">
                  {team.players.slice(0, 6).map((player, index) => (
                    <span key={index} className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      player.verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {player.firstName} {player.lastName}
                      {player.role === 'substitute' && ' (Sub)'}
                    </span>
                  ))}
                  {team.players.length > 6 && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      +{team.players.length - 6} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {teams.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Teams Overview</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-[#3A7F3F]">
                {teams.length}
              </div>
              <div className="text-sm text-gray-600">Total Teams</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {teams.filter(t => t.status === 'verified').length}
              </div>
              <div className="text-sm text-gray-600">Verified</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {teams.filter(t => t.status === 'registered').length}
              </div>
              <div className="text-sm text-gray-600">Registered</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {teams.filter(t => t.verificationStatus === 'in_review').length}
              </div>
              <div className="text-sm text-gray-600">In Review</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {teams.reduce((total, team) => total + team.players.length, 0)}
              </div>
              <div className="text-sm text-gray-600">Total Players</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-[#F28C38]">
                {teams.reduce((total, team) => total + team.players.filter(p => p.verified).length, 0)}
              </div>
              <div className="text-sm text-gray-600">Verified Players</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
