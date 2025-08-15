"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, orderBy, where, limit, startAfter, DocumentSnapshot, doc, getDoc } from 'firebase/firestore';
import { AdvancedTable, type AdvancedTableConfig } from '@/components/ui/AdvancedTable';
import type { Column } from '@/components/ui/Table';
import type { FilterField } from '@/components/ui/FilterSidebar';
import { 
  Users,
  Clock,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  Download,
  Loader2,
  FileText,
  Upload,
  UserCheck
} from 'lucide-react';

interface AuditLog {
  id: string;
  action?: string;
  volunteer?: {
    id: string;
    name: string;
    role: string;
  };
  player?: { 
    id: string; 
    name: string; 
  };
  team?: { 
    id: string; 
    name: string; 
  };
  venue?: string;
  documentType?: string;
  status?: string;
  comments?: string;
  success?: boolean;
  timestamp?: any;
  // Add any other possible fields
  [key: string]: any;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
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
  }, [user, userProfile, authLoading, lang, router]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const auditQuery = query(
        collection(db, 'auditLogs'),
        orderBy('timestamp', 'desc'),
        limit(100)
      );

      const auditSnapshot = await getDocs(auditQuery);
      
      if (!auditSnapshot.empty) {
        // Get all logs and filter for valid audit logs
        const allLogs = auditSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as AuditLog));
        
        // Strict filtering for valid audit logs
        const auditData: AuditLog[] = allLogs.filter(log => {
          // Must have all required fields
          const hasValidStructure = (
            log.volunteer && 
            typeof log.volunteer === 'object' &&
            'name' in log.volunteer &&
            'role' in log.volunteer &&
            log.volunteer.name && 
            log.volunteer.role &&
            log.action &&
            ['player_verification', 'document_upload', 'onground_verification'].includes(log.action) &&
            log.timestamp // Must have timestamp
          );
          
          return hasValidStructure;
        }) as AuditLog[];
        
        
        setLogs(auditData);
      } else {
        setLogs([]);
      }
      
    } catch (err: any) {
      console.error('Error loading audit logs:', err);
      setError('Failed to load audit logs. Please check your permissions.');
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'player_verification': return <UserCheck className="w-4 h-4" />;
      case 'document_upload': return <Upload className="w-4 h-4" />;
      case 'onground_verification': return <Eye className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'player_verification': return 'Player Verification';
      case 'document_upload': return 'Document Upload';
      case 'onground_verification': return 'On-ground Verification';
      default: return action;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'verification_volunteer': return 'bg-purple-100 text-purple-800';
      case 'technical_volunteer': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'verified':
      case 'uploaded': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // AdvancedTable configuration
  const columns: Column<AuditLog>[] = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      render: (value, item, index) => {
        // Safety check for undefined item
        if (!item || !item.timestamp) {
          return null; // Don't render invalid entries
        }
        
        try {
          const date = item.timestamp?.toDate?.() ? item.timestamp.toDate() : new Date(item.timestamp);
          return (
            <div className="text-sm text-gray-600">
              {date.toLocaleDateString('en-IN', { 
                day: '2-digit', 
                month: 'short', 
                year: 'numeric' 
              })}
              <br />
              <span className="text-xs text-gray-500">
                {date.toLocaleTimeString('en-IN', { 
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          );
        } catch (error) {
          return null; // Don't render invalid entries
        }
      },
      sortable: true,
      width: '120px'
    },
    {
      key: 'action',
      header: 'Action',
      render: (value, item, index) => {
        // Safety check for undefined item
        if (!item || !item.action) {
          return null; // Don't render invalid entries
        }
        
        const action = item.action;
        
        return (
          <div className="flex items-center">
            {getActionIcon(action)}
            <span className="ml-2 font-medium text-gray-900">
              {getActionLabel(action)}
            </span>
          </div>
        );
      },
      sortable: true
    },
    {
      key: 'volunteer',
      header: 'Volunteer',
      render: (value, item, index) => {
        // Safety check for undefined item
        if (!item || !item.volunteer || !item.volunteer.name || !item.volunteer.role) {
          return null; // Don't render invalid entries
        }
        
        return (
          <div>
            <div className="text-sm font-medium text-gray-900">{item.volunteer.name}</div>
            <div className="text-xs">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getRoleColor(item.volunteer.role)}`}>
                {item.volunteer.role.replace('_', ' ')}
              </span>
            </div>
          </div>
        );
      },
      width: '180px'
    },
    {
      key: 'target',
      header: 'Player/Team',
      render: (value, item, index) => {
        // Safety check for undefined item
        if (!item) {
          return null;
        }
        
        return (
          <div className="text-sm">
            {item.player && (
              <div className="font-medium text-gray-900">{item.player.name}</div>
            )}
            {item.team && (
              <div className="text-gray-600 text-xs">Team: {item.team.name}</div>
            )}
            {item.venue && (
              <div className="text-gray-500 text-xs">Venue: {item.venue}</div>
            )}
          </div>
        );
      },
      width: '200px'
    },
    {
      key: 'status',
      header: 'Status',
      render: (value, item, index) => {
        // Safety check for undefined item
        if (!item) {
          return null;
        }
        
        const status = item.status || 'unknown';
        
        return (
          <div>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
              {item.success ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
              {status}
            </span>
            {item.documentType && (
              <div className="text-xs text-gray-500 mt-1">{item.documentType}</div>
            )}
          </div>
        );
      },
      width: '120px'
    },
    {
      key: 'comments',
      header: 'Comments',
      render: (value, item, index) => {
        // Safety check for undefined item
        if (!item) {
          return null;
        }
        
        return (
          <div className="text-sm text-gray-600 max-w-xs truncate" title={item.comments}>
            {item.comments || '-'}
          </div>
        );
      },
      width: '200px'
    }
  ];

  const filters: FilterField[] = [
    {
      key: 'action',
      label: 'Action',
      type: 'select',
      options: [
        { label: 'Player Verification', value: 'player_verification' },
        { label: 'Document Upload', value: 'document_upload' },
        { label: 'On-ground Verification', value: 'onground_verification' }
      ]
    },
    {
      key: 'volunteer.role',
      label: 'Volunteer Type',
      type: 'select',
      options: [
        { label: 'Verification Volunteer', value: 'verification_volunteer' },
        { label: 'Technical Volunteer', value: 'technical_volunteer' }
      ]
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { label: 'Approved', value: 'approved' },
        { label: 'Rejected', value: 'rejected' },
        { label: 'Uploaded', value: 'uploaded' },
        { label: 'Verified', value: 'verified' }
      ]
    }
  ];

  const exportOptions = [
    {
      label: 'Export CSV',
      format: 'csv' as const,
      onExport: () => {
        const csvContent = [
          ['Timestamp', 'Action', 'Volunteer', 'Role', 'Player', 'Team', 'Venue', 'Status', 'Comments'].join(','),
          ...logs.map(log => [
            log.timestamp?.toDate?.() ? log.timestamp.toDate().toLocaleString() : new Date(log.timestamp).toLocaleString(),
            getActionLabel(log.action || ''),
            log.volunteer?.name || '',
            log.volunteer?.role || '',
            log.player?.name || '',
            log.team?.name || '',
            log.venue || '',
            log.status,
            log.comments || ''
          ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
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
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={loadAuditLogs}
            className="bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
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
              <p className="text-gray-600 text-sm">Player Verifications</p>
              <p className="text-2xl font-bold text-purple-600">
                {logs.filter(l => l.action === 'player_verification').length}
              </p>
            </div>
            <UserCheck className="w-8 h-8 text-purple-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Document Uploads</p>
              <p className="text-2xl font-bold text-indigo-600">
                {logs.filter(l => l.action === 'document_upload').length}
              </p>
            </div>
            <Upload className="w-8 h-8 text-indigo-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">On-ground Verifications</p>
              <p className="text-2xl font-bold text-green-600">
                {logs.filter(l => l.action === 'onground_verification').length}
              </p>
            </div>
            <Eye className="w-8 h-8 text-green-400" />
          </div>
        </div>
      </div>

      {/* AdvancedTable */}
      <AdvancedTable
        title="Audit Logs"
        subtitle="Track verification activities and system changes"
        data={logs}
        columns={columns}
        loading={loading}
        
        searchable={true}
        searchPlaceholder="Search volunteers, players, teams..."
        searchFields={['action', 'comments']}
        
        filterable={true}
        filters={filters}
        
        sortable={true}
        defaultSort={[{ key: 'timestamp', direction: 'desc' }]}
        
        pagination={{ enabled: true, pageSize: 25 }}
        exportOptions={exportOptions}
        
        persistState={true}
        stateKey="audit-logs"
        
        emptyState={{
          icon: Clock,
          title: 'No audit logs found',
          description: 'Audit logs will appear here as verification activities occur'
        }}
      />
    </div>
  );
}