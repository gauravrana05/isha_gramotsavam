"use client";

import React from "react";
import { useNotification } from "@/context/NotificationContext";
import { CheckCircle2, Info, XCircle, X } from "lucide-react";

const toastColors: Record<string, string> = {
  success: "bg-green-600",
  error: "bg-red-600",
  info: "bg-blue-600",
};

export default function ToastViewport() {
  const { notifications, removeNotification } = useNotification();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] space-y-2 max-w-sm w-[90vw] sm:w-96">
      {notifications.map((t) => (
        <div
          key={t.id}
          className={`text-white rounded-lg shadow-lg overflow-hidden flex items-start ${toastColors[t.type] || toastColors.info}`}
          role="status"
          aria-live="polite"
        >
          <div className="p-3">
            {t.type === "success" && <CheckCircle2 className="w-5 h-5" />}
            {t.type === "error" && <XCircle className="w-5 h-5" />}
            {t.type === "info" && <Info className="w-5 h-5" />}
          </div>
          <div className="p-3 flex-1 text-sm">{t.message}</div>
          <button
            onClick={() => removeNotification(t.id)}
            className="p-3 hover:bg-black/10 transition-colors"
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
