'use client'
import React, { useEffect, ReactNode, useRef } from 'react';
import { X } from 'lucide-react';
import { cn, BaseComponentProps, compositions } from '@/lib/component-patterns';

// Modal props
export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: 'sm' | 'base' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  preventScroll?: boolean;
  footer?: ReactNode;
  headerActions?: ReactNode;
}

// Modal size configurations
const sizeClasses = {
  sm: 'max-w-sm',
  base: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-full mx-4',
};

// Focus trap utility
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
    
    // Focus first element when modal opens
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

// Modal backdrop component
const ModalBackdrop = ({ 
  onClick, 
  children 
}: { 
  onClick?: () => void; 
  children: ReactNode;
}) => (
  <div
    className={cn(
      'fixed inset-0 z-50 flex items-center justify-center',
      'bg-black bg-opacity-50 backdrop-blur-sm',
      'p-4 overflow-y-auto'
    )}
    onClick={onClick}
  >
    {children}
  </div>
);

// Modal content component
interface ModalContentProps {
  size?: ModalProps['size'];
  onClick?: (e: React.MouseEvent) => void;
  children: ReactNode;
  className?: string;
}

const ModalContent = React.forwardRef<HTMLDivElement, ModalContentProps>(
  ({ size = 'base', onClick, children, className }, ref) => (
    <div
      ref={ref}
      className={cn(
        'relative bg-white rounded-lg shadow-xl',
        'w-full mx-auto my-8',
        'transform transition-all duration-200',
        'animate-in fade-in zoom-in-95',
        sizeClasses[size],
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
);

ModalContent.displayName = 'ModalContent';

// Modal header component
const ModalHeader = ({
  title,
  description,
  onClose,
  showCloseButton,
  headerActions,
}: {
  title?: string;
  description?: string;
  onClose?: () => void;
  showCloseButton?: boolean;
  headerActions?: ReactNode;
}) => {
  if (!title && !description && !showCloseButton && !headerActions) {
    return null;
  }

  return (
    <div className={compositions.modal.header}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900 font-fira">
              {title}
            </h3>
          )}
          {description && (
            <p className="mt-1 text-sm text-gray-600 font-roboto">
              {description}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-2 ml-4">
          {headerActions}
          {showCloseButton && (
            <button
              onClick={onClose}
              className={cn(
                'p-1 rounded-md text-gray-400 hover:text-gray-600',
                'hover:bg-gray-100 transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-primary-500'
              )}
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Modal body component
const ModalBody = ({ children }: { children: ReactNode }) => (
  <div className={compositions.modal.body}>
    {children}
  </div>
);

// Modal footer component
const ModalFooter = ({ children }: { children?: ReactNode }) => {
  if (!children) return null;
  
  return (
    <div className={compositions.modal.footer}>
      {children}
    </div>
  );
};

// Main Modal component
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  size = 'base',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  preventScroll = true,
  footer,
  headerActions,
  children,
  className,
  ...props
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  // Use custom hooks
  useFocusTrap(isOpen, modalRef);
  useBodyScrollLock(isOpen && preventScroll);

  // Don't render if not open
  if (!isOpen) return null;

  const handleBackdropClick = () => {
    if (closeOnOverlayClick) {
      onClose();
    }
  };

  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <ModalBackdrop onClick={handleBackdropClick}>
      <ModalContent
        ref={modalRef}
        size={size}
        onClick={handleContentClick}
        className={className}
        {...props}
      >
        <ModalHeader
          title={title}
          description={description}
          onClose={onClose}
          showCloseButton={showCloseButton}
          headerActions={headerActions}
        />
        
        <ModalBody>
          {children}
        </ModalBody>
        
        <ModalFooter>
          {footer}
        </ModalFooter>
      </ModalContent>
    </ModalBackdrop>
  );
};

// Confirmation modal component (common use case)
export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'primary' | 'danger';
  loading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'primary',
  loading = false,
}) => {
  const confirmButtonClasses = cn(
    'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    confirmVariant === 'danger'
      ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
      : 'bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500'
  );

  const footer = (
    <div className="flex gap-3">
      <button
        onClick={onClose}
        disabled={loading}
        className={cn(
          'px-4 py-2 text-sm font-medium text-gray-700',
          'bg-white border border-gray-300 rounded-lg',
          'hover:bg-gray-50 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        {cancelLabel}
      </button>
      <button
        onClick={onConfirm}
        disabled={loading}
        className={confirmButtonClasses}
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Processing...
          </div>
        ) : (
          confirmLabel
        )}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={footer}
    />
  );
};

// Export compound components
Modal.Header = ModalHeader;
Modal.Body = ModalBody;
Modal.Footer = ModalFooter;

export default Modal;