"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useTranslation } from "@/lib/utils/i18n";
import Image from "next/image";
import { Users, Plus, Trash2, Upload, Check, Loader2, AlertCircle } from "lucide-react";

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
  joinedAt: string;
  role: string;
}

interface TeamData {
  teamName: string;
  sport: string;
  captainId: string;
  panchayat: string;
  district: string;
  state: string;
  players: Player[];
  maxPlayers: number;
  minPlayers: number;
  status: string;
}

export default function PlayersInvitePage() {
  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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

    if (userProfile.role !== 'captain' && userProfile.role !== 'admin') {
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

      const team = teamSnap.data() as TeamData;
      
      // Check if user is captain of this team
      if (team.captainId !== user?.uid && userProfile?.role !== 'admin') {
        setError("You are not authorized to manage this team");
        return;
      }

      setTeamData(team);
      
      // Initialize players array with captain and empty slots
      const existingPlayers = team.players || [];
      const emptySlots = Array(team.maxPlayers - existingPlayers.length).fill(null).map(() => ({
        name: "",
        mobile: "",
        gender: team.sport === 'throwball' ? 'F' : '',
        age: "",
        panchayat: team.panchayat,
        district: team.district,
        state: team.state,
        isProfileComplete: false,
        isVerified: false,
        joinedAt: "",
        role: "player"
      }));

      setPlayers([...existingPlayers, ...emptySlots]);
    } catch (err: any) {
      console.error("Error loading team:", err);
      setError("Failed to load team data");
    } finally {
      setLoading(false);
    }
  };

  const handlePlayerChange = (index: number, field: keyof Player, value: string) => {
    setPlayers(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    setError("");
  };

  const validatePlayers = () => {
    const filledPlayers = players.filter(p => p.name.trim());
    
    if (filledPlayers.length < (teamData?.minPlayers || 6)) {
      return `Minimum ${teamData?.minPlayers} players required`;
    }

    for (let i = 0; i < filledPlayers.length; i++) {
      const player = filledPlayers[i];
      if (!player.name.trim()) return `Player ${i + 1}: Name is required`;
      if (!player.mobile.trim()) return `Player ${i + 1}: Mobile number is required`;
      if (player.mobile.length !== 10) return `Player ${i + 1}: Mobile number must be 10 digits`;
      if (!player.gender) return `Player ${i + 1}: Gender is required`;
      if (!player.age) return `Player ${i + 1}: Age is required`;
      
      const age = parseInt(player.age);
      if (age < 14 || age > 60) return `Player ${i + 1}: Age must be between 14 and 60`;

      // Check same panchayat
      if (player.panchayat !== teamData?.panchayat) {
        return `Player ${i + 1}: Must be from same panchayat (${teamData?.panchayat})`;
      }

      // Check gender for throwball
      if (teamData?.sport === 'throwball' && player.gender !== 'F') {
        return `Player ${i + 1}: Throwball is only for women`;
      }
    }

    // Check for duplicate mobile numbers
    const mobiles = filledPlayers.map(p => p.mobile);
    const duplicates = mobiles.filter((mobile, index) => mobiles.indexOf(mobile) !== index);
    if (duplicates.length > 0) {
      return "Duplicate mobile numbers found";
    }

    return null;
  };

  const handleSubmit = async () => {
    if (!teamData || !user) return;

    const validationError = validatePlayers();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      // Filter out empty players
      const filledPlayers = players.filter(p => p.name.trim()).map(player => ({
        ...player,
        joinedAt: player.joinedAt || new Date().toISOString(),
        isProfileComplete: false, // Will be updated when they complete profile
        isVerified: false, // Will be updated during verification
      }));

      // Update team document
      const teamRef = doc(db, "teams", teamIdStr);
      await updateDoc(teamRef, {
        players: filledPlayers,
        status: "submitted",
        updatedAt: new Date().toISOString(),
      });

      // Redirect to captain dashboard
      router.push(`/${lang}/captain/dashboard`);
    } catch (err: any) {
      console.error("Error submitting team:", err);
      setError("Failed to submit team for verification. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#CE4520]" />
      </div>
    );
  }

  if (error && !teamData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => router.push(`/${lang}/captain/dashboard`)}
            className="bg-[#CE4520] text-white px-6 py-2 rounded-lg hover:bg-[#1565C0] transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!user || !userProfile || !teamData) {
    return null;
  }

  const filledPlayersCount = players.filter(p => p.name.trim()).length;
  const isMinimumMet = filledPlayersCount >= teamData.minPlayers;

  return (
    <div className="min-h-screen bg-isha">
      <div className="max-w-6xl mx-auto p-4 py-8">
        <div className="text-center mb-8">
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
            Add Team Members
          </h1>
          <p className="text-gray-600 font-fira mb-2">
            Team: {teamData.teamName} ({teamData.sport})
          </p>
          <p className="text-gray-600 font-fira">Step 2 of 2: Team Members</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Users className="w-6 h-6 text-[#CE4520] mr-3" />
              <h3 className="text-xl font-semibold font-fira">Team Members</h3>
            </div>
            <div className="text-sm text-gray-600 font-fira">
              {filledPlayersCount}/{teamData.maxPlayers} players 
              (Min: {teamData.minPlayers})
            </div>
          </div>
          <hr className="mb-6" />

          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-600 text-sm font-fira">
              <strong>Important Requirements:</strong>
            </p>
            <ul className="text-blue-600 text-sm font-fira mt-2 space-y-1">
              <li>• All players must be from the same panchayat: <strong>{teamData.panchayat}</strong></li>
              <li>• Age limit: 14-60 years</li>
              {teamData.sport === 'throwball' && <li>• Throwball is only for women</li>}
              <li>• Minimum {teamData.minPlayers} players required</li>
            </ul>
          </div>

          <div className="space-y-4">
            {players.map((player, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold font-fira">
                    {index === 0 ? 'Captain' : `Player ${index + 1}`}
                  </h4>
                  {player.role === 'captain' && (
                    <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-fira">
                      Captain
                    </span>
                  )}
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 font-fira">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CE4520] focus:border-[#CE4520] font-fira ${
                        player.role === 'captain' ? 'bg-gray-50' : ''
                      }`}
                      placeholder="Enter player name"
                      value={player.name}
                      onChange={(e) => handlePlayerChange(index, 'name', e.target.value)}
                      readOnly={player.role === 'captain'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 font-fira">
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <div className="flex">
                      <div className="flex items-center bg-gray-50 border border-gray-300 border-r-0 rounded-l-lg px-3">
                        <span className="text-sm font-fira">+91</span>
                      </div>
                      <input
                        type="tel"
                        className={`w-full px-3 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-[#CE4520] focus:border-[#CE4520] font-fira ${
                          player.role === 'captain' ? 'bg-gray-50' : ''
                        }`}
                        placeholder="10-digit mobile"
                        value={player.mobile}
                        onChange={(e) => handlePlayerChange(index, 'mobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
                        readOnly={player.role === 'captain'}
                        maxLength={10}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 font-fira">
                      Gender <span className="text-red-500">*</span>
                    </label>
                    <select
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CE4520] focus:border-[#CE4520] font-fira ${
                        player.role === 'captain' ? 'bg-gray-50' : ''
                      }`}
                      value={player.gender}
                      onChange={(e) => handlePlayerChange(index, 'gender', e.target.value)}
                      disabled={player.role === 'captain' || teamData.sport === 'throwball'}
                    >
                      <option value="">Select Gender</option>
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 font-fira">
                      Age <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="14"
                      max="60"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CE4520] focus:border-[#CE4520] font-fira"
                      placeholder="Age"
                      value={player.age}
                      onChange={(e) => handlePlayerChange(index, 'age', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 font-fira">
                      Panchayat <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-fira"
                      value={player.panchayat}
                      readOnly
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 font-fira">
                      District
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-fira"
                      value={player.district}
                      readOnly
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold font-fira">Team Status</p>
                <p className="text-sm text-gray-600 font-fira">
                  {isMinimumMet ? 
                    `✅ Ready to submit (${filledPlayersCount} players)` : 
                    `❌ Need ${teamData.minPlayers - filledPlayersCount} more players`
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600 text-sm font-fira">{error}</p>
          </div>
        )}

        <div className="text-center mb-8">
          <button
            onClick={handleSubmit}
            disabled={submitting || !isMinimumMet}
            className="bg-[#CE4520] hover:bg-[#1565C0] text-white px-8 py-3 rounded-lg font-fira text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Submitting...
              </>
            ) : (
              <>
                <Check className="w-5 h-5 mr-2" />
                Submit for Verification
              </>
            )}
          </button>
        </div>

        <div className="text-center mb-6">
          <p className="text-sm font-fira text-gray-600">
            After submission, your team will be reviewed by verification volunteers.
            You&apos;ll be notified once approved.
          </p>
        </div>
      </div>
    </div>
  );
}