import React from 'react';

interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
}

const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="fixed inset-0 bg-black/50" 
        onClick={() => onOpenChange?.(false)}
      />
      <div className="relative z-50">
        {children}
      </div>
    </div>
  );
};

const DialogContent: React.FC<DialogContentProps> = ({ className = '', children, ...props }) => (
  <div
    className={`bg-white rounded-lg shadow-lg p-6 w-full max-w-md mx-4 ${className}`}
    {...props}
  >
    {children}
  </div>
);

const DialogHeader: React.FC<DialogHeaderProps> = ({ className = '', children, ...props }) => (
  <div className={`mb-4 ${className}`} {...props}>
    {children}
  </div>
);

const DialogTitle: React.FC<DialogTitleProps> = ({ className = '', children, ...props }) => (
  <h2 className={`text-lg font-semibold ${className}`} {...props}>
    {children}
  </h2>
);

const DialogTrigger: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <>{children}</>
);

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger };
