"use client";

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslation } from '@/lib/utils/i18n';
import { useAuth } from '@/context/AuthContext';
import { 
  BookOpen, 
  CheckCircle, 
  Clock, 
  Users, 
  MapPin, 
  Clipboard, 
  AlertTriangle,
  Trophy,
  Camera,
  FileText,
  Phone,
  Shield,
  Heart,
  Target,
  ChevronRight,
  ChevronDown,
  Play,
  Pause,
  RotateCcw,
  Flag,
  Award,
  UserCheck,
  MessageSquare,
  Megaphone
} from 'lucide-react';

interface GuideSection {
  id: string;
  titleKey: string;
  icon: React.ReactNode;
  steps: GuideStep[];
}

interface GuideStep {
  id: string;
  titleKey: string;
  descriptionKey: string;
  type: 'action' | 'check' | 'warning' | 'info';
  appLocation?: string;
  duration?: string;
}

export default function VolunteerGuidePage() {
  const { lang, venueId } = useParams();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [expandedSection, setExpandedSection] = useState<string>('pre-match');
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const toggleStep = (stepId: string) => {
    const newCompleted = new Set(completedSteps);
    if (newCompleted.has(stepId)) {
      newCompleted.delete(stepId);
    } else {
      newCompleted.add(stepId);
    }
    setCompletedSteps(newCompleted);
  };

  const guideSections: GuideSection[] = [
    {
      id: 'pre-match',
      titleKey: 'volunteer.guide.preMatch.title',
      icon: <Clock className="w-5 h-5" />,
      steps: [
        {
          id: 'venue-arrival',
          titleKey: 'volunteer.guide.preMatch.venueArrival.title',
          descriptionKey: 'volunteer.guide.preMatch.venueArrival.description',
          type: 'action',
          duration: '30 min before match',
          appLocation: '/volunteer/venues/[venueId]/checkin'
        },
        {
          id: 'equipment-check',
          titleKey: 'volunteer.guide.preMatch.equipmentCheck.title',
          descriptionKey: 'volunteer.guide.preMatch.equipmentCheck.description',
          type: 'check',
          duration: '25 min before',
          appLocation: '/volunteer/venues/[venueId]/equipment'
        },
        {
          id: 'team-verification',
          titleKey: 'volunteer.guide.preMatch.teamVerification.title',
          descriptionKey: 'volunteer.guide.preMatch.teamVerification.description',
          type: 'action',
          duration: '20 min before',
          appLocation: '/volunteer/venues/[venueId]/teams/verify'
        },
        {
          id: 'player-documents',
          titleKey: 'volunteer.guide.preMatch.playerDocuments.title',
          descriptionKey: 'volunteer.guide.preMatch.playerDocuments.description',
          type: 'check',
          duration: '15 min before',
          appLocation: '/volunteer/venues/[venueId]/players/documents'
        },
        {
          id: 'match-sheet-prep',
          titleKey: 'volunteer.guide.preMatch.matchSheetPrep.title',
          descriptionKey: 'volunteer.guide.preMatch.matchSheetPrep.description',
          type: 'action',
          duration: '10 min before',
          appLocation: '/volunteer/venues/[venueId]/matches/[matchId]/sheet'
        }
      ]
    },
    {
      id: 'during-match',
      titleKey: 'volunteer.guide.duringMatch.title',
      icon: <Play className="w-5 h-5" />,
      steps: [
        {
          id: 'match-start',
          titleKey: 'volunteer.guide.duringMatch.matchStart.title',
          descriptionKey: 'volunteer.guide.duringMatch.matchStart.description',
          type: 'action',
          appLocation: '/volunteer/venues/[venueId]/matches/[matchId]/live'
        },
        {
          id: 'score-tracking',
          titleKey: 'volunteer.guide.duringMatch.scoreTracking.title',
          descriptionKey: 'volunteer.guide.duringMatch.scoreTracking.description',
          type: 'action',
          appLocation: '/volunteer/venues/[venueId]/matches/[matchId]/score'
        },
        {
          id: 'incident-reporting',
          titleKey: 'volunteer.guide.duringMatch.incidentReporting.title',
          descriptionKey: 'volunteer.guide.duringMatch.incidentReporting.description',
          type: 'warning',
          appLocation: '/volunteer/venues/[venueId]/matches/[matchId]/incidents'
        },
        {
          id: 'substitutions',
          titleKey: 'volunteer.guide.duringMatch.substitutions.title',
          descriptionKey: 'volunteer.guide.duringMatch.substitutions.description',
          type: 'action',
          appLocation: '/volunteer/venues/[venueId]/matches/[matchId]/substitutions'
        },
        {
          id: 'match-photos',
          titleKey: 'volunteer.guide.duringMatch.matchPhotos.title',
          descriptionKey: 'volunteer.guide.duringMatch.matchPhotos.description',
          type: 'info',
          appLocation: '/volunteer/venues/[venueId]/matches/[matchId]/media'
        }
      ]
    },
    {
      id: 'post-match',
      titleKey: 'volunteer.guide.postMatch.title',
      icon: <Flag className="w-5 h-5" />,
      steps: [
        {
          id: 'final-score',
          titleKey: 'volunteer.guide.postMatch.finalScore.title',
          descriptionKey: 'volunteer.guide.postMatch.finalScore.description',
          type: 'action',
          appLocation: '/volunteer/venues/[venueId]/matches/[matchId]/result'
        },
        {
          id: 'match-report',
          titleKey: 'volunteer.guide.postMatch.matchReport.title',
          descriptionKey: 'volunteer.guide.postMatch.matchReport.description',
          type: 'action',
          appLocation: '/volunteer/venues/[venueId]/matches/[matchId]/report'
        },
        {
          id: 'equipment-return',
          titleKey: 'volunteer.guide.postMatch.equipmentReturn.title',
          descriptionKey: 'volunteer.guide.postMatch.equipmentReturn.description',
          type: 'check',
          appLocation: '/volunteer/venues/[venueId]/equipment/return'
        },
        {
          id: 'venue-cleanup',
          titleKey: 'volunteer.guide.postMatch.venueCleanup.title',
          descriptionKey: 'volunteer.guide.postMatch.venueCleanup.description',
          type: 'check'
        },
        {
          id: 'data-sync',
          titleKey: 'volunteer.guide.postMatch.dataSync.title',
          descriptionKey: 'volunteer.guide.postMatch.dataSync.description',
          type: 'action',
          appLocation: '/volunteer/venues/[venueId]/sync'
        }
      ]
    },
    {
      id: 'emergency',
      titleKey: 'volunteer.guide.emergency.title',
      icon: <AlertTriangle className="w-5 h-5" />,
      steps: [
        {
          id: 'medical-emergency',
          titleKey: 'volunteer.guide.emergency.medicalEmergency.title',
          descriptionKey: 'volunteer.guide.emergency.medicalEmergency.description',
          type: 'warning'
        },
        {
          id: 'weather-conditions',
          titleKey: 'volunteer.guide.emergency.weatherConditions.title',
          descriptionKey: 'volunteer.guide.emergency.weatherConditions.description',
          type: 'warning'
        },
        {
          id: 'crowd-control',
          titleKey: 'volunteer.guide.emergency.crowdControl.title',
          descriptionKey: 'volunteer.guide.emergency.crowdControl.description',
          type: 'warning'
        },
        {
          id: 'technical-issues',
          titleKey: 'volunteer.guide.emergency.technicalIssues.title',
          descriptionKey: 'volunteer.guide.emergency.technicalIssues.description',
          type: 'info'
        }
      ]
    },
    {
      id: 'app-features',
      titleKey: 'volunteer.guide.appFeatures.title',
      icon: <Phone className="w-5 h-5" />,
      steps: [
        {
          id: 'offline-mode',
          titleKey: 'volunteer.guide.appFeatures.offlineMode.title',
          descriptionKey: 'volunteer.guide.appFeatures.offlineMode.description',
          type: 'info'
        },
        {
          id: 'data-sync-feature',
          titleKey: 'volunteer.guide.appFeatures.dataSyncFeature.title',
          descriptionKey: 'volunteer.guide.appFeatures.dataSyncFeature.description',
          type: 'info'
        },
        {
          id: 'camera-integration',
          titleKey: 'volunteer.guide.appFeatures.cameraIntegration.title',
          descriptionKey: 'volunteer.guide.appFeatures.cameraIntegration.description',
          type: 'info'
        },
        {
          id: 'contact-support',
          titleKey: 'volunteer.guide.appFeatures.contactSupport.title',
          descriptionKey: 'volunteer.guide.appFeatures.contactSupport.description',
          type: 'info'
        }
      ]
    }
  ];

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'action': return <Target className="w-4 h-4 text-blue-500" />;
      case 'check': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'info': return <FileText className="w-4 h-4 text-gray-500" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getCompletionStats = () => {
    const totalSteps = guideSections.reduce((sum, section) => sum + section.steps.length, 0);
    const completedCount = completedSteps.size;
    const percentage = Math.round((completedCount / totalSteps) * 100);
    return { total: totalSteps, completed: completedCount, percentage };
  };

  const stats = getCompletionStats();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-First Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="px-4 py-4 sm:py-6 max-w-4xl mx-auto">
          <div className="flex items-start gap-3 mb-4">
            <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500 flex-shrink-0 mt-1" />
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 leading-tight">
                {t('volunteer.guide.title', 'Volunteer Match Day Guide')}
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                {t('volunteer.guide.subtitle', 'Complete guide for successful match day operations')}
              </p>
            </div>
          </div>

          {/* Mobile-Optimized Progress Bar */}
          <div className="bg-gray-100 rounded-full h-2 mb-2">
            <div 
              className="bg-orange-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${stats.percentage}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs sm:text-sm text-gray-600">
            <span className="truncate">{t('volunteer.guide.progress', 'Progress: {{completed}}/{{total}} steps', { 
              completed: stats.completed, 
              total: stats.total 
            })}</span>
            <span className="font-semibold">{stats.percentage}%</span>
          </div>
        </div>
      </div>

      {/* Mobile-First Guide Content */}
      <div className="px-4 py-4 sm:py-6 max-w-4xl mx-auto">
        <div className="space-y-3 sm:space-y-6">
          {guideSections.map((section) => (
            <div key={section.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <button
                onClick={() => setExpandedSection(expandedSection === section.id ? '' : section.id)}
                className="w-full px-4 py-4 sm:px-6 sm:py-5 flex items-center justify-between hover:bg-gray-50 transition-colors active:bg-gray-100"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="p-2 bg-orange-50 rounded-lg">
                    {section.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                      {t(section.titleKey)}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-medium">
                        {section.steps.filter(step => completedSteps.has(step.id)).length}/{section.steps.length}
                      </span>
                      <span className="text-xs text-gray-500">
                        {t('volunteer.guide.steps', 'steps')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0 ml-3">
                  {expandedSection === section.id ? 
                    <ChevronDown className="w-5 h-5 text-gray-400" /> : 
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  }
                </div>
              </button>

              {expandedSection === section.id && (
                <div className="px-4 pb-4 sm:px-6 sm:pb-6 border-t bg-gray-50/50">
                  <div className="space-y-3 sm:space-y-4 pt-4">
                    {section.steps.map((step, index) => (
                      <div key={step.id} className="flex gap-3 sm:gap-4">
                        <div className="flex-shrink-0 flex flex-col items-center">
                          <button
                            onClick={() => toggleStep(step.id)}
                            className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 flex items-center justify-center transition-all touch-manipulation ${
                              completedSteps.has(step.id)
                                ? 'bg-green-500 border-green-500 scale-110'
                                : 'border-gray-300 hover:border-gray-400 active:border-green-400'
                            }`}
                          >
                            {completedSteps.has(step.id) && 
                              <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                            }
                          </button>
                          {index < section.steps.length - 1 && (
                            <div className="w-px h-6 sm:h-8 bg-gray-200 mt-2"></div>
                          )}
                        </div>

                        <div className="flex-1 pb-3 sm:pb-6">
                          <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              {getStepIcon(step.type)}
                              <h3 className="font-medium text-gray-900 text-sm sm:text-base">
                                {t(step.titleKey)}
                              </h3>
                              {step.duration && (
                                <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs font-medium">
                                  {step.duration}
                                </span>
                              )}
                            </div>
                            <p className="text-gray-600 text-sm leading-relaxed">
                              {t(step.descriptionKey)}
                            </p>
                            {step.appLocation && (
                              <div className="mt-3 p-2 bg-blue-50 rounded-lg flex items-center gap-2">
                                <Phone className="w-3 h-3 text-blue-600 flex-shrink-0" />
                                <span className="text-xs text-blue-700 truncate">
                                  {t('volunteer.guide.appLocation', 'App')}: {step.appLocation.replace('[venueId]', venueId as string).split('/').pop()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Mobile-Optimized Quick Actions */}
        <div className="mt-4 sm:mt-8 bg-white rounded-xl shadow-sm border p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
            <Megaphone className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
            {t('volunteer.guide.quickActions.title', 'Quick Actions')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <button className="flex items-center gap-3 p-3 sm:p-4 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 rounded-xl transition-colors touch-manipulation">
              <UserCheck className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                {t('volunteer.guide.quickActions.checkIn', 'Venue Check-in')}
              </span>
            </button>
            <button className="flex items-center gap-3 p-3 sm:p-4 bg-green-50 hover:bg-green-100 active:bg-green-200 rounded-xl transition-colors touch-manipulation">
              <MessageSquare className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-900">
                {t('volunteer.guide.quickActions.support', 'Contact Support')}
              </span>
            </button>
            <button className="flex items-center gap-3 p-3 sm:p-4 bg-purple-50 hover:bg-purple-100 active:bg-purple-200 rounded-xl transition-colors touch-manipulation">
              <Camera className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">
                {t('volunteer.guide.quickActions.camera', 'Quick Capture')}
              </span>
            </button>
            <button className="flex items-center gap-3 p-3 sm:p-4 bg-amber-50 hover:bg-amber-100 active:bg-amber-200 rounded-xl transition-colors touch-manipulation">
              <Shield className="w-5 h-5 text-amber-600" />
              <span className="text-sm font-medium text-amber-900">
                {t('volunteer.guide.quickActions.emergency', 'Emergency')}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile-Optimized Pro Tips */}
        <div className="mt-4 sm:mt-6 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4 sm:p-6 mb-6">
          <h3 className="text-base sm:text-lg font-semibold text-orange-900 mb-3 flex items-center gap-2">
            <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
            {t('volunteer.guide.tips.title', 'Pro Tips for Success')}
          </h3>
          <div className="space-y-3">
            {[
              { key: 'tip1', text: 'Always arrive 30 minutes early to set up properly' },
              { key: 'tip2', text: 'Keep your phone charged and use offline mode when needed' },
              { key: 'tip3', text: 'Take photos during key moments - teams love memories!' },
              { key: 'tip4', text: 'Stay calm during emergencies and follow the protocols' },
              { key: 'tip5', text: 'Double-check all scores before submitting match results' },
              { key: 'tip6', text: 'Communicate clearly with team captains throughout the match' }
            ].map((tip, index) => (
              <div key={tip.key} className="flex items-start gap-3 p-3 bg-white/60 rounded-lg">
                <div className="flex-shrink-0 w-6 h-6 bg-orange-200 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-orange-800">{index + 1}</span>
                </div>
                <span className="text-sm text-orange-800 leading-relaxed">
                  {t(`volunteer.guide.tips.${tip.key}`, tip.text)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Bottom Spacing */}
        <div className="h-4 sm:h-6"></div>
      </div>
    </div>
  );
}