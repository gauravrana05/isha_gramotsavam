// Modal component types
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full' | 'dynamic';
  children: React.ReactNode;
}

export interface SingleStatCardProps {
  stat: {
    label: string;
    value: string | number;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    trend?: string;
    description?: string;
  };
}

export interface PageLoaderProps {
  // No message prop based on error
}
