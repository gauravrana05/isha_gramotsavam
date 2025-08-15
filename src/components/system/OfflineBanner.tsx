"use client";

import React, { useEffect, useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { getSyncService } from "@/lib/services/syncService";

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const onStatus = () => setIsOnline(navigator.onLine);
    onStatus();
    window.addEventListener("online", onStatus);
    window.addEventListener("offline", onStatus);
    return () => {
      window.removeEventListener("online", onStatus);
      window.removeEventListener("offline", onStatus);
    };
  }, []);

  const handleSync = async () => {
    try {
      setSyncing(true);
      const svc = await getSyncService();
      await svc.processQueue();
    } finally {
      setSyncing(false);
    }
  };

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[90] px-4 py-2 bg-red-600 text-white rounded-lg shadow-md flex items-center gap-3">
      <WifiOff className="w-4 h-4" />
      <span className="text-sm">You are offline.</span>
      <button
        onClick={handleSync}
        disabled={syncing}
        className="ml-2 inline-flex items-center gap-1 bg-white/10 hover:bg-white/20 rounded px-2 py-1 text-xs disabled:opacity-50"
      >
        <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
        Sync now
      </button>
    </div>
  );
}
