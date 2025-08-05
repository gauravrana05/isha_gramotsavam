"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, orderBy, where, limit, startAfter, DocumentSnapshot, doc, getDoc } from 'firebase/firestore';
import { 
  Users,
  Clock,
  Eye,
  Search,
  ChevronDown,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  Calendar,
  Download,
  Loader2,
  Filter,
  ChevronLeft,
  ChevronRight,
  FileText
} from 'lucide-react';

interface AuditLog {
  id: string;
  // Action Details
  action: string;
  resource: string;
  resourceId: string;
  
  // User Context
  userId: string;
  userRole: string;
  userDisplayName?: string; // We'll fetch this
  ipAddress: string;
  userAgent: string;
  
  // Context
  venueId?: string;
  venueDisplayName?: string; // We'll fetch this
  verificationType?: 'document_verification' | 'onground_verification' | 'eligibility_check';
  targetUserId?: string;
  targetUserDisplayName?: string; // We'll fetch this
  targetTeamId?: string;
  targetTeamDisplayName?: string; // We'll fetch this
  documentType?: 'profilePhoto' | 'aadhaarFront' | 'aadhaarBack';
  uploadReason?: string;
  mediaType?: 'photo' | 'video';
  mediaCategory?: 'team_photo' | 'match_action' | 'celebration' | 'venue_documentation';
  
  // Changes
  changeDescription: string;
  oldValue?: string;
  newValue?: string;
  
  // Context IDs
  eventId?: string;
  teamId?: string;
  matchId?: string;
  playerId?: string;
  mediaId?: string;
  
  // Result
  success: boolean;
  errorMessage?: string;
  timestamp: any;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [resourceFilter, setResourceFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  
  const logsPerPage = 25;
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

    loadAuditLogs();
  }, [user, userProfile, authLoading, lang, router, currentPage, actionFilter, resourceFilter, roleFilter]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      let auditQuery = query(
        collection(db, 'auditLog'),
        orderBy('timestamp', 'desc'),
        limit(logsPerPage)
      );

      // Add filters
      if (actionFilter !== 'all') {
        auditQuery = query(auditQuery, where('action', '==', actionFilter));
      }

      if (resourceFilter !== 'all') {
        auditQuery = query(auditQuery, where('resource', '==', resourceFilter));
      }

      if (roleFilter !== 'all') {
        auditQuery = query(auditQuery, where('userRole', '==', roleFilter));
      }

      // Handle pagination
      if (currentPage > 1 && lastDoc) {
        auditQuery = query(auditQuery, startAfter(lastDoc));
      }

      const auditSnapshot = await getDocs(auditQuery);
      
