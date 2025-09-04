'use client';

import { useState } from 'react';
import { MobileLayout } from '../MobileLayout';
import { MobilePageWrapper } from '../MobilePageWrapper';
import { CaptainDashboard } from '../dashboard/CaptainDashboard';
import { CaptainTeamView } from '../team/CaptainTeamView';
import { MobileLiveView } from '../live/MobileLiveView';
import { MobileMediaView } from '../media/MobileMediaView';
import { MobileChatView } from '../chat/MobileChatView';
import { type MobileTab } from '../BottomNavigation';

export function MobileCaptainInterface() {
  const [currentTab, setCurrentTab] = useState<MobileTab>('dashboard');

  const getTabTitle = (tab: MobileTab): string => {
    switch (tab) {
      case 'dashboard': return 'Captain Dashboard';
      case 'team': return 'My Team';
      case 'live': return 'Live Matches';
      case 'media': return 'Venue Media';
      case 'chat': return 'Venue Chat';
      default: return 'Captain';
    }
  };

  const renderTabContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return (
          <MobilePageWrapper>
            <CaptainDashboard />
          </MobilePageWrapper>
        );
      
      case 'team':
        return (
          <MobilePageWrapper>
            <CaptainTeamView />
          </MobilePageWrapper>
        );
      
      case 'live':
        return (
          <MobilePageWrapper>
            <MobileLiveView />
          </MobilePageWrapper>
        );
      
      case 'media':
        return (
          <MobilePageWrapper>
            <MobileMediaView />
          </MobilePageWrapper>
        );
      
      case 'chat':
        return (
          <MobilePageWrapper>
            <MobileChatView />
          </MobilePageWrapper>
        );
      
      default:
        return null;
    }
  };

  return (
    <MobileLayout
      currentTab={currentTab}
      onTabChange={setCurrentTab}
      title={getTabTitle(currentTab)}
      role="captain"
    >
      {renderTabContent()}
    </MobileLayout>
  );
}
