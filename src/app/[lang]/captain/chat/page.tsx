'use client';

import { useState } from 'react';
import { api } from '@/server/trpc/react';
import { useAuth } from '@/context/AuthContext';
import PlayerChat from '@/components/chat/PlayerChat'; // Reuse the enhanced PlayerChat component
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/AdvancedSelect';
import { MessageSquare, MapPin, Users } from 'lucide-react';

export default function CaptainChatPage() {
  const { user } = useAuth();
  const [selectedVenueId, setSelectedVenueId] = useState<string>('');

  // Get venues where captain has teams/matches
  const { data: captainVenues } = api.venue.getUserVenues.useQuery();

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="w-6 h-6" />
          Team Communication
        </h1>
        <p className="text-gray-600 mt-2">
          Communicate with volunteers and organizers at your venues
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          {selectedVenueId ? (
            <PlayerChat venueId={selectedVenueId} />
          ) : (
            <Card className="h-[600px] flex items-center justify-center">
              <CardContent className="text-center">
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">Select a Venue</h3>
                <p className="text-gray-600">
                  Choose a venue to communicate with volunteers and staff
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Your Team Venues
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedVenueId} onValueChange={setSelectedVenueId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select venue" />
                </SelectTrigger>
                <SelectContent>
                  {captainVenues?.map((venue) => (
                    <SelectItem key={venue.id} value={venue.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{venue.name}</span>
                        <span className="text-xs text-gray-500">{venue.location}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Captain Communication</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm space-y-2">
                <h4 className="font-medium">You can:</h4>
                <div className="space-y-1 text-gray-600">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-400 rounded"></div>
                    <span>Message volunteers directly</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-400 rounded"></div>
                    <span>Reply to announcements</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-purple-400 rounded"></div>
                    <span>Send private messages</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-orange-400 rounded"></div>
                    <span>Ask questions about matches</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Best Practices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600 space-y-2">
                <p>• Be respectful and professional</p>
                <p>• Use clear and concise messages</p>
                <p>• Reply promptly to urgent messages</p>
                <p>• Contact volunteers for team issues</p>
                <p>• Keep communication venue-specific</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}