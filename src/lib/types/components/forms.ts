// Form component types
export interface ExportConfig {
  filename: string;
  // No headers property based on error
}

export interface RegistrationButtonProps {
  lang: string;
  sport: string;
  sportId: string;
  size: 'sm' | 'md' | 'lg';
  className: string;
}
