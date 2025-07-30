"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase/config";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";

export default function TeamsDebugPage() {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [specificTeam, setSpecificTeam] = useState<any>(null);
  const { user, userProfile } = useAuth();

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load all teams
        const teamsCollection = collection(db, "teams");
        const teamsSnapshot = await getDocs(teamsCollection);
        const teamsData = teamsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setTeams(teamsData);
        console.log("All teams:", teamsData);

        // Load specific team
        const specificTeamId = "ThHBUWhmmbACXCmPozkT";
        const teamRef = doc(db, "teams", specificTeamId);
        const teamSnap = await getDoc(teamRef);
        if (teamSnap.exists()) {
          const teamData = { id: teamSnap.id, ...teamSnap.data() };
          setSpecificTeam(teamData);
          console.log("Specific team:", teamData);
        } else {
          console.log("Specific team not found");
        }

      } catch (error) {
        console.error("Error loading teams:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Teams Debug Information</h1>
        
        <div className="grid gap-6">
          {/* Current User Info */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Current User</h2>
            <div className="space-y-2">
              <p><strong>User ID:</strong> {user?.uid}</p>
              <p><strong>Role:</strong> {userProfile?.role}</p>
              <p><strong>Name:</strong> {userProfile?.name || 'No name'}</p>
              <p><strong>Profile Complete:</strong> {userProfile?.isProfileComplete ? 'Yes' : 'No'}</p>
            </div>
          </div>

          {/* Specific Team Info */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Target Team (ThHBUWhmmbACXCmPozkT)</h2>
            {specificTeam ? (
              <div className="space-y-2">
                <p><strong>Team Name:</strong> {specificTeam.teamName}</p>
                <p><strong>Captain ID:</strong> {specificTeam.captainId}</p>
                <p><strong>Sport:</strong> {specificTeam.sport}</p>
                <p><strong>Status:</strong> {specificTeam.status}</p>
                <p><strong>Is Current User Captain:</strong> {specificTeam.captainId === user?.uid ? 'Yes' : 'No'}</p>
                <p><strong>Players Count:</strong> {specificTeam.players?.length || 0}</p>
              </div>
            ) : (
              <p className="text-red-600">Team not found!</p>
            )}
          </div>

          {/* All Teams */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">All Teams ({teams.length})</h2>
            <div className="space-y-4">
              {teams.map((team, index) => (
                <div key={team.id} className="border p-4 rounded">
                  <p><strong>#{index + 1} ID:</strong> {team.id}</p>
                  <p><strong>Name:</strong> {team.teamName}</p>
                  <p><strong>Captain ID:</strong> {team.captainId}</p>
                  <p><strong>Is Your Team:</strong> {team.captainId === user?.uid ? '✅ Yes' : '❌ No'}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Role Change Instructions */}
          <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
            <h2 className="text-xl font-semibold mb-4 text-yellow-800">Role Issue</h2>
            <p className="text-yellow-700 mb-4">
              Your account has role <strong>"{userProfile?.role}"</strong> but needs <strong>"captain"</strong> or <strong>"admin"</strong> to access the invite page.
            </p>
            <p className="text-yellow-700">
              To fix this, you need to either:
              <br />1. Change your role in the database to "captain" 
              <br />2. Or create a team where your user ID ({user?.uid}) is the captainId
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}