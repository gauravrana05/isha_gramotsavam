"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";

export default function DebugDataPage() {
  const [teams, setTeams] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      // Load all teams
      const teamsSnapshot = await getDocs(collection(db, "teams"));
      const teamsData = teamsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTeams(teamsData);

      // Load all users
      const usersSnapshot = await getDocs(collection(db, "users"));
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersData);

      console.log('Teams:', teamsData);
      console.log('Users:', usersData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  if (!user) {
    return <div>Please log in to view debug data</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Debug Data</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Teams */}
          <div className="bg-white rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Teams ({teams.length})</h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {teams.map(team => (
                <div 
                  key={team.id}
                  className="p-2 border rounded cursor-pointer hover:bg-gray-50"
                  onClick={() => setSelectedTeam(team)}
                >
                  <div className="font-medium">{team.teamName || 'Unnamed Team'}</div>
                  <div className="text-sm text-gray-600">
                    Status: {team.status} | Players: {team.players?.length || 0}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Users */}
          <div className="bg-white rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Users ({users.length})</h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {users.map(user => (
                <div 
                  key={user.id}
                  className="p-2 border rounded cursor-pointer hover:bg-gray-50"
                  onClick={() => setSelectedUser(user)}
                >
                  <div className="font-medium">{user.firstName} {user.lastName}</div>
                  <div className="text-sm text-gray-600">
                    Phone: {user.phoneNumber} | Role: {user.role}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Selected Team Details */}
        {selectedTeam && (
          <div className="mt-8 bg-white rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4">Team: {selectedTeam.teamName}</h3>
            <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
              {JSON.stringify(selectedTeam, null, 2)}
            </pre>
          </div>
        )}

        {/* Selected User Details */}
        {selectedUser && (
          <div className="mt-8 bg-white rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4">User: {selectedUser.firstName} {selectedUser.lastName}</h3>
            <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
              {JSON.stringify(selectedUser, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}