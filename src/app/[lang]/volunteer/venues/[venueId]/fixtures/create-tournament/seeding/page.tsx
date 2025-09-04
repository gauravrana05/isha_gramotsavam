'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useOfflineTeams } from '@/hooks/useOfflineTeams';
import { useOfflineActions } from '@/hooks/useOfflineActions';
import { useAlert } from '@/hooks/useAlert';
import { AlertModal } from '@/components/ui/Modal';
import { 
  ArrowLeft, 
  Trophy, 
  Users, 
  Target, 
  Shuffle, 
  CheckCircle, 
  Loader2,
  Hash,
  Medal,
  GripVertical,
  Play
} from 'lucide-react';

interface Team {
  id: string;
  name: string;
  sportId: string;
  genderCategory: string;
  tournamentNumber?: number;
  currentPlayers: number;
}

interface DragItem {
  id: string;
  index: number;
}

export default function TournamentSeedingPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { venueId, lang } = params as { venueId: string; lang: string };
  const { user } = useAuth();
  const { alertState, showError, showSuccess, hideAlert } = useAlert();

  const sportId = searchParams.get('sport') || '';
  const genderCategory = searchParams.get('gender') || '';
  const level = searchParams.get('level') || 'cluster';

  const [teams, setTeams] = useState<Team[]>([]);
  const [step, setStep] = useState(1); // 1: seeding, 2: preview, 3: creating
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
  const [loading, setLoading] = useState(true);
  const dragCounter = useRef(0);

  // Get tournament data
  const { data: venueData, isLoading } = // TODO: Migrate to offline - api.volunteers.venue.getVenueTournament.useQuery(
    { venueId },
    { enabled: !!user && !!venueId }
  );

  // Create fixture mutation
  const createFixtureMutation = // TODO: Migrate to offline - api.volunteers.fixture.createFixture.useMutation({
    onSuccess: async (data) => {
      setStep(3);
      // Now assign team numbers and create knockout draw
      try {
        const assignments = teams.map((team, index) => ({
          teamId: team.id,
          number: team.tournamentNumber || index + 1
        }));

        await assignTeamNumbers.mutateAsync({
          venueLevelMappingId: data.venueLevelMappingId,
          assignments
        });

        await createKnockoutDraw.mutateAsync({
          fixtureId: data.fixtureId,
          venueLevelMappingId: data.venueLevelMappingId,
          sportId,
          genderCategory
        });

        showSuccess('Tournament created successfully!');
        setTimeout(() => {
          router.push(`/${lang}/volunteer/venues/${venueId}/fixtures/${data.fixtureId}`);
        }, 2000);
      } catch (error) {
        showError('Failed to set up tournament bracket: ' + (error as Error).message);
      }
    },
    onError: (error) => {
      showError(`Failed to create tournament: ${error.message}`);
    }
  });

  const assignTeamNumbers = // TODO: Migrate to offline - api.volunteers.fixture.assignTeamNumbers.useMutation();
  const createKnockoutDraw = // TODO: Migrate to offline - api.volunteers.fixture.createKnockoutDraw.useMutation();

  useEffect(() => {
    if (!venueData || isLoading) return;

    // Find teams for the selected sport and gender
    const sportKey = `${sportId}_${genderCategory}`;
    const sportTeams = venueData.teamsBySport?.find((group: any) => 
      group.sportId === sportId && group.genderCategory === genderCategory
    )?.teams || [];

    if (sportTeams.length === 0) {
      showError('No teams found for this sport and gender category');
      setLoading(false);
      return;
    }

    // Initialize teams with default seeding (1, 2, 3, ...)
    const initialTeams = sportTeams.map((team: any, index: number) => ({
      id: team.id,
      name: team.name,
      sportId: team.sportId,
      genderCategory: team.genderCategory,
      currentPlayers: team.currentPlayers || 0,
      tournamentNumber: index + 1
    }));

    setTeams(initialTeams);
    setLoading(false);
  }, [venueData, isLoading, sportId, genderCategory]);

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedItem({ id: teams[index].id, index });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
  };

  const handleDragLeave = (e: React.DragEvent) => {
    dragCounter.current--;
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    dragCounter.current = 0;

    if (!draggedItem || draggedItem.index === dropIndex) return;

    const newTeams = [...teams];
    const draggedTeam = newTeams[draggedItem.index];
    
    // Remove dragged team and insert at new position
    newTeams.splice(draggedItem.index, 1);
    newTeams.splice(dropIndex, 0, draggedTeam);

    // Update tournament numbers based on new positions
    const updatedTeams = newTeams.map((team, index) => ({
      ...team,
      tournamentNumber: index + 1
    }));

    setTeams(updatedTeams);
    setDraggedItem(null);
  };

  const shuffleSeeding = () => {
    const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
    const reseededTeams = shuffledTeams.map((team, index) => ({
      ...team,
      tournamentNumber: index + 1
    }));
    setTeams(reseededTeams);
  };

  const handleCreateTournament = () => {
    if (teams.some(t => !t.tournamentNumber)) {
      showError('Please assign seeding numbers to all teams');
      return;
    }

    const tournamentName = `${sportId.replace('_', ' ')} ${genderCategory} ${level}`.replace(/\b\w/g, l => l.toUpperCase());
    
    createFixtureMutation.mutate({
      venueId,
      name: tournamentName,
      sportId,
      genderCategory: genderCategory as 'men' | 'women' | 'mixed',
      level: level as 'cluster' | 'division' | 'final',
      maxTeams: teams.length
    });
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-[#F3F0E5] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#F28C38] mx-auto mb-4" />
          <p className="text-gray-600">Loading teams...</p>
        </div>
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="min-h-screen bg-[#F3F0E5] flex items-center justify-center p-6">
        <div className="text-center bg-white rounded-lg p-8 shadow-sm border max-w-md">
          <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Teams Available</h1>
          <p className="text-gray-600 mb-6">No teams found for {sportId} - {genderCategory}</p>
          <button 
            onClick={() => router.back()}
            className="bg-[#F28C38] text-white px-6 py-2 rounded-lg hover:bg-[#E67A26] transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F0E5] py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <button 
              onClick={() => router.back()} 
              className="text-[#F28C38] hover:text-[#E67A26] flex items-center mr-4"
            >
              <ArrowLeft className="w-5 h-5 mr-1" />
              Back to Fixtures
            </button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tournament Seeding</h1>
          <p className="text-gray-600">Arrange teams in seeding order for bracket generation</p>
        </div>

        {/* Progress Indicator */}
        <div className="bg-white rounded-lg border shadow-sm p-6 mb-8">
          <div className="flex items-center justify-center space-x-8">
            {[
              { num: 1, label: 'Team Seeding', icon: Hash, active: step === 1 },
              { num: 2, label: 'Preview Bracket', icon: Target, active: step === 2 },
              { num: 3, label: 'Tournament Ready', icon: CheckCircle, active: step === 3 }
            ].map(({ num, label, icon: Icon, active }, index) => (
              <div key={num} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    active ? 'bg-[#F28C38] text-white' : step > num ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {step > num ? <CheckCircle className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                  </div>
                  <span className="text-xs text-gray-600 mt-2 text-center">{label}</span>
                </div>
                {index < 2 && (
                  <div className={`w-16 h-0.5 mx-4 transition-colors ${
                    step > num ? 'bg-green-300' : active ? 'bg-[#F28C38]' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tournament Info */}
        <div className="bg-white rounded-lg border shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Trophy className="w-6 h-6 text-[#F28C38] mr-3" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900 capitalize">
                  {sportId.replace('_', ' ')} - {genderCategory} ({level} level)
                </h2>
                <p className="text-gray-600 text-sm">
                  {teams.length} teams • Single elimination knockout format
                </p>
              </div>
            </div>
            <button
              onClick={shuffleSeeding}
              className="flex items-center gap-2 px-4 py-2 text-sm text-[#F28C38] hover:text-[#E67A26] hover:bg-orange-50 rounded-md border border-orange-200"
            >
              <Shuffle className="w-4 h-4" />
              Shuffle Seeding
            </button>
          </div>
        </div>

        {/* Step 1: Team Seeding */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Drag & Drop Team Seeding</h3>
              <p className="text-gray-600 text-sm mb-6">
                Drag teams to reorder their seeding. Higher seeded teams (1, 2, 3...) get better bracket placement.
              </p>

              {/* Desktop Drag & Drop List */}
              <div className="hidden md:block space-y-2">
                {teams.map((team, index) => (
                  <div
                    key={team.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    className={`flex items-center p-4 border-2 rounded-lg cursor-move hover:bg-gray-50 transition-colors ${
                      draggedItem?.index === index ? 'border-[#F28C38] bg-orange-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center mr-4">
                      <GripVertical className="w-5 h-5 text-gray-400 mr-2" />
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white ${
                        index < 4 ? 'bg-[#F28C38]' : index < 8 ? 'bg-blue-500' : 'bg-gray-500'
                      }`}>
                        {team.tournamentNumber}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-900">{team.name}</h4>
                          <p className="text-sm text-gray-600">
                            {team.currentPlayers} players • Seed #{team.tournamentNumber}
                          </p>
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          {index < 4 && <Medal className="w-4 h-4 mr-1 text-yellow-500" />}
                          <span className="font-medium">
                            {index < 2 ? 'Top Seed' : index < teams.length / 2 ? 'High Seed' : 'Lower Seed'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Mobile Card List */}
              <div className="md:hidden space-y-3">
                {teams.map((team, index) => (
                  <div key={team.id} className="flex items-center p-4 border border-gray-200 rounded-lg">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white mr-4 ${
                      index < 4 ? 'bg-[#F28C38]' : index < 8 ? 'bg-blue-500' : 'bg-gray-500'
                    }`}>
                      {team.tournamentNumber}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{team.name}</h4>
                      <p className="text-sm text-gray-600">
                        Seed #{team.tournamentNumber} • {team.currentPlayers} players
                      </p>
                    </div>
                    <div className="flex flex-col gap-1">
                      {index > 0 && (
                        <button
                          onClick={() => {
                            const newTeams = [...teams];
                            [newTeams[index], newTeams[index - 1]] = [newTeams[index - 1], newTeams[index]];
                            setTeams(newTeams.map((t, i) => ({ ...t, tournamentNumber: i + 1 })));
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          ↑
                        </button>
                      )}
                      {index < teams.length - 1 && (
                        <button
                          onClick={() => {
                            const newTeams = [...teams];
                            [newTeams[index], newTeams[index + 1]] = [newTeams[index + 1], newTeams[index]];
                            setTeams(newTeams.map((t, i) => ({ ...t, tournamentNumber: i + 1 })));
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          ↓
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => router.back()}
                className="flex items-center justify-center px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setStep(2)}
                className="flex-1 flex items-center justify-center px-6 py-3 text-white bg-[#F28C38] hover:bg-[#E67A26] rounded-lg transition-colors"
              >
                <Target className="w-4 h-4 mr-2" />
                Preview Tournament Bracket
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Preview Tournament */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Tournament Preview</h3>
              
              {/* Bracket Preview */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-4">Seeding Order (Final)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {teams.map((team, index) => (
                    <div key={team.id} className="flex items-center p-3 border border-gray-200 rounded-lg">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white mr-3 ${
                        index < 2 ? 'bg-yellow-500' : index < 4 ? 'bg-[#F28C38]' : 'bg-gray-500'
                      }`}>
                        {team.tournamentNumber}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{team.name}</div>
                        <div className="text-xs text-gray-500">
                          {index < 2 ? 'Top seed - Gets bye' : 'Competes from Round 1'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tournament Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-[#F28C38]">{teams.length}</div>
                  <div className="text-sm text-gray-600">Total Teams</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {teams.length - 1}
                  </div>
                  <div className="text-sm text-gray-600">Total Matches</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {Math.ceil(Math.log2(teams.length))}
                  </div>
                  <div className="text-sm text-gray-600">Tournament Rounds</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">1</div>
                  <div className="text-sm text-gray-600">Champion</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex items-center justify-center px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Seeding
              </button>
              <button
                onClick={handleCreateTournament}
                disabled={createFixtureMutation.isLoading}
                className="flex-1 flex items-center justify-center px-6 py-3 text-white bg-[#F28C38] hover:bg-[#E67A26] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {createFixtureMutation.isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Tournament...
                  </>
                ) : (
                  <>
                    <Trophy className="w-4 h-4 mr-2" />
                    Create Tournament
                  </>
                )}
              </button>
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
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Tournament Created!</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                The knockout tournament has been successfully created with your custom seeding. 
                Matches are being generated automatically.
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
                    <div className="text-gray-500">Bracket</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center text-sm text-gray-500 mb-4">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Redirecting to tournament bracket...
              </div>
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
    </div>
  );
}