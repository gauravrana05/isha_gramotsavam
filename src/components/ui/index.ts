
// Mobile-first UI Components
// All components are designed to work seamlessly from mobile (320px) to desktop (1440px+)

// Enhanced core components
export { 
  Button,
  PrimaryButton,
  SecondaryButton,
  OutlineButton,
  GhostButton,
  DangerButton,
  SuccessButton,
  IconButton,
  default as ButtonComponent
} from './Button';

export { 
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  AdminCard,
  SimpleStatsCard,
  default as CardComponent
} from './Card';

// New mobile-first components
export { 
  DataTable,
  default as DataTableComponent
} from './DataTable';

export { 
  StatsCard,
  SingleStatCard,
  default as StatsCardComponent
} from './StatsCard';

export { 
  StatusBadge,
  ActiveBadge,
  InactiveBadge,
  PendingBadge,
  SuccessBadge,
  ErrorBadge,
  WarningBadge,
  LoadingBadge,
  getStatusBadge,
  getVenueStatus,
  getEventStatus,
  default as StatusBadgeComponent
} from './StatusBadge';

export { 
  Modal,
  ConfirmationModal,
  default as ModalComponent
} from './Modal';

export { 
  EmptyState,
  PresetEmptyState,
  NoVenuesState,
  NoEventsState,
  NoTeamsState,
  NoMatchesState,
  NoResultsState,
  ErrorState,
  AdminEmptyState,
  LoadingEmptyState,
  default as EmptyStateComponent
} from './EmptyState';

// Existing components (to be enhanced later if needed)
export { default as Container } from './Container';
export { default as DecorativeElement } from './DecorativeElement';
export { default as Carousel } from './Carousel';
export { default as SectionDivider } from './SectionDivider';
export { default as StatCard } from './StatCard';
export { default as SportCard } from './SportCard';
export { default as StoryCard } from './StoryCard';
export { default as TestimonialCard } from './TestimonialCard';

// Loader components
export * from './loaders';