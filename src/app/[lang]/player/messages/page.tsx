'use client';

import { useState } from 'react';
import { api } from '@/server/trpc/react';
import { useAuth } from '@/context/AuthContext';
import PlayerChat from '@/components/chat/PlayerChat';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/AdvancedSelect';
import { MessageSquare, MapPin } from 'lucide-react';

export default function PlayerMessagesPage() {
  const { user } = useAuth();
  const [selectedVenueId, setSelectedVenueId] = useState<string>('');

  // Get venues where user has teams/matches
  const { data: userVenues } = api.venue.getUserVenues.useQuery();

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="w-6 h-6" />
          Venue Messages
        </h1>
        <p className="text-gray-600 mt-2">
          View messages from volunteers and organizers
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          {selectedVenueId ? (
            <PlayerChat venueId={selectedVenueId} />
          ) : (
            <Card className="h-[500px] flex items-center justify-center">
              <CardContent className="text-center">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">Select a Venue</h3>
                <p className="text-gray-600">
                  Choose a venue to view messages from volunteers
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
                Your Venues
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedVenueId} onValueChange={setSelectedVenueId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select venue" />
                </SelectTrigger>
                <SelectContent>
                  {userVenues?.map((venue) => (
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
              <CardTitle className="text-lg">Message Types</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-400 rounded"></div>
                  <span>General announcements</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-400 rounded"></div>
                  <span>Captain-specific messages</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-400 rounded"></div>
                  <span>Player-specific messages</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-400 rounded"></div>
                  <span>Private messages</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Important</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600 space-y-2">
                <p>• Check messages regularly for updates</p>
                <p>• Private messages require immediate attention</p>
                <p>• Contact volunteers if you need help</p>
                <p>• Messages auto-refresh every 15 seconds</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
