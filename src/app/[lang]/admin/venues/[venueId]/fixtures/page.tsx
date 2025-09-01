'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/server/trpc/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/AdvancedSelect';
import { useAlert } from '@/hooks/useAlert';
import { useNotification } from '@/context/NotificationContext';
import { Trophy, Users, Plus, Eye } from 'lucide-react';
import Link from 'next/link';

export default function AdminFixturesPage() {
  const params = useParams();
  const venueId = params.venueId as string;
  const [createDialog, setCreateDialog] = useState(false);
  const { addNotification } = useNotification();

  const { data: fixtures, refetch } = api.volunteers.fixture.getVenueFixtures.useQuery({
    venueId
  });

  const { data: availableSports } = api.volunteers.fixture.getAvailableSportsForFixture.useQuery({
    venueId
  });

  const createFixtureMutation = api.volunteers.fixture.createFixture.useMutation({
    onSuccess: () => {
      addNotification('Fixture created successfully', 'success');
      setCreateDialog(false);
      refetch();
    }
  });

  const handleCreateFixture = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createFixtureMutation.mutate({
      venueId,
      name: formData.get('name') as string,
      sportId: formData.get('sportId') as string,
      genderCategory: formData.get('genderCategory') as any,
      level: formData.get('level') as any,
      maxTeams: parseInt(formData.get('maxTeams') as string)
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-yellow-500';
      case 'teams_assigned': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Fixtures Management</h1>
        <Dialog open={createDialog} onOpenChange={setCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Fixture
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Fixture</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateFixture} className="space-y-4">
              <div>
                <Label>Fixture Name</Label>
                <Input name="name" required placeholder="e.g., Men's Football Quarter Final" />
              </div>
              <div>
                <Label>Sport & Category</Label>
                <Select name="sportId" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select sport category" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSports?.map((sport) => (
                      <SelectItem key={`${sport.sportId}_${sport.genderCategory}`} value={sport.sportId}>
                        {sport.sportName} ({sport.genderCategory}) - {sport.teamCount} teams
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Gender Category</Label>
                  <Select name="genderCategory" required>
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
                <div>
                  <Label>Tournament Level</Label>
                  <Select name="level" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cluster">Cluster</SelectItem>
                      <SelectItem value="division">Division</SelectItem>
                      <SelectItem value="final">Final</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Max Teams</Label>
                <Input name="maxTeams" type="number" min="2" max="64" defaultValue="16" required />
              </div>
              <Button type="submit" className="w-full">Create Fixture</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {fixtures?.map((fixture) => (
          <Card key={fixture.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{fixture.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {fixture.sport.name} • {fixture.genderCategory} • {fixture.level}
                  </p>
                </div>
                <Badge className={getStatusColor(fixture.status)}>
                  {fixture.status.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Trophy className="h-4 w-4" />
                    <span className="text-sm">{fixture.matches?.length || 0} matches</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <span className="text-sm">
                      {fixture.matches?.filter(m => m.status === 'completed').length || 0} completed
                    </span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Link href={`/admin/venues/${venueId}/fixtures/${fixture.id}/bracket`}>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      View Bracket
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {fixtures?.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No fixtures created yet</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
