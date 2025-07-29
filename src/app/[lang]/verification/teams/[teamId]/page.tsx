"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useTranslation } from "@/lib/utils/i18n";
import Image from "next/image";
import { ArrowLeft, Users, MapPin, Phone, Loader2, AlertCircle, CheckCircle, Save } from "lucide-react";
import { PlayerVerificationForm } from "@/components/verification/PlayerVerificationForm";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";

interface Player {
  playerId?: string;
  name: string;
  mobile: string;
  gender: string;
  age: string;
  panchayat: string;
  district: string;
  state: string;
  isProfileComplete: boolean;
  isVerified: boolean;
  verificationStatus?: 'pending' | 'approved' | 'rejected';
  verificationComments?: string;
  joinedAt: string;
  role: string;
}

interface TeamData {
  id: string;
  teamName: string;
  sport: string;
  captainId: string;
  captainName: string;
  captainPhone: string;
  panchayat: string;
  district: string;
  state: string;
  players: Player[];
  maxPlayers: number;
  minPlayers: number;
  status: string;
  gender: string;
  submittedAt: string;
  teamDescription?: string;
}

export default function TeamVerificationPage() {
  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();
  const { lang, teamId } = useParams();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { t } = useTranslation();

  const teamIdStr = Array.isArray(teamId) ? teamId[0] : teamId;

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push(`/${lang}/login`);
      return;
    }

    if (!userProfile?.isProfileComplete) {
      router.push(`/${lang}/complete-profile`);
      return;
    }

    if (userProfile.role !== 'verification_volunteer' && userProfile.role !== 'admin') {
      router.push(`/${lang}/player/dashboard`);
      return;
    }

    loadTeamData();
  }, [user, userProfile, authLoading, teamIdStr]);

  const loadTeamData = async () => {
    if (!teamIdStr) return;

    try {
      const teamRef = doc(db, "teams", teamIdStr);
      const teamSnap = await getDoc(teamRef);

      if (!teamSnap.exists()) {
        setError("Team not found");
        return;
      }

      const team = { id: teamSnap.id, ...teamSnap.data() } as TeamData;
      setTeamData(team);
      
      // Initialize player verification status
      const playersWithStatus = team.players.map(player => ({
        ...player,
        verificationStatus: player.verificationStatus || 'pending' as const,
        verificationComments: player.verificationComments || '',
      }));
      
      setPlayers(playersWithStatus);
    } catch (err: any) {
      console.error("Error loading team:", err);
      setError("Failed to load team data");
    } finally {
      setLoading(false);
    }
  };

  const handlePlayerStatusChange = (index: number, status: 'approved' | 'rejected', comments: string) => {
    setPlayers(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        verificationStatus: status,
        verificationComments: comments,
        isVerified: status === 'approved',
      };
      return updated;
    });
  };

  const calculateTeamStatus = () => {
    const approvedCount = players.filter(p => p.verificationStatus === 'approved').length;
    const rejectedCount = players.filter(p => p.verificationStatus === 'rejected').length;
    const pendingCount = players.filter(p => p.verificationStatus === 'pending').length;

    if (rejectedCount > 0) {
      return 'rejected';
    } else if (pendingCount === 0 && approvedCount === players.length) {
      return 'verified';
    } else if (approvedCount > 0) {
      return 'partial_verification';
    } else {
      return 'pending';
    }
  };

  const handleSaveVerification = async () => {
    if (!teamData) return;

    setSaving(true);
    setError("");

    try {
      const newStatus = calculateTeamStatus();
      
      // Update team document
      const teamRef = doc(db, "teams", teamIdStr!);
      await updateDoc(teamRef, {
        players: players,
        status: newStatus,
        verifiedAt: new Date().toISOString(),
        verifiedBy: user?.uid,
        updatedAt: new Date().toISOString(),
      });

      // Redirect back to dashboard
      router.push(`/${lang}/verification/dashboard`);
    } catch (err: any) {
      console.error("Error saving verification:", err);
      setError("Failed to save verification. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#CE4520]" />
      </div>
    );
  }

  if (error || !teamData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-4">{error || "Team not found"}</p>
          <Button 
            onClick={() => router.push(`/${lang}/verification/dashboard`)}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!user || !userProfile) {
    return null;
  }

  const approvedCount = players.filter(p => p.verificationStatus === 'approved').length;
  const rejectedCount = players.filter(p => p.verificationStatus === 'rejected').length;
  const pendingCount = players.filter(p => p.verificationStatus === 'pending').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Container>
        <div className="py-8">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push(`/${lang}/verification/dashboard`)}
              className="flex items-center text-[#CE4520] hover:text-[#1565C0] mb-4 font-fira"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </button>
            
            <div className="text-center">
              <div className="mb-4">
                <Image 
                  src="https://ishalogin.sadhguru.org/app/images/3e8fd38d1d957c44372b.svg" 
                  alt="Isha Logo" 
                  width={80} 
                  height={80} 
                  className="mx-auto"
                />
              </div>
              <h1 className="text-3xl font-semibold font-fira mb-2">
                Team Verification
              </h1>
              <p className="text-gray-600 font-fira">
                Review and verify team registration details
              </p>
            </div>
          </div>

          {/* Team Overview */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div className="flex items-center mb-6">
              <Users className="w-6 h-6 text-[#CE4520] mr-3" />
              <h3 className="text-xl font-semibold font-fira">Team Information</h3>
            </div>
            <hr className="mb-6" />

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold font-fira text-gray-900">Team Name</h4>
                  <p className="text-gray-600 font-fira">{teamData.teamName}</p>
                </div>
                
                <div>
                  <h4 className="font-semibold font-fira text-gray-900">Sport</h4>
                  <p className="text-gray-600 font-fira capitalize">
                    {teamData.sport} ({teamData.gender === 'F' ? 'Women' : teamData.gender === 'M' ? 'Men' : 'Mixed'})
                  </p>
                </div>

                {teamData.teamDescription && (
                  <div>
                    <h4 className="font-semibold font-fira text-gray-900">Description</h4>
                    <p className="text-gray-600 font-fira">{teamData.teamDescription}</p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold font-fira text-gray-900">Captain</h4>
                  <div className="flex items-center text-gray-600">
                    <Phone className="w-4 h-4 mr-2" />
                    <span className="font-fira">{teamData.captainName} • +91 {teamData.captainPhone}</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold font-fira text-gray-900">Location</h4>
                  <div className="flex items-center text-gray-600">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span className="font-fira">{teamData.panchayat}, {teamData.district}, {teamData.state}</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold font-fira text-gray-900">Submitted</h4>
                  <p className="text-gray-600 font-fira">
                    {new Date(teamData.submittedAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Verification Summary */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="font-semibold font-fira text-gray-900 mb-3">Verification Status</h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-green-50 p-3 rounded-lg">
                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="font-semibold font-fira text-green-800">{approvedCount}</p>
                  <p className="text-sm text-green-600 font-fira">Approved</p>
                </div>
                <div className="bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                  <p className="font-semibold font-fira text-red-800">{rejectedCount}</p>
                  <p className="text-sm text-red-600 font-fira">Rejected</p>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <Loader2 className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                  <p className="font-semibold font-fira text-yellow-800">{pendingCount}</p>
                  <p className="text-sm text-yellow-600 font-fira">Pending</p>
                </div>
              </div>
            </div>
          </div>

          {/* Players Verification */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold font-fira">Player Verification</h3>
            
            {players.map((player, index) => (
              <PlayerVerificationForm
                key={index}
                player={player}
                index={index}
                teamPanchayat={teamData.panchayat}
                onStatusChange={handlePlayerStatusChange}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="mt-8 text-center">
            <Button
              onClick={handleSaveVerification}
              disabled={saving}
              size="large"
              className="bg-[#CE4520] hover:bg-[#1565C0] text-white inline-flex items-center"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Save Verification
                </>
              )}
            </Button>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600 text-sm font-fira">{error}</p>
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}