      if (auditSnapshot.empty) {
        setLogs([]);
        setHasNextPage(false);
      } else {
        const auditData: AuditLog[] = [];
        
        // Process each log and fetch related display names
        for (const docSnapshot of auditSnapshot.docs) {
          const logData = docSnapshot.data();
          const enrichedLog: AuditLog = {
            id: docSnapshot.id,
            ...logData
          } as AuditLog;

          // Fetch user display name
          if (logData.userId) {
            try {
              const userDoc = await getDoc(doc(db, 'users', logData.userId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                enrichedLog.userDisplayName = `${userData.firstName} ${userData.lastName}`.trim();
              }
            } catch (error) {
              console.warn('Could not fetch user name for:', logData.userId);
            }
          }

          // Fetch target user display name
          if (logData.targetUserId) {
            try {
              const targetUserDoc = await getDoc(doc(db, 'users', logData.targetUserId));
              if (targetUserDoc.exists()) {
                const targetUserData = targetUserDoc.data();
                enrichedLog.targetUserDisplayName = `${targetUserData.firstName} ${targetUserData.lastName}`.trim();
              }
            } catch (error) {
              console.warn('Could not fetch target user name for:', logData.targetUserId);
            }
          }

          // Fetch team display name
          if (logData.targetTeamId) {
            try {
              const teamDoc = await getDoc(doc(db, 'teams', logData.targetTeamId));
              if (teamDoc.exists()) {
                const teamData = teamDoc.data();
                enrichedLog.targetTeamDisplayName = teamData.name;
              }
            } catch (error) {
              console.warn('Could not fetch team name for:', logData.targetTeamId);
            }
          }

          // Fetch venue display name
          if (logData.venueId) {
            try {
              const venueDoc = await getDoc(doc(db, 'venues', logData.venueId));
              if (venueDoc.exists()) {
                const venueData = venueDoc.data();
                enrichedLog.venueDisplayName = venueData.name;
              }
            } catch (error) {
              console.warn('Could not fetch venue name for:', logData.venueId);
            }
          }

          auditData.push(enrichedLog);
        }
        
        setLogs(auditData);
        setLastDoc(auditSnapshot.docs[auditSnapshot.docs.length - 1]);
        setHasNextPage(auditSnapshot.docs.length === logsPerPage);
      }
      
    } catch (err: any) {
      console.error('Error loading audit logs:', err);
      setError('Failed to load audit logs. Please check your permissions.');
    } finally {
      setLoading(false);
    }
  };


  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.changeDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userDisplayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.targetUserDisplayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.targetTeamDisplayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.venueDisplayName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const getResourceColor = (resource: string) => {
    switch (resource) {
      case 'player': return 'bg-blue-100 text-blue-800';
      case 'team': return 'bg-green-100 text-green-800';
      case 'document': return 'bg-orange-100 text-orange-800';
      case 'media': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getResourceIcon = (resource: string) => {
    switch (resource) {
      case 'player': return <User className="w-4 h-4" />;
      case 'team': return <Users className="w-4 h-4" />;
      case 'document': return <FileText className="w-4 h-4" />;
      case 'media': return <Eye className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'verification_volunteer': return 'bg-purple-100 text-purple-800';
      case 'volunteer_technical': return 'bg-indigo-100 text-indigo-800';
      case 'volunteer_general': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'Action', 'Resource', 'Performed By', 'Role', 'Target', 'Change', 'Success', 'Venue', 'IP Address'].join(','),
      ...filteredLogs.map(log => [
        log.timestamp?.toDate?.() ? log.timestamp.toDate().toLocaleString() : new Date(log.timestamp).toLocaleString(),
        log.action,
        log.resource,
        log.userDisplayName || log.userId,
        log.userRole,
        log.targetUserDisplayName || log.targetTeamDisplayName || '',
        log.changeDescription,
        log.success ? 'Yes' : 'No',
        log.venueDisplayName || '',
        log.ipAddress || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
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
            Audit Logs
          </h1>
          <p className="text-sm sm:text-base text-gray-600 font-fira">
            Track verification activities and system changes
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Actions</p>
                <p className="text-2xl font-bold text-[#4A2F1D]">{logs.length}</p>
              </div>
              <Clock className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Player Actions</p>
                <p className="text-2xl font-bold text-blue-600">{logs.filter(l => l.resource === 'player').length}</p>
              </div>
              <User className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Document Actions</p>
                <p className="text-2xl font-bold text-orange-600">{logs.filter(l => l.resource === 'document').length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-orange-400" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Unique Volunteers</p>
                <p className="text-2xl font-bold text-green-600">{new Set(logs.map(l => l.userId)).size}</p>
              </div>
              <Users className="w-8 h-8 text-green-400" />
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search actions, users, teams, or players..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F28C38] focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="relative">
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-[#F28C38] focus:border-transparent"
                >
                  <option value="all">All Actions</option>
                  <option value="team_player_verification">Player Verification</option>
                  <option value="onground_player_verification">On-ground Verification</option>
                  <option value="volunteer_document_upload">Document Upload</option>
                  <option value="volunteer_media_upload">Media Upload</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              </div>

              <div className="relative">
                <select
                  value={resourceFilter}
                  onChange={(e) => setResourceFilter(e.target.value)}
                  className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-[#F28C38] focus:border-transparent"
                >
                  <option value="all">All Resources</option>
                  <option value="player">Player</option>
                  <option value="team">Team</option>
                  <option value="document">Document</option>
                  <option value="media">Media</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              </div>

              <div className="relative">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-[#F28C38] focus:border-transparent"
                >
                  <option value="all">All Roles</option>
                  <option value="verification_volunteer">Verification Volunteer</option>
                  <option value="volunteer_technical">Technical Volunteer</option>
                  <option value="volunteer_general">General Volunteer</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              </div>

              <button
                onClick={exportLogs}
                className="bg-[#F28C38] hover:bg-[#E67A26] text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Audit Logs List */}
        {filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 font-fira mb-2">
              No audit logs found
            </h3>
            <p className="text-gray-600 font-fira">
              {searchTerm || actionFilter !== 'all' || resourceFilter !== 'all' || roleFilter !== 'all'
                ? 'Try adjusting your search or filters' 
                : 'Audit logs will appear here as verification activities occur'}
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resource</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Volunteer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Change</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.timestamp?.toDate?.() ? log.timestamp.toDate().toLocaleString('en-IN', { 
                          day: '2-digit', 
                          month: 'short', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : new Date(log.timestamp).toLocaleString('en-IN', { 
                          day: '2-digit', 
                          month: 'short', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{log.action}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getResourceColor(log.resource)}`}>
                          {getResourceIcon(log.resource)}
                          <span className="ml-1 capitalize">{log.resource}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{log.userDisplayName || log.userId}</div>
                        <div className="text-xs text-gray-500">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${getRoleColor(log.userRole)}`}>
                            {log.userRole.replace('_', ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {log.targetUserDisplayName && (
                            <div>User: {log.targetUserDisplayName}</div>
                          )}
                          {log.targetTeamDisplayName && (
                            <div>Team: {log.targetTeamDisplayName}</div>
                          )}
                          {log.venueDisplayName && (
                            <div className="text-xs text-gray-500">Venue: {log.venueDisplayName}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs">
                          {log.changeDescription}
                          {log.oldValue && log.newValue && (
                            <div className="text-xs text-gray-500 mt-1">
                              {log.oldValue} → {log.newValue}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          log.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {log.success ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                          {log.success ? 'Success' : 'Failed'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {filteredLogs.map((log) => (
                <div key={log.id} className="bg-white rounded-lg shadow-sm border p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{log.action}</h3>
                      <p className="text-sm text-gray-600">
                        {log.timestamp?.toDate?.() ? log.timestamp.toDate().toLocaleString('en-IN', { 
                          day: '2-digit', 
                          month: 'short', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : new Date(log.timestamp).toLocaleString('en-IN', { 
                          day: '2-digit', 
                          month: 'short', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getResourceColor(log.resource)}`}>
                        {getResourceIcon(log.resource)}
                        <span className="ml-1 capitalize">{log.resource}</span>
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        log.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {log.success ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                        {log.success ? 'Success' : 'Failed'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div><strong>Volunteer:</strong> {log.userDisplayName || log.userId}</div>
                    <div><strong>Role:</strong> 
                      <span className={`ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${getRoleColor(log.userRole)}`}>
                        {log.userRole.replace('_', ' ')}
                      </span>
                    </div>
                    {log.targetUserDisplayName && (
                      <div><strong>Target User:</strong> {log.targetUserDisplayName}</div>
                    )}
                    {log.targetTeamDisplayName && (
                      <div><strong>Target Team:</strong> {log.targetTeamDisplayName}</div>
                    )}
                    {log.venueDisplayName && (
                      <div><strong>Venue:</strong> {log.venueDisplayName}</div>
                    )}
                    <div><strong>Change:</strong> {log.changeDescription}</div>
                    {log.oldValue && log.newValue && (
                      <div><strong>Status:</strong> {log.oldValue} → {log.newValue}</div>
                    )}
                    {log.uploadReason && (
                      <div><strong>Reason:</strong> {log.uploadReason}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-700">
                Showing page {currentPage} of audit logs
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={!hasNextPage}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          </>
        )}
    </div>
  );
}