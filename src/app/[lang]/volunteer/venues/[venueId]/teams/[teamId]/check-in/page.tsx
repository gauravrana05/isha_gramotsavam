'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getTeamPlayersForVerification, verifyTeamPlayers, checkInTeam } from '@/lib/actions/volunteer/teamCheckin';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface PageProps {
  params: {
    venueId: string;
    teamId: string;
    lang: string;
  };
}

interface Player {
  id: string;
  name: string;
  aadhaarNumber: string;
  matchDayVerified: boolean;
  verificationNotes: string;
  verificationIssues: string[];
}

export default function TeamCheckInPage({ params }: PageProps) {
  const { venueId, teamId } = params;
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadPlayers();
  }, [teamId]);

  const loadPlayers = async () => {
    setLoading(true);
    const result = await getTeamPlayersForVerification(teamId);
    if (result.success) {
      setPlayers(result.players);
    }
    setLoading(false);
  };

  const togglePlayerVerification = (playerId: string) => {
    setPlayers(prev => prev.map(player => 
      player.id === playerId 
        ? { ...player, matchDayVerified: !player.matchDayVerified }
        : player
    ));
  };

  const updatePlayerNotes = (playerId: string, notes: string) => {
    setPlayers(prev => prev.map(player => 
      player.id === playerId 
        ? { ...player, verificationNotes: notes }
        : player
    ));
  };

  const handleVerifyPlayers = async () => {
    setSubmitting(true);
    
    const verifications = players.map(player => ({
      playerId: player.id,
      verified: player.matchDayVerified,
      notes: player.verificationNotes
    }));

    const result = await verifyTeamPlayers(teamId, venueId, verifications);
    
    if (result.success) {
      // If all players are verified, proceed to check-in
      const allVerified = players.every(p => p.matchDayVerified);
      if (allVerified) {
        const checkInResult = await checkInTeam(teamId, venueId, 'volunteer_id');
        if (checkInResult.success) {
          router.push(`/volunteer/venues/${venueId}/teams`);
        } else {
          alert('Error checking in team: ' + checkInResult.error);
        }
      } else {
        alert('Please verify all players before checking in');
      }
    } else {
      alert('Error verifying players: ' + result.error);
    }
    
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <div>Loading players...</div>
        </div>
      </div>
    );
  }

  const verifiedCount = players.filter(p => p.matchDayVerified).length;
  const allVerified = verifiedCount === players.length;

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
          <h1 className="font-semibold">Player Verification</h1>
          <div className="w-12"></div>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between text-sm">
          <span>Progress: {verifiedCount}/{players.length}</span>
          <span className={`font-medium ${allVerified ? 'text-green-600' : 'text-orange-600'}`}>
            {allVerified ? 'All Verified' : 'Pending'}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(verifiedCount / players.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Players List */}
      <div className="p-4 space-y-3 pb-20">
        {players.map((player, index) => (
          <Card key={player.id} className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-medium text-gray-800">{player.name}</h3>
                <p className="text-sm text-gray-600">Aadhaar: ****{player.aadhaarNumber?.slice(-4)}</p>
              </div>
              <button
                onClick={() => togglePlayerVerification(player.id)}
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  player.matchDayVerified 
                    ? 'bg-green-500 border-green-500 text-white' 
                    : 'border-gray-300'
                }`}
              >
                {player.matchDayVerified && '✓'}
              </button>
            </div>

            {/* Verification Notes */}
            <textarea
              placeholder="Verification notes (optional)"
              value={player.verificationNotes}
              onChange={(e) => updatePlayerNotes(player.id, e.target.value)}
              className="w-full text-sm border rounded p-2 resize-none"
              rows={2}
            />

            {/* Quick Actions */}
            <div className="flex space-x-2 mt-2">
              <button
                onClick={() => togglePlayerVerification(player.id)}
                className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
                  player.matchDayVerified
                    ? 'bg-green-100 text-green-700'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {player.matchDayVerified ? 'Verified' : 'Mark Verified'}
              </button>
            </div>
          </Card>
        ))}

        {players.length === 0 && (
          <Card className="p-6 text-center">
            <div className="text-gray-500">
              <div className="text-2xl mb-2">👥</div>
              <div>No players found</div>
            </div>
          </Card>
        )}
      </div>

      {/* Bottom Action Bar */}
      {players.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
          <Button
            onClick={handleVerifyPlayers}
            disabled={!allVerified || submitting}
            className="w-full"
          >
            {submitting ? 'Processing...' : 
             allVerified ? 'Check In Team' : `Verify All Players (${verifiedCount}/${players.length})`}
          </Button>
        </div>
      )}
    </div>
  );
}
