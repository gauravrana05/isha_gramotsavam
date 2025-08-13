"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  Database,
  Users,
  Trophy,
  Calendar,
  MapPin,
  Gamepad2,
  PlayCircle,
  Images,
  Bell,
  Settings,
  Plus,
  Trash2,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { PageLoader } from '@/components/ui';

// Import individual collection management components
import UsersManagement from './components/UsersManagement';
import TeamsManagement from './components/TeamsManagement';
import EventsManagement from './components/EventsManagement';
import SportsManagement from './components/SportsManagement';
import VenuesManagement from './components/VenuesManagement';
import MatchesManagement from './components/MatchesManagement';
import FixturesManagement from './components/FixturesManagement';
import MediaManagement from './components/MediaManagement';
import NotificationsManagement from './components/NotificationsManagement';
import SystemConfigManagement from './components/SystemConfigManagement';

type TabId = 
  | 'users' 
  | 'teams' 
  | 'events' 
  | 'sports' 
  | 'venues' 
  | 'matches' 
  | 'fixtures' 
  | 'media' 
  | 'notifications' 
  | 'systemConfig';

interface TabConfig {
  id: TabId;
  label: string;
  icon: any;
  description: string;
}

const tabs: TabConfig[] = [
  {
    id: 'users',
    label: 'Users',
    icon: Users,
    description: 'Manage user profiles, roles, and authentication data'
  },
  {
    id: 'teams',
    label: 'Teams',
    icon: Trophy,
    description: 'Create and manage teams with players and captains'
  },
  {
    id: 'events',
    label: 'Events',
    icon: Calendar,
    description: 'Configure tournament events and competitions'
  },
  {
    id: 'sports',
    label: 'Sports',
    icon: Gamepad2,
    description: 'Define sports with rules, eligibility, and team configs'
  },
  {
    id: 'venues',
    label: 'Venues',
    icon: MapPin,
    description: 'Manage tournament venues and locations'
  },
  {
    id: 'matches',
    label: 'Matches',
    icon: PlayCircle,
    description: 'Create and schedule individual matches'
  },
  {
    id: 'fixtures',
    label: 'Fixtures',
    icon: RefreshCw,
    description: 'Generate tournament brackets and fixtures'
  },
  {
    id: 'media',
    label: 'Media',
    icon: Images,
    description: 'Upload and manage tournament media assets'
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    description: 'Send notifications and manage templates'
  },
  {
    id: 'systemConfig',
    label: 'System Config',
    icon: Settings,
    description: 'Configure global system settings'
  }
];

export default function DataManagementPage() {
  const router = useRouter();
  const { lang } = useParams();
  const { user, userProfile, loading: authLoading } = useAuth();
  
  const [activeTab, setActiveTab] = useState<TabId>('users');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push(`/${lang}/login`);
      return;
    }

    if (userProfile?.role !== 'admin') {
      router.push(`/${lang}/dashboard`);
      return;
    }
  }, [user, userProfile, authLoading, lang, router]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'users':
        return <UsersManagement />;
      case 'teams':
        return <TeamsManagement />;
      case 'events':
        return <EventsManagement />;
      case 'sports':
        return <SportsManagement />;
      case 'venues':
        return <VenuesManagement />;
      case 'matches':
        return <MatchesManagement />;
      case 'fixtures':
        return <FixturesManagement />;
      case 'media':
        return <MediaManagement />;
      case 'notifications':
        return <NotificationsManagement />;
      case 'systemConfig':
        return <SystemConfigManagement />;
      default:
        return <div>Select a collection to manage</div>;
    }
  };

  if (authLoading) {
    return <PageLoader />;
  }

  if (!user || userProfile?.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Database className="w-8 h-8 text-orange-600" />
            <h1 className="text-3xl font-bold text-gray-900">Data Management</h1>
          </div>
          <p className="text-gray-600">
            Manage test data across all collections. Create, edit, and delete records for testing purposes.
          </p>
        </div>

        {/* Warning Banner */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-yellow-800">Test Data Management</h3>
              <p className="text-sm text-yellow-700 mt-1">
                This interface is designed for creating and managing test data. 
                All operations should be performed carefully as they directly affect the database.
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap
                      border-b-2 transition-colors
                      ${activeTab === tab.id
                        ? 'border-orange-500 text-orange-600 bg-orange-50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
          
          {/* Tab Description */}
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <p className="text-sm text-gray-600">
              {tabs.find(tab => tab.id === activeTab)?.description}
            </p>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}