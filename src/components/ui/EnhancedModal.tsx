'use client'
import React, { useEffect, ReactNode, useRef } from 'react';
import { X } from 'lucide-react';
import { cn, BaseComponentProps } from '@/lib/component-patterns';

// Enhanced Modal props
export interface EnhancedModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  size?: 'sm' | 'base' | 'lg' | 'xl' | 'full' | 'dynamic';
  mobileFullScreen?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  preventScroll?: boolean;
  footer?: ReactNode;
  headerActions?: ReactNode;
  dynamicHeight?: boolean;
  scrollableBody?: boolean;
  transition?: boolean;
}

// Enhanced Modal size configurations
const sizeClasses = {
  sm: 'max-w-sm',
  base: 'max-w-lg',
  lg: 'max-w-2xl', 
  xl: 'max-w-4xl',
  full: 'max-w-full mx-4',
  dynamic: 'max-w-lg sm:max-w-2xl', // Can grow based on content
};

const mobileClasses = {
  fullScreen: 'h-full sm:h-auto sm:max-h-[90vh] w-full sm:max-w-2xl rounded-none sm:rounded-lg',
  adaptive: 'h-auto max-h-[90vh] max-w-lg sm:max-w-2xl rounded-lg',
};

// Focus trap utility (same as original)
const useFocusTrap = (isOpen: boolean, containerRef: React.RefObject<HTMLElement>) => {
  useEffect(() => {
    if (!isOpen) return;

    const container = containerRef.current;
    if (!container) return;

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement?.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement?.focus();
          e.preventDefault();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);
    firstElement?.focus();

    return () => {
      document.removeEventListener('keydown', handleTabKey);
    };
  }, [isOpen, containerRef]);
};

