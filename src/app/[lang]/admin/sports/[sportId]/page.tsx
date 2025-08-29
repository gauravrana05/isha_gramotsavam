"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import Container from '@/components/ui/Container';
import Button from '@/components/ui/Button';
import { ArrowLeft, Edit, Users, Trophy, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface Sport {
  sportId: string;
  name: string;
  displayName: string;
  description: string;
  category: 'individual' | 'team';
  genderCategories: string[];
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

export default function SportDetailPage() {
  const [sport, setSport] = useState<Sport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const router = useRouter();
  const { lang, sportId } = useParams();
  const { user, userProfile } = useAuth();

  useEffect(() => {
    if (!user || userProfile?.role !== 'admin') {
      router.push(`/${lang}/login`);
      return;
    }

    loadSport();
  }, [user, userProfile, sportId]);

  const loadSport = async () => {
    try {
      setLoading(true);
      const sportDoc = doc(db, 'sports', sportId as string);
      const sportSnapshot = await getDoc(sportDoc);
      
      if (sportSnapshot.exists()) {
        const sportData = {
          sportId: sportSnapshot.id,
          ...sportSnapshot.data()
        } as Sport;
        setSport(sportData);
      } else {
        setError('Sport not found');
      }
    } catch (err: any) {
      // Error handling removed
      setError('Failed to load sport details');
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="lg:min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#CE4520]" />
      </div>
    );
  }

  if (error || !sport) {
    return (
      <Container>
        <div className="max-w-4xl mx-auto py-8 font-fira">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Sport Not Found</h1>
            <p className="text-gray-600 mb-6">{error || 'The requested sport could not be found.'}</p>
            <Button
              onClick={() => router.push(`/${lang}/admin/sports`)}
              className="bg-[#CE4520] hover:bg-[#1565C0]"
            >
              Back to Sports
            </Button>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button
              onClick={() => router.back()}
              variant="outline"
              className="mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{sport.displayName}</h1>
              <p className="text-gray-600 text-sm">Sport Details</p>
            </div>
          </div>
          
          <Button
            onClick={() => router.push(`/${lang}/admin/sports/${sportId}/edit`)}
            className="bg-[#CE4520] hover:bg-[#1565C0]"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Sport
          </Button>
        </div>

        {/* Status Badge */}
        <div className="mb-6">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(sport.isActive)}`}>
            {getStatusIcon(sport.isActive)}
            <span className="ml-2">{sport.isActive ? 'Active' : 'Inactive'}</span>
          </span>
        </div>

        <div className="grid gap-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-500">Sport Name</label>
                <p className="text-gray-900 mt-1">{sport.name}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Display Name</label>
                <p className="text-gray-900 mt-1">{sport.displayName}</p>
              </div>
              
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-500">Description</label>
                <p className="text-gray-900 mt-1">{sport.description || 'No description provided'}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Category</label>
                <p className="text-gray-900 mt-1 capitalize">{sport.category}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Gender Categories</label>
                <div className="mt-1">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(sport.genderCategories)}`}>
                    {sport.genderCategories.join(' & ')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Player Configuration */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Player Configuration</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Users className="w-5 h-5 text-gray-400 mr-1" />
                </div>
                <div className="text-2xl font-bold text-gray-900">{sport.minPlayers} - {sport.maxPlayers}</div>
                <div className="text-sm text-gray-500">Players</div>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Users className="w-5 h-5 text-gray-400 mr-1" />
                </div>
                <div className="text-2xl font-bold text-gray-900">{sport.minSubstitutes} - {sport.maxSubstitutes}</div>
                <div className="text-sm text-gray-500">Substitutes</div>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Clock className="w-5 h-5 text-gray-400 mr-1" />
                </div>
                <div className="text-2xl font-bold text-gray-900">{sport.minAge} - {sport.maxAge || '∞'}</div>
                <div className="text-sm text-gray-500">Age Range</div>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Trophy className="w-5 h-5 text-gray-400 mr-1" />
                </div>
                <div className="text-2xl font-bold text-gray-900">{sport.maxPlayersUnder21}</div>
                <div className="text-sm text-gray-500">Under 21</div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-500">Allow PET</label>
                <p className="text-gray-900 mt-1">{sport.allowPET ? 'Yes' : 'No'}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Restricted to States</label>
                <p className="text-gray-900 mt-1">
                  {sport.restrictedToStates.length > 0 ? sport.restrictedToStates.join(', ') : 'No restrictions'}
                </p>
              </div>
            </div>
          </div>

          {/* Scoring System */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Scoring System</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-500">Points to Win</label>
                <p className="text-2xl font-bold text-gray-900 mt-1">{sport.scoringSystem.pointsToWin}</p>
              </div>
              
              {sport.scoringSystem.setsToWin && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Sets to Win</label>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{sport.scoringSystem.setsToWin}</p>
                </div>
              )}
              
              {sport.scoringSystem.timeLimit && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Time Limit</label>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{sport.scoringSystem.timeLimit} min</p>
                </div>
              )}
            </div>

            {sport.scoringSystem.customRules.length > 0 && (
              <div className="mt-6">
                <label className="text-sm font-medium text-gray-500">Custom Rules</label>
                <ul className="mt-2 space-y-1">
                  {sport.scoringSystem.customRules.map((rule, index) => (
                    <li key={index} className="text-gray-900 text-sm">• {rule}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Additional Information */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-500">Available in Events</label>
                <p className="text-gray-900 mt-1">
                  {sport.availableInEvents.length > 0 ? sport.availableInEvents.join(', ') : 'No events'}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Created At</label>
                <p className="text-gray-900 mt-1">
                  {sport.createdAt?.toDate ? sport.createdAt.toDate().toLocaleDateString() : 'Unknown'}
                </p>
              </div>
              
              {sport.iconURL && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Icon URL</label>
                  <p className="text-gray-900 mt-1 truncate">{sport.iconURL}</p>
                </div>
              )}
              
              {sport.rulesPDF && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Rules PDF</label>
                  <p className="text-gray-900 mt-1 truncate">{sport.rulesPDF}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
}