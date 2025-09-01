'use client';

import { useState } from 'react';
import { api } from '@/server/trpc/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/AdvancedSelect';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/Button';
import { MessageSquare, Eye, Users, Crown, User, RefreshCw } from 'lucide-react';
import VolunteerChat from './VolunteerChat';

interface AdminChatMonitorProps {
  venues: Array<{ id: string; name: string; }>;
}

export default function AdminChatMonitor({ venues }: AdminChatMonitorProps) {
  const [selectedVenueId, setSelectedVenueId] = useState<string>('');

  const { data: messages, refetch: refetchMessages } = api.chat.getVenueMessages.useQuery({
    venueId: selectedVenueId,
    limit: 100
  }, {
    enabled: !!selectedVenueId
  });

  const { data: participants } = api.chat.getVenueParticipants.useQuery({
    venueId: selectedVenueId
  }, {
    enabled: !!selectedVenueId
  });

  const getMessageStats = () => {
    if (!messages) return { total: 0, byVolunteers: 0, toIndividuals: 0 };
    
    return {
      total: messages.length,
      byVolunteers: messages.filter(m => m.senderRole === 'volunteer').length,
      toIndividuals: messages.filter(m => m.targetType === 'individual').length
    };
  };

  const getParticipantStats = () => {
    if (!participants) return { captains: 0, players: 0 };
    
    return {
      captains: participants.filter(p => p.role === 'captain').length,
      players: participants.filter(p => p.role === 'player').length
    };
  };

  const stats = getMessageStats();
  const participantStats = getParticipantStats();

  return (
    <div className="space-y-6">
      {/* Venue Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Chat Monitoring Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Select value={selectedVenueId} onValueChange={setSelectedVenueId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select venue to monitor" />
                </SelectTrigger>
                <SelectContent>
                  {venues.map((venue) => (
                    <SelectItem key={venue.id} value={venue.id}>
                      {venue.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedVenueId && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetchMessages()}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedVenueId && (
        <>
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.total}</p>
                    <p className="text-sm text-gray-600">Total Messages</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.byVolunteers}</p>
                    <p className="text-sm text-gray-600">By Volunteers</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-yellow-500" />
                  <div>
                    <p className="text-2xl font-bold">{participantStats.captains}</p>
                    <p className="text-sm text-gray-600">Captains</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-purple-500" />
                  <div>
                    <p className="text-2xl font-bold">{participantStats.players}</p>
                    <p className="text-sm text-gray-600">Players</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chat Interface */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Admin can send messages */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Send Messages</h3>
              <VolunteerChat venueId={selectedVenueId} />
            </div>

            {/* Message History */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Message History</h3>
              <Card className="h-[600px]">
                <CardContent className="p-4 h-full overflow-y-auto">
                  {messages && messages.length > 0 ? (
                    <div className="space-y-3">
                      {messages.map((msg) => (
                        <div key={msg.id} className="border rounded-lg p-3 bg-gray-50">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{msg.sender.name}</span>
                              <Badge variant={msg.senderRole === 'admin' ? 'default' : 'secondary'}>
                                {msg.senderRole}
                              </Badge>
                              <Badge variant="outline">
                                {msg.targetType === 'all' ? 'All' :
                                 msg.targetType === 'captains' ? 'Captains' :
                                 msg.targetType === 'players' ? 'Players' : 'Individual'}
                              </Badge>
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(msg.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{msg.content}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <div className="text-center">
                        <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No messages yet</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