// Prevent body scroll when modal is open
const useBodyScrollLock = (isLocked: boolean) => {
  useEffect(() => {
    if (!isLocked) return;

    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [isLocked]);
};

// Enhanced Modal backdrop component
const EnhancedModalBackdrop = ({ 
  onClick, 
  children,
  mobileFullScreen = false
}: { 
  onClick?: () => void; 
  children: ReactNode;
  mobileFullScreen?: boolean;
}) => (
  <div
    className={cn(
      'fixed inset-0 z-50 flex items-center justify-center',
      'bg-black bg-opacity-50 backdrop-blur-sm',
      'transition-all duration-300',
      mobileFullScreen ? 'sm:p-4' : 'p-4'
    )}
    onClick={onClick}
  >
    {children}
  </div>
);

// Enhanced Modal content component
interface EnhancedModalContentProps {
  size?: EnhancedModalProps['size'];
  mobileFullScreen?: boolean;
  dynamicHeight?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  children: ReactNode;
  className?: string;
  transition?: boolean;
}

const EnhancedModalContent = React.forwardRef<HTMLDivElement, EnhancedModalContentProps>(
  ({ 
    size = 'base', 
    mobileFullScreen = false,
    dynamicHeight = false,
    onClick, 
    children, 
    className,
    transition = true
  }, ref) => {
    
    const getContentClasses = () => {
      if (mobileFullScreen) {
        return mobileClasses.fullScreen;
      }
      
      if (dynamicHeight) {
        return cn(
          sizeClasses[size],
          'h-auto max-h-[90vh] w-full'
        );
      }
      
      return cn(
        sizeClasses[size],
        'w-full mx-auto my-8 max-h-[90vh]'
      );
    };

    return (
      <div
        ref={ref}
        className={cn(
          'relative bg-white shadow-xl flex flex-col rounded-lg',
          getContentClasses(),
          transition && 'transform transition-all duration-300 ease-in-out',
          transition && 'animate-in fade-in zoom-in-95',
          className
        )}
        onClick={onClick}
      >
        {children}
      </div>
    );
  }
);

EnhancedModalContent.displayName = 'EnhancedModalContent';

// Enhanced Modal header component
const EnhancedModalHeader = ({
  title,
  subtitle,
  onClose,
  showCloseButton,
  headerActions,
}: {
  title?: string;
  subtitle?: string;
  onClose?: () => void;
  showCloseButton?: boolean;
  headerActions?: ReactNode;
}) => {
  if (!title && !subtitle && !showCloseButton && !headerActions) {
    return null;
  }

  return (
    <div className="p-4 sm:p-6 border-b border-gray-200 flex justify-between items-start flex-shrink-0">
      <div className="flex-1 min-w-0 pr-4">
        {title && (
          <h2 className="text-xl font-bold text-[#4A2F1D] truncate">
            {title}
          </h2>
        )}
        {subtitle && (
          <p className="text-gray-600 text-sm mt-1">
            {subtitle}
          </p>
        )}
      </div>
      
      <div className="flex items-center gap-2 flex-shrink-0">
        {headerActions}
        {showCloseButton && (
          <button
            onClick={() => typeof onClose === 'function' && onClose()}
            className="text-gray-500 hover:text-gray-700 transition-colors p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};

// Enhanced Modal body component
const EnhancedModalBody = ({ 
  children,
  scrollable = true,
  className
}: { 
  children: ReactNode;
  scrollable?: boolean;
  className?: string;
}) => (
  <div 
    className={cn(
      scrollable ? 'flex-1 overflow-y-auto' : 'flex-1',
      'p-4 sm:p-6',
      className
    )}
  >
    {children}
  </div>
);

// Enhanced Modal footer component
const EnhancedModalFooter = ({ 
  children,
  className
}: { 
  children?: ReactNode;
  className?: string;
}) => {
  if (!children) return null;
  
  return (
    <div className={cn(
      'p-4 sm:p-6 bg-white border-t border-gray-200 flex-shrink-0',
      'flex flex-col sm:flex-row gap-3 sm:gap-4 sm:justify-end',
      className
    )}>
      {children}
    </div>
  );
};

// Main Enhanced Modal component
export const EnhancedModal: React.FC<EnhancedModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  size = 'base',
  mobileFullScreen = false,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  preventScroll = true,
  footer,
  headerActions,
  dynamicHeight = false,
  scrollableBody = true,
  transition = true,
  children,
  className,
  ...props
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && typeof onClose === 'function') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  // Use custom hooks
  useFocusTrap(isOpen, modalRef as React.RefObject<HTMLElement>);
  useBodyScrollLock(isOpen && preventScroll);

  // Don't render if not open
  if (!isOpen) return null;

  const handleBackdropClick = () => {
    if (closeOnOverlayClick && typeof onClose === 'function') {
      onClose();
    }
  };

  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <EnhancedModalBackdrop 
      onClick={handleBackdropClick}
      mobileFullScreen={mobileFullScreen}
    >
      <EnhancedModalContent
        ref={modalRef}
        size={size}
        mobileFullScreen={mobileFullScreen}
        dynamicHeight={dynamicHeight}
        onClick={handleContentClick}
        className={className}
        transition={transition}
        {...props}
      >
        <EnhancedModalHeader
          title={title}
          subtitle={subtitle}
          onClose={onClose}
          showCloseButton={showCloseButton}
          headerActions={headerActions}
        />
        
        <EnhancedModalBody 
          scrollable={scrollableBody}
        >
          {children}
        </EnhancedModalBody>
        
        <EnhancedModalFooter>
          {footer}
        </EnhancedModalFooter>
      </EnhancedModalContent>
    </EnhancedModalBackdrop>
  );
};

// Export compound components
type EnhancedModalCompoundComponent = React.FC<EnhancedModalProps> & {
  Header: typeof EnhancedModalHeader;
  Body: typeof EnhancedModalBody;
  Footer: typeof EnhancedModalFooter;
};

const EnhancedModalWithCompounds = EnhancedModal as EnhancedModalCompoundComponent;
EnhancedModalWithCompounds.Header = EnhancedModalHeader;
EnhancedModalWithCompounds.Body = EnhancedModalBody;
EnhancedModalWithCompounds.Footer = EnhancedModalFooter;

export default EnhancedModalWithCompounds;