"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, doc, updateDoc, query, where, orderBy } from 'firebase/firestore';
import { 
  AdvancedTable,
  StatsCard,
  PageLoader,
  Button
} from '@/components/ui';
import type { Column, ActionButton } from '@/components/ui';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Users, 
  Trophy, 
  CheckCircle,
  XCircle,
  Clock,
  Loader2
} from 'lucide-react';

interface SimplifiedSport {
  sportId: string;
  name: string;
  displayName: string;
  description: string;
  category: 'individual' | 'team';
  genderCategories: ('men' | 'women')[];
  minPlayers: number;
  maxPlayers: number;
  minSubstitutes: number;
  maxSubstitutes: number;
  minAge: number;
  maxAge?: number;
  maxPlayersUnder21: number;
  allowPET: boolean;
  restrictedToStates: string[];
  scoringSystem: {
    pointsToWin: number;
    setsToWin?: number;
    timeLimit?: number;
    customRules: string[];
  };
  iconURL: string;
  bannerImageURL?: string;
  rulesPDF?: string;
  isActive: boolean;
  availableInEvents: string[];
  createdAt: any;
  updatedAt: any;
}

export default function AdminSportsPage() {
  const [sports, setSports] = useState<SimplifiedSport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingSport, setDeletingSport] = useState<string | null>(null);

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

    loadSports();
  }, [user, userProfile, authLoading, lang, router]);

  const loadSports = async () => {
    try {
      setLoading(true);
      const sportsCollection = collection(db, 'sports');
      const sportsQuery = query(sportsCollection, orderBy('createdAt', 'desc'));
      const sportsSnapshot = await getDocs(sportsQuery);
      
      const sportsData: SimplifiedSport[] = sportsSnapshot.docs.map(doc => ({
        sportId: doc.id,
        ...doc.data()
      })) as SimplifiedSport[];
      
      setSports(sportsData);
    } catch (err: any) {
      // Error handling removed
      setError('Failed to load sports. Please check your permissions.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSport = async (sportId: string) => {
    if (!confirm('Are you sure you want to deactivate this sport?')) {
      return;
    }

    setDeletingSport(sportId);
    try {
      const sportDoc = doc(db, 'sports', sportId);
      await updateDoc(sportDoc, {
        isActive: false,
        updatedAt: new Date()
      });
      
      // Update local state
      setSports(prevSports => 
        prevSports.map(sport => 
          sport.sportId === sportId 
            ? { ...sport, isActive: false, updatedAt: new Date() }
            : sport
        )
      );
      
    } catch (err: any) {
      // Error handling removed
      setError('Failed to deactivate sport. Please try again.');
    } finally {
      setDeletingSport(null);
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const getStatusIcon = (isActive: boolean) => {
    return isActive ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />;
  };
  
  const getCategoryColor = (genderCategories: string[]) => {
    if (genderCategories.includes('men') && genderCategories.includes('women')) {
      return 'bg-purple-100 text-purple-800';
    } else if (genderCategories.includes('men')) {
      return 'bg-blue-100 text-blue-800';
    } else if (genderCategories.includes('women')) {
      return 'bg-pink-100 text-pink-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  // Define table columns for AdvancedTable
  const columns: Column<SimplifiedSport>[] = [
    {
      key: 'name',
      header: 'Sport',
      accessor: 'displayName',
      sortable: true,
      minWidth: 200,
      render: (_, sport) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{sport.displayName}</div>
          <div className="text-sm text-gray-500">{sport.description}</div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      accessor: (sport) => sport.genderCategories.join(' & '),
      sortable: true,
      minWidth: 120,
      render: (_, sport) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(sport.genderCategories)}`}>
          {sport.genderCategories.join(' & ')}
        </span>
      ),
    },
    {
      key: 'players',
      header: 'Players',
      accessor: (sport) => `${sport.maxPlayers} + ${sport.maxSubstitutes}`,
      sortable: true,
      minWidth: 100,
      render: (_, sport) => (
        <span className="text-sm text-gray-900">
          {sport.maxPlayers} + {sport.maxSubstitutes}
        </span>
      ),
    },
    {
      key: 'ageLimit',
      header: 'Age Limit',
      accessor: (sport) => `${sport.minAge}-${sport.maxAge || '∞'}`,
      sortable: true,
      minWidth: 100,
      render: (_, sport) => (
        <span className="text-sm text-gray-900">
          {sport.minAge}-{sport.maxAge || '∞'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      accessor: 'isActive',
      sortable: true,
      minWidth: 100,
      render: (_, sport) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(sport.isActive)}`}>
          {getStatusIcon(sport.isActive)}
          <span className="ml-1">{sport.isActive ? 'Active' : 'Inactive'}</span>
        </span>
      ),
    },
  ];

  // Define action buttons for AdvancedTable
  const actions: ActionButton<SimplifiedSport>[] = [
    {
      label: 'View',
      icon: Eye,
      onClick: (sport) => router.push(`/${lang}/admin/sports/${sport.sportId}`),
      variant: 'primary',
    },
    {
      label: 'Edit',
      icon: Edit,
      onClick: (sport) => router.push(`/${lang}/admin/sports/${sport.sportId}/edit`),
      variant: 'secondary',
    },
    {
      label: 'Deactivate',
      icon: Trash2,
      onClick: (sport) => handleDeleteSport(sport.sportId),
      variant: 'danger',
      loading: (sport) => deletingSport === sport.sportId,
    },
  ];

  if (authLoading || loading) {
    return <PageLoader title="Loading sports..." variant="minimal" />;
  }

  if (!user || userProfile?.role !== 'admin') {
    return null;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sports Management</h1>
          <p className="text-gray-600 text-sm">Manage sports and their configurations</p>
        </div>
        
        <Button
          onClick={() => router.push(`/${lang}/admin/sports/create`)}
          leftIcon={Plus}
          variant="primary"
          size="sm"
        >
          Add Sport
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* AdvancedTable */}
      <AdvancedTable<SimplifiedSport>
        data={sports}
        columns={columns}
        actions={actions}
        loading={loading}
        searchable={true}
        searchPlaceholder="Search sports..."
        filterable={false}
        sortable={true}
        defaultSort={[{ key: 'name', direction: 'asc' }]}
        pagination={{ enabled: false }}
        emptyState={{
          icon: Trophy,
          title: 'No sports found',
          description: 'Create your first sport to get started.',
          action: {
            label: 'Add Sport',
            onClick: () => router.push(`/${lang}/admin/sports/create`),
          },
        }}
        keyExtractor={(sport) => sport.sportId}
        stickyHeader={true}
      />

      {/* Stats Cards */}
      {sports.length > 0 && (
        <div className="mt-8">
          <StatsCard 
            stats={[
              {
                label: 'Active',
                value: sports.filter(s => s.isActive).length,
                color: 'success' as const,
              },
              {
                label: 'Team Sports',
                value: sports.filter(s => s.category === 'team').length,
                color: 'info' as const,
              },
              {
                label: 'Inactive',
                value: sports.filter(s => !s.isActive).length,
                color: 'error' as const,
              },
            ]}
            columns={3}
            size="base"
            showBorder
          />
        </div>
      )}
    </div>
  );
}