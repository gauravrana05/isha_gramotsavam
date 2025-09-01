'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/server/trpc/react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useNotification } from '@/context/NotificationContext';
import { Search, Users, CheckCircle, Clock, Camera } from 'lucide-react';

export default function TeamCheckInPage() {
  const params = useParams();
  const venueId = params.venueId as string;
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [photoDialog, setPhotoDialog] = useState(false);
  const { addNotification } = useNotification();

  // Get teams assigned to this venue
  const { data: teams, refetch } = api.volunteers.team.getVenueTeams.useQuery({
    venueId
  });

  const checkInMutation = api.volunteers.team.checkInTeam.useMutation({
    onSuccess: () => {
      addNotification('Team checked in successfully', 'success');
      refetch();
    }
  });

  const uploadPhotoMutation = api.volunteers.team.uploadTeamPhoto.useMutation({
    onSuccess: () => {
      addNotification('Team photo uploaded successfully', 'success');
      setPhotoDialog(false);
      refetch();
    }
  });

  const filteredTeams = teams?.filter(team =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.captainName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.tournamentNumber?.toString().includes(searchTerm)
  );

  const handleCheckIn = (teamId: string) => {
    checkInMutation.mutate({ teamId });
  };

  const handlePhotoUpload = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedTeam) return;

    const formData = new FormData(e.currentTarget);
    const photoFile = formData.get('photo') as File;

    if (!photoFile) {
      addNotification('Please select a photo', 'error');
      return;
    }

    uploadPhotoMutation.mutate({
      teamId: selectedTeam,
      photo: photoFile
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-blue-500';
      case 'checked_in': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'verified': return 'Verified';
      case 'checked_in': return 'Checked In';
      default: return status.replace('_', ' ').toUpperCase();
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Team Check-In</h1>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-muted-foreground">
            {teams?.filter(t => t.status === 'checked_in').length || 0} / {teams?.length || 0} teams checked in
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by team name, captain, or tournament number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Teams Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredTeams?.map((team) => (
          <Card key={team.id} className="relative">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{team.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {team.sport.name} • {team.genderCategory}
                  </p>
                  {team.tournamentNumber && (
                    <p className="text-sm font-medium">
                      Tournament #{team.tournamentNumber}
                    </p>
                  )}
                </div>
                <Badge className={getStatusColor(team.status)}>
                  {getStatusText(team.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Captain Info */}
                <div>
                  <Label className="text-sm font-medium">Captain</Label>
                  <p className="text-sm">{team.captainName}</p>
                </div>

                {/* Location */}
                <div>
                  <Label className="text-sm font-medium">Location</Label>
                  <p className="text-sm">{team.panchayat}, {team.taluk}</p>
                </div>

                {/* Players Count */}
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span className="text-sm">
                    {team.currentPlayers} players, {team.currentSubstitutes} substitutes
                  </span>
                </div>

                {/* Check-in Info */}
                {team.status === 'checked_in' && team.checkedInAt && (
                  <div className="flex items-center space-x-2 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span>
                      Checked in at {new Date(team.checkedInAt).toLocaleString()}
                    </span>
                  </div>
                )}

                {/* Verification Info */}
                {team.verifiedAt && (
                  <div className="flex items-center space-x-2 text-sm text-blue-600">
                    <Clock className="h-4 w-4" />
                    <span>
                      Verified at {new Date(team.verifiedAt).toLocaleString()}
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex space-x-2">
                  {team.status === 'verified' && (
                    <Button
                      size="sm"
                      onClick={() => handleCheckIn(team.id)}
                      disabled={checkInMutation.isLoading}
                    >
                      Check In Team
                    </Button>
                  )}

                  {team.status === 'checked_in' && !team.teamPhoto && (
                    <Dialog open={photoDialog} onOpenChange={setPhotoDialog}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedTeam(team.id)}
                        >
                          <Camera className="h-4 w-4 mr-2" />
                          Add Photo
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Upload Team Photo</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handlePhotoUpload} className="space-y-4">
                          <div>
                            <Label>Team Photo</Label>
                            <Input
                              name="photo"
                              type="file"
                              accept="image/*"
                              required
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Upload a clear photo of the entire team
                            </p>
                          </div>
                          <Button type="submit" className="w-full">
                            Upload Photo
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  )}

                  {team.teamPhoto && (
                    <Badge variant="outline" className="text-green-600">
                      Photo Uploaded
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredTeams?.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? 'No teams found matching your search' : 'No teams assigned to this venue'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
