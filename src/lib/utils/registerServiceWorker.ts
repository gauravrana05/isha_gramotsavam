"use client";

import { useEffect, useRef } from "react";
import { useNotification } from "@/context/NotificationContext";

export const useServiceWorker = () => {
  const hasReloaded = useRef(false);
  const { addNotification } = useNotification();

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          const onUpdateFound = () => {
            const sw = registration.installing;
            if (!sw) return;
            sw.addEventListener("statechange", () => {
              if (sw.state === "installed") {
                if (navigator.serviceWorker.controller) {
                  // New version available
                  addNotification("A new version is available. Updating...", "info");
                  registration.waiting?.postMessage({ type: "SKIP_WAITING" });
                } else {
                  // First install
                  addNotification("App is ready for offline use.", "success");
                }
              }
            });
          };

          registration.addEventListener("updatefound", onUpdateFound);

          // If already waiting (page was kept open), trigger activation
          if (registration.waiting) {
            registration.waiting.postMessage({ type: "SKIP_WAITING" });
          }

          // Reload once controller changes to the new SW
          navigator.serviceWorker.addEventListener("controllerchange", () => {
            if (hasReloaded.current) return;
            hasReloaded.current = true;
            window.location.reload();
          });
        })
        .catch((error) => {
          // Error handling removed
        });
    };

    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, [addNotification]);
};