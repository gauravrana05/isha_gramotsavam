'use client';

import { useParams } from 'next/navigation';
import VolunteerChat from '@/components/chat/VolunteerChat';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';

export default function VolunteerChatPage() {
  const { venueId } = useParams();

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="w-6 h-6" />
          Venue Communication
        </h1>
        <p className="text-gray-600 mt-2">
          Send messages to players and captains at this venue
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <VolunteerChat venueId={venueId as string} />
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Message Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <h4 className="font-medium mb-2">Target Options:</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• <strong>All</strong> - Everyone at venue</li>
                  <li>• <strong>Captains</strong> - Team leaders only</li>
                  <li>• <strong>Players</strong> - Individual players only</li>
                  <li>• <strong>Individual</strong> - Specific person</li>
                </ul>
              </div>
              
              <div className="text-sm">
                <h4 className="font-medium mb-2">Best Practices:</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Keep messages clear and concise</li>
                  <li>• Use appropriate target audience</li>
                  <li>• Include time-sensitive information</li>
                  <li>• Be professional and helpful</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Messages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm space-y-2">
                <p className="font-medium">Common announcements:</p>
                <div className="space-y-1 text-gray-600">
                  <p>• "Match starting in 15 minutes"</p>
                  <p>• "Please complete team check-in"</p>
                  <p>• "Venue facilities information"</p>
                  <p>• "Weather/schedule updates"</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
