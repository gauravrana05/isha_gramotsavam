"use client";

import React from "react";
import { useOffline } from "@/context/OfflineContextWrapper";

const OfflineIndicator: React.FC = () => {
  const { isOffline } = useOffline();

  return (
    <div
      className={`fixed top-0 left-0 right-0 p-2 text-center text-white ${
        isOffline ? "bg-red-600" : "bg-green-600"
      }`}
      style={{ display: isOffline ? "block" : "none" }}
    >
      {isOffline ? "You are offline" : "You are online"}
    </div>
  );
};

export default OfflineIndicator;