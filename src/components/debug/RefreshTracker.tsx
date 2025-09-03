'use client';

import { useEffect, useRef } from 'react';

export default function RefreshTracker({ page }: { page: string }) {
  const renderCount = useRef(0);
  const mountTime = useRef(Date.now());

  useEffect(() => {
    renderCount.current += 1;
    console.log(`🔄 ${page} - Render #${renderCount.current} at ${new Date().toISOString()}`);
    
    if (renderCount.current > 3) {
      console.warn(`⚠️ ${page} - Multiple refreshes detected! Count: ${renderCount.current}`);
    }
  });

  useEffect(() => {
    console.log(`🚀 ${page} - Component mounted at ${new Date(mountTime.current).toISOString()}`);
    
    return () => {
      console.log(`💀 ${page} - Component unmounted after ${Date.now() - mountTime.current}ms`);
    };
  }, [page]);

  if (process.env.NODE_ENV === 'development') {
    return (
      <div className="fixed top-0 right-0 bg-red-500 text-white text-xs p-1 z-50">
        {page}: {renderCount.current}
      </div>
    );
  }

  return null;
}
