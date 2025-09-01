'use client';

import { api } from '@/server/trpc/react';
import AdminChatMonitor from '@/components/chat/AdminChatMonitor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { MessageSquare, TrendingUp, Users, AlertCircle } from 'lucide-react';

export default function AdminChatPage() {
  const { data: venues } = api.venue.getAll.useQuery();
  const { data: chatStats } = api.admin.getChatStats.useQuery();

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="w-6 h-6" />
          Communication Management
        </h1>
        <p className="text-gray-600 mt-2">
          Monitor and manage venue communications
        </p>
      </div>

      {/* Overview Stats */}
      {chatStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{chatStats.totalMessages}</p>
                  <p className="text-sm text-gray-600">Total Messages</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{chatStats.activeVenues}</p>
                  <p className="text-sm text-gray-600">Active Venues</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{chatStats.activeUsers}</p>
                  <p className="text-sm text-gray-600">Active Users</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{chatStats.unreadMessages}</p>
                  <p className="text-sm text-gray-600">Unread Messages</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chat Monitor */}
      {venues && (
        <AdminChatMonitor venues={venues} />
      )}
    </div>
  );
}
