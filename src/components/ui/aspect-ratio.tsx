'use client';

import * as React from 'react';

interface AspectRatioProps {
  ratio?: number;
  children: React.ReactNode;
  className?: string;
}

const AspectRatio = React.forwardRef<HTMLDivElement, AspectRatioProps>(
  ({ ratio = 1, children, className = '', ...props }, ref) => (
    <div
      ref={ref}
      className={`relative w-full ${className}`}
      style={{ paddingBottom: `${100 / ratio}%` }}
      {...props}
    >
      <div className="absolute inset-0">{children}</div>
    </div>
  )
);

AspectRatio.displayName = 'AspectRatio';

export { AspectRatio };
