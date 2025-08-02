'use client'

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getVenueCheckedInTeams, assignTeamNumbers, createKnockoutDraw } from '@/lib/actions/tournament/fixtureManagement';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface PageProps {
  params: {
    venueId: string;
    lang: string;
  };
}

interface Team {
  id: string;
  name: string;
  sportId: string;
  genderCategory: string;
  tournamentNumber?: number;
}

export default function CreateDrawPage({ params }: PageProps) {
  const { venueId } = params;
  const router = useRouter();
  const searchParams = useSearchParams();
  const sportId = searchParams.get('sport') || '';
  const genderCategory = searchParams.get('gender') || '';
  
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1); // 1: assign numbers, 2: create draw, 3: success
  const [creating, setCreating] = useState(false);

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
      alert('Error assigning numbers: ' + result.error);
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
        router.push(`/volunteer/venues/${venueId}/fixtures`);
      }, 2000);
    } else {
      alert('Error creating tournament: ' + result.error);
    }
    
    setCreating(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <div>Loading teams...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-white border-b px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => router.back()} 
            className="text-blue-600"
          >
            ← Back
          </button>
          <h1 className="font-semibold">Create Tournament Draw</h1>
          <div className="w-12"></div>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="bg-white border-b px-4 py-3">
        <div className="flex items-center justify-center space-x-4">
          {[1, 2, 3].map(num => (
            <div key={num} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                num <= step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {num < step ? '✓' : num}
              </div>
              {num < 3 && <div className={`w-8 h-0.5 ${num < step ? 'bg-blue-600' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>
        <div className="text-center text-sm text-gray-600 mt-2">
          {step === 1 && 'Assign Team Numbers'}
          {step === 2 && 'Create Tournament Draw'}
          {step === 3 && 'Tournament Created!'}
        </div>
      </div>

      <div className="p-4">
        {/* Tournament Info */}
        <Card className="p-4 mb-4">
          <h2 className="font-semibold capitalize mb-2">
            {sportId.replace('_', ' ')} - {genderCategory}
          </h2>
          <div className="text-sm text-gray-600">
            {teams.length} teams • Knockout format
          </div>
        </Card>

        {/* Step 1: Assign Numbers */}
        {step === 1 && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium">Team Numbers</h3>
              <Button size="sm" variant="outline" onClick={shuffleNumbers}>
                🎲 Shuffle
              </Button>
            </div>

            <div className="space-y-3 mb-6">
              {teams.map(team => (
                <Card key={team.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">{team.name}</h4>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">#</span>
                      <input
                        type="number"
                        min="1"
                        max={teams.length}
                        value={team.tournamentNumber || ''}
                        onChange={(e) => updateTeamNumber(team.id, parseInt(e.target.value) || 0)}
                        className="w-16 p-1 border rounded text-center"
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <Button 
              onClick={handleAssignNumbers}
              disabled={creating || teams.some(t => !t.tournamentNumber)}
              className="w-full"
            >
              {creating ? 'Assigning...' : 'Confirm Numbers'}
            </Button>
          </>
        )}

        {/* Step 2: Create Draw */}
        {step === 2 && (
          <>
            <div className="mb-4">
              <h3 className="font-medium mb-2">Ready to Create Tournament</h3>
              <Card className="p-4">
                <div className="space-y-2 text-sm">
                  <div>🏆 Tournament: {sportId.replace('_', ' ')} {genderCategory}</div>
                  <div>👥 Teams: {teams.length}</div>
                  <div>🎯 Format: Single Elimination</div>
                  <div>🏅 Winners: Top 2 teams advance to next level</div>
                </div>
              </Card>
            </div>

            <div className="mb-6">
              <h4 className="font-medium mb-2">Team Order (by number)</h4>
              <div className="space-y-2">
                {teams
                  .sort((a, b) => (a.tournamentNumber || 0) - (b.tournamentNumber || 0))
                  .map(team => (
                    <div key={team.id} className="flex items-center space-x-3 p-2 bg-white rounded">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium">
                        {team.tournamentNumber}
                      </div>
                      <div>{team.name}</div>
                    </div>
                  ))}
              </div>
            </div>

            <Button 
              onClick={handleCreateDraw}
              disabled={creating}
              className="w-full"
            >
              {creating ? 'Creating Tournament...' : 'Create Tournament Draw'}
            </Button>
          </>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🏆</div>
            <h3 className="text-xl font-semibold mb-2">Tournament Created!</h3>
            <p className="text-gray-600 mb-4">
              The knockout tournament has been successfully created with {teams.length} teams.
            </p>
            <div className="text-sm text-gray-500">
              Redirecting to fixtures page...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}