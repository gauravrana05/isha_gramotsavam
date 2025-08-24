'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { AdvancedTable } from '@/components/ui/AdvancedTable';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { Column } from '@/components/ui/Table';
import type { FilterField } from '@/components/ui/FilterSidebar';
import VenueAssignmentModal from './VenueAssignmentModal';
import { 
  Users, 
  MapPin, 
  Trophy, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  Loader2,
  Settings,
  Target,
  RefreshCw
} from 'lucide-react';

interface TeamAssignment {
  assignmentId: string;
  teamId: string;
  teamName: string;
  teamLocation: {
    state: string;
    district: string;
    panchayat: string;
  };
  venueId?: string;
  venueName?: string;
  venueType?: 'cluster' | 'division';
  assignmentLevel?: 'cluster' | 'division';
  status: 'assigned' | 'confirmed' | 'checked_in' | 'pending_manual_assignment';
  assignedBy?: string;
  isAutoAssigned: boolean;
  assignedAt?: string;
  queuedAt?: string;
  reason?: string;
  sportName?: string;
  genderCategory?: string;
  currentLevel?: 'cluster' | 'division';
  isPending: boolean;
}

export default function VenueAssignmentPage() {
  const [assignments, setAssignments] = useState<TeamAssignment[]>([]);
  const [venues, setVenues] = useState<{id: string, name: string, type: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedAssignment, setSelectedAssignment] = useState<TeamAssignment | null>(null);
  const [showVenueAssignModal, setShowVenueAssignModal] = useState(false);
  
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

    loadData();
  }, [user, userProfile, authLoading, lang, router]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadAssignments(),
        loadVenues()
      ]);
    } catch (err) {
      setError('Failed to load venue assignment data');
    } finally {
      setLoading(false);
    }
  };

  const loadAssignments = async () => {
    try {
      const assignmentData: TeamAssignment[] = [];
      
      // 1. Get assigned teams from teamVenueAssignment
      const assignmentsQuery = query(
        collection(db, 'teamVenueAssignment'),
        orderBy('assignedAt', 'desc')
      );

      const assignmentsSnapshot = await getDocs(assignmentsQuery);
      
      for (const doc of assignmentsSnapshot.docs) {
        const data = doc.data();
        
        // Get team details
        const teamDoc = await getDocs(query(collection(db, 'teams'), where('__name__', '==', data.teamId)));
        const teamData = teamDoc.docs[0]?.data();
        
        if (teamData) {
          assignmentData.push({
            assignmentId: doc.id,
            teamId: data.teamId,
            teamName: data.teamName || teamData.name,
            teamLocation: {
              state: teamData.state || '',
              district: teamData.district || '',
              panchayat: teamData.panchayat || ''
            },
            venueId: data.clusterVenueId || data.divisionVenueId || data.venueId,
            venueName: data.clusterVenueName || data.divisionVenueName || data.venueName,
            venueType: data.clusterVenueId ? 'cluster' : 'division',
            assignmentLevel: data.assignmentLevel || (data.clusterVenueId ? 'cluster' : 'division'),
            status: data.status || 'assigned',
            assignedBy: data.assignedBy || 'unknown',
            isAutoAssigned: data.assignedBy === 'system_auto' || data.autoMapped === true,
            assignedAt: data.assignedAt?.toDate?.()?.toISOString() || '',
            sportName: teamData.sportName,
            genderCategory: teamData.genderCategory,
            currentLevel: teamData.currentLevel || 'cluster',
            isPending: false
          });
        }
      }
      
      // 2. Get pending teams from manualVenueAssignmentQueue
      const pendingQuery = query(
        collection(db, 'manualVenueAssignmentQueue'),
        orderBy('queuedAt', 'desc')
      );

      const pendingSnapshot = await getDocs(pendingQuery);
      
      for (const doc of pendingSnapshot.docs) {
        const data = doc.data();
        
        // Get team details
        const teamDoc = await getDocs(query(collection(db, 'teams'), where('__name__', '==', data.teamId)));
        const teamData = teamDoc.docs[0]?.data();
        
        if (teamData) {
          assignmentData.push({
            assignmentId: doc.id,
            teamId: data.teamId,
            teamName: data.teamName || teamData.name,
            teamLocation: data.teamLocation || {
              state: teamData.state || '',
              district: teamData.district || '',
              panchayat: teamData.panchayat || ''
            },
            status: 'pending_manual_assignment',
            isAutoAssigned: false,
            queuedAt: data.queuedAt?.toDate?.()?.toISOString() || '',
            reason: data.reason || 'Unknown reason',
            sportName: teamData.sportName,
            genderCategory: teamData.genderCategory,
            currentLevel: teamData.currentLevel || 'cluster',
            isPending: true
          });
        }
      }
      
      // Sort all data by date (assigned/queued)
      assignmentData.sort((a, b) => {
        const aDate = new Date(a.assignedAt || a.queuedAt || 0);
        const bDate = new Date(b.assignedAt || b.queuedAt || 0);
        return bDate.getTime() - aDate.getTime();
      });
      
      setAssignments(assignmentData);
    } catch (error) {
      setError('Failed to load team assignments');
    }
  };

  const loadVenues = async () => {
    try {
      const venuesSnapshot = await getDocs(
        query(collection(db, 'venues'), where('isActive', '==', true))
      );
      
      const venuesData = venuesSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        type: doc.data().type
      }));
      
      setVenues(venuesData);
    } catch (error) {
      // Failed to load venues
    }
  };



  // Calculate statistics
  const stats = {
    totalAssignments: assignments.length,
    assignedTeams: assignments.filter(a => !a.isPending).length,
    pendingTeams: assignments.filter(a => a.isPending).length,
    clusterAssignments: assignments.filter(a => a.assignmentLevel === 'cluster' && !a.isPending).length,
    divisionAssignments: assignments.filter(a => a.assignmentLevel === 'division' && !a.isPending).length,
    autoAssignments: assignments.filter(a => a.isAutoAssigned && !a.isPending).length,
    manualAssignments: assignments.filter(a => !a.isAutoAssigned && !a.isPending).length
  };

  const columns: Column<TeamAssignment>[] = [
    {
      key: 'teamName',
      header: 'Team',
      sortable: true,
      render: (value, item) => {
        if (!item) return null;
        return (
          <div>
            <div className="font-medium text-gray-900 flex items-center">
              {item.teamName}
              {item.isPending && (
                <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                  Pending
                </span>
              )}
            </div>
            <div className="text-sm text-gray-500">
              {item.sportName} • {item.genderCategory}
            </div>
          </div>
        );
      }
    },
    {
      key: 'teamLocation',
      header: 'Team Location',
      sortable: true,
      render: (value, item) => {
        if (!item) return null;
        return (
          <div className="text-sm">
            <div>{item.teamLocation.panchayat}</div>
            <div className="text-gray-500">{item.teamLocation.district}, {item.teamLocation.state}</div>
          </div>
        );
      }
    },
    {
      key: 'assignmentLevel',
      header: 'Level',
      sortable: true,
      render: (value, item) => {
        if (!item || item.isPending) return <span className="text-gray-400">-</span>;
        const colors = {
          cluster: 'bg-green-100 text-green-800',
          division: 'bg-blue-100 text-blue-800'
        };
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[item.assignmentLevel || 'cluster']}`}>
            <Trophy className="w-3 h-3 mr-1" />
            {item.assignmentLevel}
          </span>
        );
      }
    },
    {
      key: 'venueName',
      header: 'Venue / Status',
      sortable: true,
      render: (value, item) => {
        if (!item) return null;
        
        if (item.isPending) {
          return (
            <div>
              <div className="flex items-center text-yellow-700">
                <AlertTriangle className="w-4 h-4 mr-2" />
                <span className="font-medium">Pending Assignment</span>
              </div>
              {item.reason && (
                <div className="text-xs text-gray-500 mt-1">
                  Reason: {item.reason}
                </div>
              )}
            </div>
          );
        }
        
        return (
          <div className="flex items-center">
            <MapPin className="w-4 h-4 text-gray-400 mr-2" />
            <span>{item.venueName}</span>
          </div>
        );
      }
    },
    {
      key: 'assignedBy',
      header: 'Assignment Type',
      sortable: true,
      render: (value, item) => {
        if (!item) return null;
        
        if (item.isPending) {
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              <Clock className="w-3 h-3 mr-1" />
              Pending
            </span>
          );
        }
        
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            item.isAutoAssigned 
              ? 'bg-green-100 text-green-800' 
              : 'bg-blue-100 text-blue-800'
          }`}>
            {item.isAutoAssigned ? (
              <>
                <CheckCircle className="w-3 h-3 mr-1" />
                Auto
              </>
            ) : (
              <>
                <Settings className="w-3 h-3 mr-1" />
                Manual
              </>
            )}
          </span>
        );
      }
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (value, item) => {
        if (!item) return null;
        const statusColors = {
          assigned: 'bg-yellow-100 text-yellow-800',
          confirmed: 'bg-blue-100 text-blue-800',
          checked_in: 'bg-green-100 text-green-800',
          pending_manual_assignment: 'bg-orange-100 text-orange-800'
        };
        const statusIcons = {
          assigned: Clock,
          confirmed: CheckCircle,
          checked_in: Trophy,
          pending_manual_assignment: AlertTriangle
        };
        const Icon = statusIcons[item.status] || AlertTriangle;
        
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[item.status] || 'bg-gray-100 text-gray-800'}`}>
            <Icon className="w-3 h-3 mr-1" />
            {item.status.replace('_', ' ')}
          </span>
        );
      }
    },
    {
      key: 'assignedAt',
      header: 'Date',
      sortable: true,
      render: (value, item) => {
        if (!item) return null;
        
        if (item.isPending && item.queuedAt) {
          return (
            <div className="text-sm">
              <div className="text-gray-900">Queued:</div>
              <div className="text-gray-500">{new Date(item.queuedAt).toLocaleDateString()}</div>
            </div>
          );
        }
        
        if (item.assignedAt) {
          return (
            <div className="text-sm">
              <div className="text-gray-900">Assigned:</div>
              <div className="text-gray-500">{new Date(item.assignedAt).toLocaleDateString()}</div>
            </div>
          );
        }
        
        return <span className="text-gray-400">-</span>;
      }
    }
  ];

  const filters: FilterField[] = [
    {
      key: 'assignmentLevel',
      label: 'Level',
      type: 'select',
      options: [
        { label: 'Cluster', value: 'cluster' },
        { label: 'Division', value: 'division' }
      ]
    },
    {
      key: 'isAutoAssigned',
      label: 'Assignment Type',
      type: 'select',
      options: [
        { label: 'Auto Assigned', value: 'true' },
        { label: 'Manual Assignment', value: 'false' }
      ]
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { label: 'Assigned', value: 'assigned' },
        { label: 'Confirmed', value: 'confirmed' },
        { label: 'Checked In', value: 'checked_in' }
      ]
    },
    {
      key: 'teamLocation.state',
      label: 'State',
      type: 'text'
    },
    {
      key: 'teamLocation.district',
      label: 'District',
      type: 'text'
    }
  ];

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
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-fira">Team Venue Assignment</h1>
          <p className="text-gray-600 text-sm font-fira">
            Manage team assignments to cluster and division venues
          </p>
          <p className="mt-1 text-xs text-green-600 font-fira">
            ✓ Teams are automatically advanced when tournaments complete
          </p>
        </div>
        
        <Button
          onClick={() => window.location.reload()}
          variant="secondary"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-[#F28C38] mr-3" />
            <div>
              <p className="text-sm text-gray-600">Total Teams</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalAssignments}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Assigned</p>
              <p className="text-2xl font-bold text-gray-900">{stats.assignedTeams}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-8 h-8 text-yellow-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingTeams}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center">
            <Target className="w-8 h-8 text-green-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Cluster</p>
              <p className="text-2xl font-bold text-gray-900">{stats.clusterAssignments}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center">
            <Trophy className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Division</p>
              <p className="text-2xl font-bold text-gray-900">{stats.divisionAssignments}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center">
            <Settings className="w-8 h-8 text-purple-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Manual</p>
              <p className="text-2xl font-bold text-gray-900">{stats.manualAssignments}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Team Assignments Table */}
      <Card className="p-6">
        <AdvancedTable
          data={assignments}
          columns={columns}
          loading={loading}
          
          searchable={true}
          searchPlaceholder="Search teams, venues, locations..."
          searchFields={['teamName', 'venueName']}
          
          filterable={true}
          filters={filters}
          
          sortable={true}
          defaultSort={[{ key: 'assignedAt', direction: 'desc' }]}
          
          pagination={{ enabled: true, pageSize: 25 }}
          
          persistState={true}
          stateKey="admin-venue-assignments"
          
          actions={[
            {
              label: 'Assign/Edit Venue',
              icon: Settings,
              onClick: (assignment) => {
                setSelectedAssignment(assignment);
                setShowVenueAssignModal(true);
              },
              variant: 'secondary',
              tooltip: 'Assign or edit venue for this team'
            }
          ]}
          
          emptyState={{
            icon: MapPin,
            title: 'No venue assignments found',
            description: 'Team venue assignments will appear here once teams are verified and assigned'
          }}
        />
      </Card>

      {/* Venue Assignment Modal */}
      {showVenueAssignModal && selectedAssignment && (
        <VenueAssignmentModal
          isOpen={showVenueAssignModal}
          onClose={() => {
            setShowVenueAssignModal(false);
            setSelectedAssignment(null);
          }}
          assignment={selectedAssignment}
          venues={venues}
          onSuccess={() => {
            setShowVenueAssignModal(false);
            setSelectedAssignment(null);
            loadData(); // Refresh data
            setSuccess('Venue assignment updated successfully');
            setTimeout(() => setSuccess(''), 3000);
          }}
        />
      )}

      {/* Success Message */}
      {success && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded shadow-lg">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              {success}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}