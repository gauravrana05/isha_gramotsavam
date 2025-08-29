'use client'

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { getVenueCheckedInTeams, assignTeamNumbers, createKnockoutDraw } from '@/lib/actions/tournament/fixtureManagement';
import { 
  ArrowLeft, 
  Trophy, 
  Users, 
  Target, 
  Shuffle, 
  CheckCircle, 
  Loader2,
  Hash,
  Medal
} from 'lucide-react';
import { Button } from '@/components/ui';
import { AlertModal } from '@/components/ui/Modal';
import { useAlert } from '@/hooks/useAlert';

interface PageProps {
  params: Promise<{
    venueId: string;
    lang: string;
  }>;
}

interface Team {
  id: string;
  name: string;
  sportId: string;
  genderCategory: string;
  tournamentNumber?: number;
}

export default function CreateDrawPage({ params }: PageProps) {
  const { venueId, lang } = useParams<{ venueId: string; lang: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sportId = searchParams.get('sport') || '';
  const genderCategory = searchParams.get('gender') || '';
  
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1); // 1: assign numbers, 2: create draw, 3: success
  const [creating, setCreating] = useState(false);
  const { alertState, showError, hideAlert } = useAlert();

  useEffect(() => {
    loadTeams();
  }, [venueId, sportId, genderCategory]);

  const loadTeams = async () => {
    setLoading(true);
    const eventId = 'isha_gramotsavam_2025';
    const result = await getVenueCheckedInTeams(venueId, eventId);
    
    if (result.success) {
      const sportKey = `${sportId}_${genderCategory}`;
      const sportTeams = result.teamsBySport[sportKey] || [];
      setTeams(sportTeams.map((team: any) => ({
        id: team.id,
        name: team.name,
        sportId: team.sportId,
        genderCategory: team.genderCategory,
        tournamentNumber: Math.floor(Math.random() * 100) + 1 // Random initial number
      })));
    }
    setLoading(false);
  };

  const updateTeamNumber = (teamId: string, number: number) => {
    setTeams(prev => prev.map(team => 
      team.id === teamId ? { ...team, tournamentNumber: number } : team
    ));
  };

  const shuffleNumbers = () => {
    const numbers = Array.from({ length: teams.length }, (_, i) => i + 1);
    const shuffled = [...numbers].sort(() => Math.random() - 0.5);
    
    setTeams(prev => prev.map((team, index) => ({
      ...team,
      tournamentNumber: shuffled[index]
    })));
  };

  const handleAssignNumbers = async () => {
    setCreating(true);
    
    const assignments = teams.map(team => ({
      teamId: team.id,
      teamName: team.name,
      number: team.tournamentNumber!
    }));

    const result = await assignTeamNumbers(venueId, assignments);
    
    if (result.success) {
      setStep(2);
    } else {
      showError('Error assigning numbers: ' + result.error);
    }
    
    setCreating(false);
  };

  const handleCreateDraw = async () => {
    setCreating(true);
    
    const result = await createKnockoutDraw(
      venueId, 
      'isha_gramotsavam_2025', 
      sportId, 
      genderCategory as 'men' | 'women'
    );
    
    if (result.success) {
      setStep(3);
      setTimeout(() => {
        router.push(`/${lang}/volunteer/venues/${venueId}/fixtures`);
      }, 2000);
    } else {
      showError('Error creating tournament: ' + result.error);
    }
    
    setCreating(false);
  };

  if (loading) {
    return (
      <div className="lg:min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#F28C38] mx-auto mb-4" />
          <p className="text-gray-600">Loading teams...</p>
        </div>
      </div>
    );
  }

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
            Back to Fixtures
          </button>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Create Tournament Draw</h1>
        <p className="text-gray-600 text-sm">Set up knockout tournament bracket and team seeding</p>
      </div>

      {/* Progress Indicator */}
      <div className="bg-white rounded-lg border shadow-sm p-6 mb-6">
        <div className="flex items-center justify-center space-x-8 mb-4">
          {[
            { num: 1, label: 'Assign Numbers', icon: Hash },
            { num: 2, label: 'Create Draw', icon: Target },
            { num: 3, label: 'Complete', icon: CheckCircle }
          ].map(({ num, label, icon: Icon }, index) => (
            <div key={num} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  num <= step ? 'bg-[#F28C38] text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {num < step ? <CheckCircle className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                </div>
                <span className="text-xs text-gray-600 mt-2 text-center">{label}</span>
              </div>
              {index < 2 && (
                <div className={`w-16 h-0.5 mx-4 transition-colors ${
                  num < step ? 'bg-[#F28C38]' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tournament Info */}
      <div className="bg-white rounded-lg border shadow-sm p-6 mb-6">
        <div className="flex items-center mb-4">
          <Trophy className="w-6 h-6 text-[#F28C38] mr-3" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900 capitalize">
              {sportId.replace('_', ' ')} - {genderCategory}
            </h2>
            <p className="text-gray-600 text-sm">
              {teams.length} teams • Single elimination knockout format
            </p>
          </div>
        </div>
      </div>

      {/* Step 1: Assign Numbers */}
      {step === 1 && (
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Assign Team Numbers</h3>
              <p className="text-gray-600 text-sm">Set seeding order for tournament bracket</p>
            </div>
            <button
              onClick={shuffleNumbers}
              className="mt-3 sm:mt-0 flex items-center px-4 py-2 text-sm text-[#F28C38] hover:text-[#E67A26] hover:bg-orange-50 rounded-md border border-orange-200"
            >
              <Shuffle className="w-4 h-4 mr-1" />
              Shuffle Numbers
            </button>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-hidden border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Team</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sport</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seed Number</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {teams.map((team) => (
                  <tr key={team.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <Users className="w-5 h-5 text-gray-400 mr-3" />
                        <div className="text-sm font-medium text-gray-900">{team.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 capitalize">
                      {sportId.replace('_', ' ')} - {genderCategory}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <Hash className="w-4 h-4 text-gray-400" />
                        <input
                          type="number"
                          min="1"
                          max={teams.length}
                          value={team.tournamentNumber || ''}
                          onChange={(e) => updateTeamNumber(team.id, parseInt(e.target.value) || 0)}
                          className="w-20 px-3 py-2 border border-gray-300 rounded-md text-center focus:ring-[#F28C38] focus:border-[#F28C38]"
                          placeholder="0"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {teams.map((team) => (
              <div key={team.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center flex-1">
                    <Users className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <h4 className="font-medium text-gray-900">{team.name}</h4>
                      <p className="text-sm text-gray-500 capitalize">
                        {sportId.replace('_', ' ')} - {genderCategory}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <Hash className="w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      min="1"
                      max={teams.length}
                      value={team.tournamentNumber || ''}
                      onChange={(e) => updateTeamNumber(team.id, parseInt(e.target.value) || 0)}
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:ring-[#F28C38] focus:border-[#F28C38]"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => router.back()}
              className="flex items-center justify-center px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAssignNumbers}
              disabled={creating || teams.some(t => !t.tournamentNumber)}
              className="flex-1 flex items-center justify-center px-6 py-3 text-white bg-[#F28C38] hover:bg-[#E67A26] rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Assigning Numbers...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirm Team Numbers
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Create Draw */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Tournament Summary */}
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tournament Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center">
                  <Trophy className="w-5 h-5 text-[#F28C38] mr-3" />
                  <div>
                    <span className="text-sm text-gray-500">Tournament</span>
                    <div className="font-medium capitalize">{sportId.replace('_', ' ')} - {genderCategory}</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <Users className="w-5 h-5 text-blue-600 mr-3" />
                  <div>
                    <span className="text-sm text-gray-500">Teams</span>
                    <div className="font-medium">{teams.length} teams registered</div>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center">
                  <Target className="w-5 h-5 text-purple-600 mr-3" />
                  <div>
                    <span className="text-sm text-gray-500">Format</span>
                    <div className="font-medium">Single Elimination</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <Medal className="w-5 h-5 text-yellow-600 mr-3" />
                  <div>
                    <span className="text-sm text-gray-500">Winners</span>
                    <div className="font-medium">Top 2 teams advance</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Team Seeding Order */}
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Team Seeding Order</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {teams
                .sort((a, b) => (a.tournamentNumber || 0) - (b.tournamentNumber || 0))
                .map((team, index) => (
                  <div key={team.id} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="w-10 h-10 bg-[#F28C38] text-white rounded-full flex items-center justify-center text-sm font-bold mr-4">
                      {team.tournamentNumber}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{team.name}</div>
                      <div className="text-sm text-gray-500">
                        Seed #{team.tournamentNumber} • {index < 2 ? 'Top seed' : index < teams.length - 2 ? 'Middle seed' : 'Lower seed'}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-white rounded-lg border shadow-sm p-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex items-center justify-center px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Numbers
              </button>
              <button
                onClick={handleCreateDraw}
                disabled={creating}
                className="flex-1 flex items-center justify-center px-6 py-3 text-white bg-[#F28C38] hover:bg-[#E67A26] rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Tournament...
                  </>
                ) : (
                  <>
                    <Trophy className="w-4 h-4 mr-2" />
                    Create Tournament Draw
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Success */}
      {step === 3 && (
        <div className="bg-white rounded-lg border shadow-sm p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Tournament Created Successfully!</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              The knockout tournament has been successfully created with {teams.length} teams. 
              Matches will be automatically generated based on the bracket structure.
            </p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6 max-w-sm mx-auto">
              <div className="flex items-center justify-center space-x-4 text-sm">
                <div className="text-center">
                  <div className="font-bold text-[#F28C38]">{teams.length}</div>
                  <div className="text-gray-500">Teams</div>
                </div>
                <div className="w-px h-8 bg-gray-300"></div>
                <div className="text-center">
                  <div className="font-bold text-green-600">Ready</div>
                  <div className="text-gray-500">Status</div>
                </div>
                <div className="w-px h-8 bg-gray-300"></div>
                <div className="text-center">
                  <div className="font-bold text-blue-600">Auto</div>
                  <div className="text-gray-500">Matches</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center text-sm text-gray-500 mb-4">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Redirecting to fixtures page...
            </div>

            <button
              onClick={() => router.push(`/${lang}/volunteer/venues/${venueId}/fixtures`)}
              className="inline-flex items-center px-6 py-2 text-sm text-[#F28C38] hover:text-[#E67A26] font-medium"
            >
              Go to Fixtures Now
              <ArrowLeft className="w-4 h-4 ml-1 rotate-180" />
            </button>
          </div>
        </div>
      )}
      
      <AlertModal
        isOpen={alertState.isOpen}
        onClose={hideAlert}
        message={alertState.message}
        type={alertState.type}
        title={alertState.title}
      />
    </div>
  );
}