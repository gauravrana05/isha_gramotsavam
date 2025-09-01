"use client";

import { useState } from 'react';
import { useTranslation } from '@/lib/utils/i18n';
import { 
  Trophy, 
  Users, 
  Timer,
  Target,
  Zap,
  Shield,
  Star,
  CheckCircle2,
  AlertCircle,
  Info
} from 'lucide-react';

interface SportSpecificGuideProps {
  sport: string;
  venueId: string;
}

export default function SportSpecificGuide({ sport, venueId }: SportSpecificGuideProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('rules');

  // Sport-specific configurations
  const sportConfig = getSportConfig(sport);

  const tabs = [
    { id: 'rules', label: t('volunteer.guide.sport.rules', 'Rules & Scoring'), icon: <Trophy className="w-4 h-4" /> },
    { id: 'equipment', label: t('volunteer.guide.sport.equipment', 'Equipment'), icon: <Shield className="w-4 h-4" /> },
    { id: 'timing', label: t('volunteer.guide.sport.timing', 'Match Timing'), icon: <Timer className="w-4 h-4" /> },
    { id: 'positions', label: t('volunteer.guide.sport.positions', 'Player Positions'), icon: <Users className="w-4 h-4" /> }
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
        <div className="p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Target className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {t('volunteer.guide.sport.specificGuide', '{{sport}} Specific Guide', { sport: sportConfig.displayName })}
              </h2>
              <p className="text-sm text-gray-600">
                {t('volunteer.guide.sport.subtitle', 'Essential information for managing {{sport}} matches', { sport: sportConfig.displayName })}
              </p>
            </div>
          </div>
        </div>

        {/* Mobile-First Tabs */}
        <div className="px-4 sm:px-6">
          <div className="flex overflow-x-auto gap-1 pb-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {/* Rules & Scoring Tab */}
        {activeTab === 'rules' && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                <Star className="w-4 h-4" />
                {t('volunteer.guide.sport.scoringSystem', 'Scoring System')}
              </h3>
              <div className="space-y-2 text-sm text-green-800">
                {sportConfig.scoringRules.map((rule, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{t(`volunteer.guide.sport.${sport}.scoring.${index}`, rule)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <h3 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {t('volunteer.guide.sport.keyRules', 'Key Rules to Remember')}
              </h3>
              <div className="space-y-2 text-sm text-amber-800">
                {sportConfig.keyRules.map((rule, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{t(`volunteer.guide.sport.${sport}.rules.${index}`, rule)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Equipment Tab */}
        {activeTab === 'equipment' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h3 className="font-semibold text-blue-900 mb-3">
                  {t('volunteer.guide.sport.requiredEquipment', 'Required Equipment')}
                </h3>
                <ul className="space-y-2 text-sm text-blue-800">
                  {sportConfig.requiredEquipment.map((item, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      {t(`volunteer.guide.sport.${sport}.equipment.${index}`, item)}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <h3 className="font-semibold text-purple-900 mb-3">
                  {t('volunteer.guide.sport.safetyGear', 'Safety Requirements')}
                </h3>
                <ul className="space-y-2 text-sm text-purple-800">
                  {sportConfig.safetyRequirements.map((item, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      {t(`volunteer.guide.sport.${sport}.safety.${index}`, item)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Timing Tab */}
        {activeTab === 'timing' && (
          <div className="space-y-4">
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
              <h3 className="font-semibold text-indigo-900 mb-4">
                {t('volunteer.guide.sport.matchDuration', 'Match Duration & Structure')}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-indigo-800 mb-2">
                    <strong>{t('volunteer.guide.sport.totalDuration', 'Total Duration')}:</strong> {sportConfig.matchDuration}
                  </p>
                  <p className="text-sm text-indigo-800 mb-2">
                    <strong>{t('volunteer.guide.sport.periods', 'Periods')}:</strong> {sportConfig.periods}
                  </p>
                  <p className="text-sm text-indigo-800">
                    <strong>{t('volunteer.guide.sport.breakTime', 'Break Time')}:</strong> {sportConfig.breakTime}
                  </p>
                </div>
                <div className="space-y-2">
                  {sportConfig.timingNotes.map((note, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm text-indigo-800">
                      <Timer className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{t(`volunteer.guide.sport.${sport}.timing.${index}`, note)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Positions Tab */}
        {activeTab === 'positions' && (
          <div className="space-y-4">
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
              <h3 className="font-semibold text-teal-900 mb-4">
                {t('volunteer.guide.sport.playerPositions', 'Player Positions & Roles')}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {sportConfig.playerPositions.map((position, index) => (
                  <div key={index} className="bg-white rounded-lg p-3 border border-teal-200">
                    <h4 className="font-medium text-teal-900 mb-2">{position.name}</h4>
                    <p className="text-sm text-teal-800">{position.description}</p>
                    {position.number && (
                      <p className="text-xs text-teal-600 mt-1">
                        {t('volunteer.guide.sport.playerNumber', 'Player #')}{position.number}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Sport configuration helper
function getSportConfig(sport: string) {
  const configs: Record<string, any> = {
    volleyball: {
      displayName: 'Volleyball',
      matchDuration: '90 minutes (best of 5 sets)',
      periods: '5 sets (first to 25 points)',
      breakTime: '3 minutes between sets',
      scoringRules: [
        'First to 25 points wins the set (must win by 2)',
        'Best of 5 sets wins the match',
        'Rally scoring - every serve results in a point',
        'Service rotation clockwise after winning serve'
      ],
      keyRules: [
        'Maximum 3 hits per side before crossing net',
        'Players rotate positions on serve win',
        'No double hits by same player',
        'Ball must be clearly hit, not carried'
      ],
      requiredEquipment: [
        'Volleyball net (2.43m height for men, 2.24m for women)',
        'Official volleyball',
        'Boundary markers/tape',
        'Score board or sheets'
      ],
      safetyRequirements: [
        'Court boundary clearly marked',
        'Net properly tensioned and secure',
        'First aid kit accessible',
        'Player knee pads recommended'
      ],
      timingNotes: [
        'No time limit per set',
        'Technical timeouts at 8 and 16 points',
        'Each team gets 2 timeouts per set'
      ],
      playerPositions: [
        { name: 'Setter', description: 'Runs the offense, sets up attacks', number: '1' },
        { name: 'Outside Hitter', description: 'Primary attackers from left side', number: '2,3' },
        { name: 'Middle Blocker', description: 'Blocks and quick attacks', number: '4,5' },
        { name: 'Libero', description: 'Defensive specialist, cannot attack', number: '6' }
      ]
    },
    throwball: {
      displayName: 'Throwball',
      matchDuration: '60 minutes (best of 3 sets)',
      periods: '3 sets (first to 25 points)',
      breakTime: '5 minutes between sets',
      scoringRules: [
        'First to 25 points wins the set',
        'Best of 3 sets wins the match',
        'Each catch and throw scores a point',
        'Service alternates after each point'
      ],
      keyRules: [
        'Ball must be caught cleanly before throwing',
        'Maximum 3 seconds to hold the ball',
        'Players must throw from behind the service line',
        'Ball cannot touch the ground on serving side'
      ],
      requiredEquipment: [
        'Throwball net (2.2m height)',
        'Official throwball',
        'Court marking chalk/tape',
        'Whistle for referee'
      ],
      safetyRequirements: [
        'Court surface non-slip',
        'Net anchors secure',
        'Medical support on standby',
        'Water breaks every 10 minutes'
      ],
      timingNotes: [
        'Sets have no time limit',
        'Teams switch sides after each set',
        'Timeout allowed once per set per team'
      ],
      playerPositions: [
        { name: 'Server', description: 'Initiates play from service area', number: '1' },
        { name: 'Front Line', description: 'Catches and throws at net', number: '2,3,4' },
        { name: 'Back Line', description: 'Defensive catches and support', number: '5,6,7' }
      ]
    }
  };

  return configs[sport?.toLowerCase()] || configs.volleyball;
}