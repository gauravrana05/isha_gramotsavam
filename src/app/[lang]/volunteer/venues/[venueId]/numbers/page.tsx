'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/server/trpc/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNotification } from '@/context/NotificationContext';
import { Badge } from '@/components/ui/badge';
import { Users, Hash, Save, Shuffle } from 'lucide-react';

interface TeamAssignment {
  teamId: string;
  teamName: string;
  captainName: string;
  number: number;
}

export default function TournamentNumbersPage() {
  const params = useParams();
  const venueId = params.venueId as string;
  const [selectedSport, setSelectedSport] = useState<string>('');
  const [selectedGender, setSelectedGender] = useState<string>('');
  const [selectedVenueMapping, setSelectedVenueMapping] = useState<string>('');
  const [assignments, setAssignments] = useState<TeamAssignment[]>([]);
  const { addNotification } = useNotification();

  // Get venue level mappings
  const { data: venueMappings } = api.volunteers.venue.getVenueLevelMappings.useQuery({
    venueId
  });

  // Get available sports
  const { data: sports } = api.sports.getAll.useQuery();

  // Get teams for assignment
  const { data: teams, refetch: refetchTeams } = api.volunteers.team.getTeamsForNumberAssignment.useQuery({
    venueLevelMappingId: selectedVenueMapping,
    sportId: selectedSport,
    genderCategory: selectedGender as any
  }, {
    enabled: !!(selectedVenueMapping && selectedSport && selectedGender)
  });

  const assignNumbersMutation = api.volunteers.team.assignTournamentNumbers.useMutation({
    onSuccess: () => {
      addNotification('Tournament numbers assigned successfully', 'success');
      refetchTeams();
      setAssignments([]);
    }
  });

  // Initialize assignments when teams load
  React.useEffect(() => {
    if (teams) {
      const newAssignments = teams.map((team, index) => ({
        teamId: team.id,
        teamName: team.name,
        captainName: team.captainName,
        number: team.tournamentNumber || index + 1
      }));
      setAssignments(newAssignments);
    }
  }, [teams]);

  const handleNumberChange = (teamId: string, number: number) => {
    setAssignments(prev =>
      prev.map(assignment =>
        assignment.teamId === teamId
          ? { ...assignment, number }
          : assignment
      )
    );
  };

  const handleRandomize = () => {
    const numbers = assignments.map((_, index) => index + 1);
    const shuffled = [...numbers].sort(() => Math.random() - 0.5);
    
    setAssignments(prev =>
      prev.map((assignment, index) => ({
        ...assignment,
        number: shuffled[index]!
      }))
    );
  };

  const handleSave = () => {
    if (!selectedVenueMapping || !selectedSport || !selectedGender) {
      addNotification('Please select all filters', 'error');
      return;
    }

    // Check for duplicate numbers
    const numbers = assignments.map(a => a.number);
    const duplicates = numbers.filter((num, index) => numbers.indexOf(num) !== index);
    
    if (duplicates.length > 0) {
      addNotification(
        `Duplicate numbers found: ${duplicates.join(', ')} are assigned to multiple teams`,
        'error'
      );
      return;
    }

    assignNumbersMutation.mutate({
      venueLevelMappingId: selectedVenueMapping,
      sportId: selectedSport,
      genderCategory: selectedGender as any,
      assignments: assignments.map(a => ({
        teamId: a.teamId,
        number: a.number
      }))
    });
  };

  const getDuplicateNumbers = () => {
    const numbers = assignments.map(a => a.number);
    return numbers.filter((num, index) => numbers.indexOf(num) !== index);
  };

  const duplicateNumbers = getDuplicateNumbers();

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Tournament Number Assignment</h1>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Tournament Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Venue Level</Label>
              <Select value={selectedVenueMapping} onValueChange={setSelectedVenueMapping}>
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {venueMappings?.map((mapping) => (
                    <SelectItem key={mapping.id} value={mapping.id}>
                      {mapping.level.toUpperCase()} - {mapping.venue.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Sport</Label>
              <Select value={selectedSport} onValueChange={setSelectedSport}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sport" />
                </SelectTrigger>
                <SelectContent>
                  {sports?.map((sport) => (
                    <SelectItem key={sport.id} value={sport.id}>
                      {sport.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Gender Category</Label>
              <Select value={selectedGender} onValueChange={setSelectedGender}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="men">Men</SelectItem>
                  <SelectItem value="women">Women</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Teams and Number Assignment */}
      {teams && teams.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Assign Tournament Numbers</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {teams.length} teams found for this category
                </p>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={handleRandomize}
                  disabled={assignments.length === 0}
                >
                  <Shuffle className="h-4 w-4 mr-2" />
                  Randomize
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={assignments.length === 0 || duplicateNumbers.length > 0}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Numbers
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {duplicateNumbers.length > 0 && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">
                  Duplicate numbers found: {duplicateNumbers.join(', ')}. 
                  Please ensure all teams have unique numbers.
                </p>
              </div>
            )}

            <div className="grid gap-4">
              {assignments.map((assignment) => (
                <div
                  key={assignment.teamId}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Hash className="h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        min="1"
                        max={teams.length}
                        value={assignment.number}
                        onChange={(e) => 
                          handleNumberChange(assignment.teamId, parseInt(e.target.value) || 1)
                        }
                        className={`w-20 ${
                          duplicateNumbers.includes(assignment.number) 
                            ? 'border-red-500' 
                            : ''
                        }`}
                      />
                    </div>
                    <div>
                      <div className="font-semibold">{assignment.teamName}</div>
                      <div className="text-sm text-muted-foreground">
                        Captain: {assignment.captainName}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {duplicateNumbers.includes(assignment.number) && (
                      <Badge variant="destructive">Duplicate</Badge>
                    )}
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {teams && teams.length === 0 && selectedVenueMapping && selectedSport && selectedGender && (
        <Card>
          <CardContent className="text-center py-8">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No checked-in teams found for this category
            </p>
          </CardContent>
        </Card>
      )}

      {!selectedVenueMapping || !selectedSport || !selectedGender && (
        <Card>
          <CardContent className="text-center py-8">
            <Hash className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Please select venue level, sport, and gender category to view teams
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
