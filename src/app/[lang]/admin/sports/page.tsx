"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, doc, updateDoc, query, where, orderBy } from 'firebase/firestore';
import Container from '@/components/ui/Container';
import Button from '@/components/ui/Button';
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
      console.error('Error loading sports:', err);
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
      console.error('Error deactivating sport:', err);
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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#CE4520]" />
      </div>
    );
  }

  if (!user || userProfile?.role !== 'admin') {
    return null;
  }

  return (
    <Container>
      <div className="max-w-7xl mx-auto py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sports Management</h1>
            <p className="text-gray-600 text-sm">Manage sports and their configurations</p>
          </div>
          
          <Button
            onClick={() => router.push(`/${lang}/admin/sports/create`)}
            className="bg-[#CE4520] hover:bg-[#1565C0]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Sport
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Sports Table - Desktop */}
        {sports.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border">
            <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No sports found</h3>
            <p className="text-gray-600 mb-4">Create your first sport to get started.</p>
            <Button
              onClick={() => router.push(`/${lang}/admin/sports/create`)}
              className="bg-[#CE4520] hover:bg-[#1565C0]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Sport
            </Button>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block bg-white rounded-lg border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sport</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Players</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Age Limit</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sports.map((sport) => (
                      <tr key={sport.sportId} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{sport.displayName}</div>
                            <div className="text-sm text-gray-500">{sport.description}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(sport.genderCategories)}`}>
                            {sport.genderCategories.join(' & ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {sport.maxPlayers} + {sport.maxSubstitutes}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {sport.minAge}-{sport.maxAge || '∞'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(sport.isActive)}`}>
                            {getStatusIcon(sport.isActive)}
                            <span className="ml-1">{sport.isActive ? 'Active' : 'Inactive'}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => router.push(`/${lang}/admin/sports/${sport.sportId}`)}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => router.push(`/${lang}/admin/sports/${sport.sportId}/edit`)}
                              className="text-yellow-600 hover:text-yellow-900"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteSport(sport.sportId)}
                              disabled={deletingSport === sport.sportId}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50"
                            >
                              {deletingSport === sport.sportId ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
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
              {sports.map((sport) => (
                <div key={sport.sportId} className="bg-white rounded-lg border p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">{sport.displayName}</h3>
                      <p className="text-sm text-gray-500 mt-1">{sport.description}</p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(sport.isActive)} ml-2`}>
                      {getStatusIcon(sport.isActive)}
                      <span className="ml-1">{sport.isActive ? 'Active' : 'Inactive'}</span>
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <span className="text-xs text-gray-500">Category</span>
                      <div className="mt-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(sport.genderCategories)}`}>
                          {sport.genderCategories.join(' & ')}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Players</span>
                      <p className="text-sm font-medium text-gray-900 mt-1">{sport.maxPlayers} + {sport.maxSubstitutes}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Age Limit</span>
                      <p className="text-sm font-medium text-gray-900 mt-1">{sport.minAge}-{sport.maxAge || '∞'}</p>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 pt-3 border-t">
                    <button
                      onClick={() => router.push(`/${lang}/admin/sports/${sport.sportId}`)}
                      className="flex items-center justify-center px-3 py-2 text-sm text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-md flex-1"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </button>
                    <button
                      onClick={() => router.push(`/${lang}/admin/sports/${sport.sportId}/edit`)}
                      className="flex items-center justify-center px-3 py-2 text-sm text-yellow-600 hover:text-yellow-900 hover:bg-yellow-50 rounded-md flex-1"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteSport(sport.sportId)}
                      disabled={deletingSport === sport.sportId}
                      className="flex items-center justify-center px-3 py-2 text-sm text-red-600 hover:text-red-900 hover:bg-red-50 rounded-md disabled:opacity-50"
                    >
                      {deletingSport === sport.sportId ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Simple Stats */}
        {sports.length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg border text-center">
              <div className="text-2xl font-bold text-green-600">{sports.filter(s => s.isActive).length}</div>
              <div className="text-sm text-gray-600">Active</div>
            </div>
            <div className="bg-white p-4 rounded-lg border text-center">
              <div className="text-2xl font-bold text-blue-600">{sports.filter(s => s.category === 'team').length}</div>
              <div className="text-sm text-gray-600">Team Sports</div>
            </div>
            <div className="bg-white p-4 rounded-lg border text-center">
              <div className="text-2xl font-bold text-red-600">{sports.filter(s => !s.isActive).length}</div>
              <div className="text-sm text-gray-600">Inactive</div>
            </div>
          </div>
        )}
      </div>
    </Container>
  );
}