// Modal component types
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full' | 'dynamic';
  children: React.ReactNode;
}

export interface PageLoaderProps {
  message?: string;
}
