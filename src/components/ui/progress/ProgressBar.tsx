"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useLoadingContext } from "@/context/LoadingContext";

export default function ProgressBar() {
  const pathname = usePathname();
  const { isAnyLoading } = useLoadingContext();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // When route changes, show bar briefly
    setVisible(true);
    setProgress(15);
    const t1 = setTimeout(() => setProgress(40), 150);
    const t2 = setTimeout(() => setProgress(65), 400);
    const t3 = setTimeout(() => setProgress(85), 900);
    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
    };
  }, [pathname]);

  useEffect(() => {
    // Tie into global loading; when anything loads, keep bar visible
    if (isAnyLoading()) {
      setVisible(true);
      if (progress < 70) setProgress(70);
    } else {
      // Finish
      setProgress(100);
      const timeout = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 250);
      return () => clearTimeout(timeout);
    }
  }, [isAnyLoading, progress]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[120] h-0.5">
      <div
        className="h-full bg-primary-600 transition-all duration-150"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
