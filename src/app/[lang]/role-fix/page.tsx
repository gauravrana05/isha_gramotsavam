"use client";

import { useState } from "react";
import { functions } from "@/lib/firebase/config";
import { httpsCallable } from "firebase/functions";
import { useAuth } from "@/context/AuthContext";

export default function RoleFixPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<string>("");
  const { user } = useAuth();

  const promoteToTeamCaptain = async () => {
    if (!user) {
      setError("User not authenticated");
      return;
    }

    setLoading(true);
    setError("");
    setResult("");

    try {
      console.log("Calling promoteToTeamCaptain function...");
      const promoteFunction = httpsCallable(functions, 'promoteToTeamCaptain');
      
      const response = await promoteFunction({
        teamId: "ThHBUWhmmbACXCmPozkT",
        eventId: "gramotsavam_2025"
      });

      console.log("Function response:", response);
      setResult(`Success: ${JSON.stringify(response.data, null, 2)}`);
    } catch (err: any) {
      console.error("Error calling function:", err);
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const assignEventRole = async () => {
    if (!user) {
      setError("User not authenticated");
      return;
    }

    setLoading(true);
    setError("");
    setResult("");

    try {
      console.log("Calling assignEventRole function...");
      const assignFunction = httpsCallable(functions, 'assignEventRole');
      
      const response = await assignFunction({
        userId: user.uid,
        role: "captain",
        eventId: "gramotsavam_2025",
        teamId: "ThHBUWhmmbACXCmPozkT",
        assignedBy: user.uid,
        metadata: {
          manualAssignment: true,
          reason: "Role fix for existing team captain"
        }
      });

      console.log("Function response:", response);
      setResult(`Success: ${JSON.stringify(response.data, null, 2)}`);
    } catch (err: any) {
      console.error("Error calling function:", err);
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentRole = async () => {
    if (!user) {
      setError("User not authenticated");
      return;
    }

    setLoading(true);
    setError("");
    setResult("");

    try {
      console.log("Calling getCurrentEventRole function...");
      const getRoleFunction = httpsCallable(functions, 'getCurrentEventRole');
      
      const response = await getRoleFunction({
        userId: user.uid,
        eventId: "gramotsavam_2025"
      });

      console.log("Function response:", response);
      setResult(`Current Role: ${JSON.stringify(response.data, null, 2)}`);
    } catch (err: any) {
      console.error("Error calling function:", err);
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Role Fix Utilities</h1>
        
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Current User</h2>
            <p><strong>User ID:</strong> {user?.uid}</p>
            <p><strong>Email:</strong> {user?.email}</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Cloud Function Actions</h2>
            <div className="space-y-4">
              <button
                onClick={getCurrentRole}
                disabled={loading}
                className="bg-blue-500 text-white px-4 py-2 rounded mr-2 disabled:opacity-50"
              >
                {loading ? "Loading..." : "Get Current Role"}
              </button>

              <button
                onClick={promoteToTeamCaptain}
                disabled={loading}
                className="bg-green-500 text-white px-4 py-2 rounded mr-2 disabled:opacity-50"
              >
                {loading ? "Loading..." : "Promote to Team Captain"}
              </button>

              <button
                onClick={assignEventRole}
                disabled={loading}
                className="bg-orange-500 text-white px-4 py-2 rounded mr-2 disabled:opacity-50"
              >
                {loading ? "Loading..." : "Assign Captain Role"}
              </button>
            </div>
          </div>

          {result && (
            <div className="bg-green-50 p-6 rounded-lg border border-green-200">
              <h3 className="text-lg font-semibold text-green-800 mb-2">Result:</h3>
              <pre className="text-green-700 whitespace-pre-wrap">{result}</pre>
            </div>
          )}

          {error && (
            <div className="bg-red-50 p-6 rounded-lg border border-red-200">
              <h3 className="text-lg font-semibold text-red-800 mb-2">Error:</h3>
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">Instructions:</h3>
            <ol className="text-yellow-700 space-y-1">
              <li>1. First click "Get Current Role" to see your current role</li>
              <li>2. If you're the captain of team ThHBUWhmmbACXCmPozkT, click "Promote to Team Captain"</li>
              <li>3. Alternatively, click "Assign Captain Role" to manually assign the role</li>
              <li>4. Check browser console (F12) for detailed logs</li>
              <li>5. After successful promotion, try the invite page again</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}