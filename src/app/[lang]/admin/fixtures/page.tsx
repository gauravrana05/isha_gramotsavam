'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { AdvancedTable, type AdvancedTableConfig } from '@/components/ui/AdvancedTable';
import type { Column } from '@/components/ui/Table';
import type { FilterField } from '@/components/ui/FilterSidebar';
import Link from 'next/link';
import { 
  Trophy,
  Users,
  MapPin,
  Calendar,
  Play,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  Edit,
  Trash2,
  Filter,
  Loader2,
  Target
} from 'lucide-react';

interface Fixture {
  id: string;
  name?: string;
  sportName?: string;
  genderCategory?: string;
  venueName?: string;
  level?: string;
  status?: string;
  assignedTeams?: any[];
  createdAt?: string | null;
  updatedAt?: string | null;
  completedAt?: string | null;
  [key: string]: any;
}

export default function AdminFixturesPage() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [venues, setVenues] = useState<{id: string, name: string}[]>([]);
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

    loadFixtures();
    loadVenues();
  }, [user, userProfile, authLoading, lang, router]);

  const loadFixtures = async () => {
    try {
      setLoading(true);
      const fixturesQuery = query(
        collection(db, 'fixtures'),
        orderBy('createdAt', 'desc'),
        limit(100)
      );

      const fixturesSnapshot = await getDocs(fixturesQuery);
      
      const fixturesData: Fixture[] = fixturesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
        completedAt: doc.data().completedAt?.toDate?.()?.toISOString() || null
      }));
        
      setFixtures(fixturesData);
      
    } catch (err: any) {
      console.error('Error loading fixtures:', err);
      setError('Failed to load fixtures. Please check your permissions.');
    } finally {
      setLoading(false);
    }
  };

  const loadVenues = async () => {
    try {
      const venuesSnapshot = await getDocs(collection(db, 'venues'));
      const venuesData = venuesSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name
      }));
      setVenues(venuesData);
    } catch (error) {
      console.error('Error loading venues:', error);
    }
  };

  // Calculate statistics
  const stats = {
    totalFixtures: fixtures.length,
    byStatus: { draft: 0, teams_assigned: 0, in_progress: 0, completed: 0 },
    byLevel: { cluster: 0, division: 0, final: 0 }
  };
  
  fixtures.forEach(fixture => {
    if (typeof fixture.status === 'string' && fixture.status in stats.byStatus) {
      stats.byStatus[fixture.status as keyof typeof stats.byStatus]++;
    }
    if (typeof fixture.level === 'string' && fixture.level in stats.byLevel) {
      stats.byLevel[fixture.level as keyof typeof stats.byLevel]++;
    }
  });

  // AdvancedTable configuration
  const columns: Column<Fixture>[] = [
    {
      key: 'name',
      header: 'Tournament',
      render: (value, item, index) => {
        if (!item) return null;
        return (
          <div>
            <div className="text-sm font-medium text-gray-900">{item.name}</div>
            <div className="text-sm text-gray-500">{item.sportName} • {item.genderCategory}</div>
          </div>
        );
      },
      sortable: true
    },
    {
      key: 'venueName',
      header: 'Venue',
      render: (value, item, index) => {
        if (!item) return null;
        return (
          <div className="flex items-center text-sm text-gray-900">
            <MapPin className="w-4 h-4 text-gray-400 mr-1" />
            {item.venueName}
          </div>
        );
      },
      sortable: true
    },
    {
      key: 'level',
      header: 'Level',
      render: (value, item, index) => {
        if (!item) return null;
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLevelColor(item.level)}`}>
            {item.level}
          </span>
        );
      },
      sortable: true
    },
    {
      key: 'assignedTeams',
      header: 'Teams',
      render: (value, item, index) => {
        if (!item) return null;
        return (
          <div className="flex items-center">
            <Users className="w-4 h-4 text-gray-400 mr-1" />
            {item.assignedTeams?.length || 0}
          </div>
        );
      }
    },
    {
      key: 'status',
      header: 'Status',
      render: (value, item, index) => {
        if (!item) return null;
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
            {getStatusIcon(item.status)}
            <span className="ml-1 capitalize">{item.status?.replace('_', ' ')}</span>
          </span>
        );
      },
      sortable: true
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (value, item, index) => {
        if (!item || !item.createdAt) return null;
        return (
          <div className="text-sm text-gray-500">
            {new Date(item.createdAt).toLocaleDateString()}
          </div>
        );
      },
      sortable: true
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (value, item, index) => {
        if (!item) return null;
        return (
          <div className="flex space-x-2">
            <Link 
              href={`/${lang}/admin/fixtures/${item.id}`}
              className="text-[#F28C38] hover:text-[#E67A26] flex items-center"
            >
              <Eye className="w-4 h-4 mr-1" />
              View
            </Link>
            <Link 
              href={`/${lang}/admin/fixtures/${item.id}/edit`}
              className="text-blue-600 hover:text-blue-800 flex items-center"
            >
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </Link>
          </div>
        );
      }
    }
  ];

  const filters: FilterField[] = [
    {
      key: 'venueName',
      label: 'Venue',
      type: 'select',
      options: venues.map(venue => ({ label: venue.name, value: venue.name }))
    },
    {
      key: 'level',
      label: 'Level',
      type: 'select',
      options: [
        { label: 'Cluster', value: 'cluster' },
        { label: 'Division', value: 'division' },
        { label: 'Final', value: 'final' }
      ]
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Teams Assigned', value: 'teams_assigned' },
        { label: 'In Progress', value: 'in_progress' },
        { label: 'Completed', value: 'completed' }
      ]
    },
    {
      key: 'sportName',
      label: 'Sport',
      type: 'text'
    }
  ];
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'teams_assigned': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'in_progress': return <Play className="w-4 h-4" />;
      case 'teams_assigned': return <Users className="w-4 h-4" />;
      case 'draft': return <Clock className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };
  const getLevelColor = (level?: string) => {
    switch (level) {
      case 'final': return 'bg-purple-100 text-purple-800';
      case 'division': return 'bg-blue-100 text-blue-800';
      case 'cluster': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
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
            onClick={loadFixtures}
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Fixtures</p>
              <p className="text-2xl font-bold text-[#4A2F1D]">{stats.totalFixtures}</p>
            </div>
            <Trophy className="w-8 h-8 text-[#F28C38]" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Completed</p>
              <p className="text-2xl font-bold text-green-600">{stats.byStatus.completed}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">In Progress</p>
              <p className="text-2xl font-bold text-blue-600">{stats.byStatus.in_progress}</p>
            </div>
            <Play className="w-8 h-8 text-blue-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Draft</p>
              <p className="text-2xl font-bold text-gray-600">{stats.byStatus.draft}</p>
            </div>
            <Clock className="w-8 h-8 text-gray-400" />
          </div>
        </div>
      </div>

      {/* AdvancedTable */}
      <AdvancedTable
        title="Tournament Fixtures"
        subtitle="Monitor all tournament fixtures across venues"
        data={fixtures}
        columns={columns}
        loading={loading}
        
        searchable={true}
        searchPlaceholder="Search fixtures, sports, venues..."
        searchFields={['name', 'sportName', 'venueName']}
        
        filterable={true}
        filters={filters}
        
        sortable={true}
        defaultSort={[{ key: 'createdAt', direction: 'desc' }]}
        
        pagination={{ enabled: true, pageSize: 25 }}
        
        persistState={true}
        stateKey="admin-fixtures"
        
        emptyState={{
          icon: Target,
          title: 'No fixtures found',
          description: 'Tournament fixtures will appear here once created by volunteers'
        }}
      />
    </div>
  );
}