'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/server/trpc/react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/AdvancedSelect';
import { useNotification } from '@/context/NotificationContext';
import { Clock, Trophy, Users, Calendar, Edit } from 'lucide-react';

type MatchStatus = 'scheduled' | 'ready' | 'in_progress' | 'completed';

export default function AdminMatchesPage() {
  const params = useParams();
  const venueId = params.venueId as string;
  const [selectedStatus, setSelectedStatus] = useState<MatchStatus>('ready');
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const [resultDialog, setResultDialog] = useState(false);
  const { addNotification } = useNotification();

  const { data: matches, refetch } = api.volunteers.match.getVenueMatchesByStatus.useQuery({
    venueId,
    status: selectedStatus
  });

  const updateStatusMutation = api.volunteers.match.updateMatchStatus.useMutation({
    onSuccess: () => {
      addNotification('Match status updated successfully', 'success');
      refetch();
    }
  });

  const recordResultMutation = api.volunteers.match.recordMatchResult.useMutation({
    onSuccess: () => {
      addNotification('Match result recorded successfully', 'success');
      setResultDialog(false);
      refetch();
    }
  });

  const getStatusColor = (status: MatchStatus) => {
    switch (status) {
      case 'scheduled': return 'bg-gray-500';
      case 'ready': return 'bg-blue-500';
      case 'in_progress': return 'bg-yellow-500';
      case 'completed': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const handleStatusUpdate = (matchId: string, newStatus: MatchStatus) => {
    updateStatusMutation.mutate({ matchId, status: newStatus });
  };

  const handleResultSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedMatch) return;

    const formData = new FormData(e.currentTarget);
    const team1Score = parseInt(formData.get('team1Score') as string);
    const team2Score = parseInt(formData.get('team2Score') as string);
    const winnerId = formData.get('winnerId') as string;
    const scoreDetails = formData.get('scoreDetails') as string;

    recordResultMutation.mutate({
      matchId: selectedMatch,
      team1Score,
      team2Score,
      winnerId,
      scoreDetails
    });
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Match Management</h1>
      </div>

      <Tabs value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as MatchStatus)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="ready">Ready</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedStatus} className="mt-6">
          <div className="grid gap-4">
            {matches?.map((match) => (
              <Card key={match.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {match.fixture.name} - {match.roundName}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {match.fixture.sport.name} • Match #{match.matchNumber}
                      </p>
                    </div>
                    <Badge className={getStatusColor(match.status)}>
                      {match.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="text-center">
                          <div className="font-semibold">
                            {match.team1?.name || 'TBD'}
                          </div>
                          {match.team1?.tournamentNumber && (
                            <div className="text-sm text-muted-foreground">
                              #{match.team1.tournamentNumber}
                            </div>
                          )}
                        </div>
                        <div className="text-2xl font-bold">VS</div>
                        <div className="text-center">
                          <div className="font-semibold">
                            {match.team2?.name || 'TBD'}
                          </div>
                          {match.team2?.tournamentNumber && (
                            <div className="text-sm text-muted-foreground">
                              #{match.team2.tournamentNumber}
                            </div>
                          )}
                        </div>
                      </div>

                      {match.status === 'completed' && match.winner && (
                        <div className="flex items-center space-x-2">
                          <Trophy className="h-4 w-4 text-yellow-500" />
                          <span className="font-semibold">{match.winner.name}</span>
                        </div>
                      )}
                    </div>

                    {match.status === 'completed' && (
                      <div className="text-center text-2xl font-bold">
                        {match.team1Score} - {match.team2Score}
                      </div>
                    )}

                    {match.scheduledTime && (
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Scheduled: {new Date(match.scheduledTime).toLocaleString()}</span>
                      </div>
                    )}

                    <div className="flex space-x-2">
                      {match.status === 'scheduled' && match.team1 && match.team2 && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusUpdate(match.id, 'ready')}
                        >
                          Mark Ready
                        </Button>
                      )}

                      {match.status === 'ready' && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusUpdate(match.id, 'in_progress')}
                        >
                          Start Match
                        </Button>
                      )}

                      {match.status === 'in_progress' && (
                        <Dialog open={resultDialog} onOpenChange={setResultDialog}>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              onClick={() => setSelectedMatch(match.id)}
                            >
                              Record Result
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Record Match Result</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleResultSubmit} className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>{match.team1?.name} Score</Label>
                                  <Input
                                    name="team1Score"
                                    type="number"
                                    min="0"
                                    required
                                  />
                                </div>
                                <div>
                                  <Label>{match.team2?.name} Score</Label>
                                  <Input
                                    name="team2Score"
                                    type="number"
                                    min="0"
                                    required
                                  />
                                </div>
                              </div>
                              <div>
                                <Label>Winner</Label>
                                <Select name="winnerId" required>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select winner" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {match.team1 && (
                                      <SelectItem value={match.team1Id!}>
                                        {match.team1.name}
                                      </SelectItem>
                                    )}
                                    {match.team2 && (
                                      <SelectItem value={match.team2Id!}>
                                        {match.team2.name}
                                      </SelectItem>
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label>Score Details (Optional)</Label>
                                <Textarea
                                  name="scoreDetails"
                                  placeholder="Additional details about the match..."
                                />
                              </div>
                              <Button type="submit" className="w-full">
                                Record Result
                              </Button>
                            </form>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {matches?.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No {selectedStatus} matches found
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
