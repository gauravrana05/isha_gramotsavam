'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, ArrowRight, BookOpen, Users, Trophy } from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: string;
  route: string;
  userTypes: string[];
}

export default function OnboardingFlow() {
  const { user } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const onboardingSteps: OnboardingStep[] = [
    {
      id: 'profile',
      title: 'Complete Your Profile',
      description: 'Add your personal information and verification documents',
      icon: <CheckCircle className="w-6 h-6" />,
      action: 'Complete Profile',
      route: '/profile/complete',
      userTypes: ['player', 'captain', 'volunteer']
    },
    {
      id: 'guide',
      title: 'Read Your Guide',
      description: 'Learn how to use the platform effectively',
      icon: <BookOpen className="w-6 h-6" />,
      action: 'View Guide',
      route: getUserGuideRoute(user?.role),
      userTypes: ['player', 'captain', 'volunteer']
    },
    {
      id: 'team',
      title: 'Join or Create Team',
      description: 'Find teammates or create your own team',
      icon: <Users className="w-6 h-6" />,
      action: 'Manage Teams',
      route: getTeamRoute(user?.role),
      userTypes: ['player', 'captain']
    },
    {
      id: 'tournament',
      title: 'Explore Tournaments',
      description: 'Browse available sports and tournaments',
      icon: <Trophy className="w-6 h-6" />,
      action: 'View Sports',
      route: '/public/sports',
      userTypes: ['player', 'captain']
    }
  ];

  function getUserGuideRoute(role?: string): string {
    switch (role) {
      case 'captain': return '/captain/guide';
      case 'player': return '/player/guide';
      case 'volunteer': return '/volunteer/guide';
      default: return '/public/sports';
    }
  }

  function getTeamRoute(role?: string): string {
    switch (role) {
      case 'captain': return '/captain/teams';
      case 'player': return '/player/teams';
      default: return '/public/sports';
    }
  }

  const relevantSteps = onboardingSteps.filter(step => 
    step.userTypes.includes(user?.role || 'player')
  );

  const handleStepComplete = (stepId: string, route: string) => {
    setCompletedSteps(prev => new Set([...prev, stepId]));
    router.push(route);
  };

  const handleSkip = () => {
    const dashboardRoute = getDashboardRoute(user?.role);
    router.push(dashboardRoute);
  };

  function getDashboardRoute(role?: string): string {
    switch (role) {
      case 'admin': return '/admin';
      case 'captain': return '/captain/dashboard';
      case 'volunteer': return '/volunteer';
      default: return '/player/dashboard';
    }
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to Isha Gramotsavam! 🎉
          </h1>
          <p className="text-gray-600">
            Let&apos;s get you started with a quick setup
          </p>
        </div>

        <div className="space-y-4">
          {relevantSteps.map((step, index) => (
            <Card 
              key={step.id} 
              className={`transition-all duration-200 ${
                completedSteps.has(step.id) 
                  ? 'bg-green-50 border-green-200' 
                  : 'hover:shadow-md'
              }`}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    completedSteps.has(step.id) 
                      ? 'bg-green-100 text-green-600' 
                      : 'bg-purple-100 text-purple-600'
                  }`}>
                    {step.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{step.title}</h3>
                    <p className="text-sm text-gray-600 font-normal">
                      {step.description}
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Button 
                  onClick={() => handleStepComplete(step.id, step.route)}
                  className="w-full"
                  variant={completedSteps.has(step.id) ? "outline" : "default"}
                >
                  {completedSteps.has(step.id) ? 'Completed ✓' : step.action}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Button 
            variant="ghost" 
            onClick={handleSkip}
            className="text-gray-500 hover:text-gray-700"
          >
            Skip for now
          </Button>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            You can access these features anytime from your dashboard
          </p>
        </div>
      </div>
    </div>
  );
}
