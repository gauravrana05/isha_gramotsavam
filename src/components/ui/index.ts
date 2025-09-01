// UI Components Library
// Organized structure for consistent imports and better maintainability

// ========================================
// CORE UI COMPONENTS
// ========================================

// Form Controls
export { Button } from './Button'
export { Input } from './Input'
export { Label } from './Label'
export { Textarea } from './Textarea'
export { Checkbox } from './Checkbox'

// Layout Components
export { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardFooter 
} from './Card'
export { Container } from './Container'

// Navigation & Interaction
export { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogOverlay,
  DialogPortal,
  DialogClose,
  DialogFooter,
  DialogDescription
} from './AdvancedDialog'

export { 
  Tabs, 
  TabsList, 
  TabsTrigger, 
  TabsContent 
} from './AdvancedTabs'

// Feedback Components
export { Progress } from './Progress'
export { 
  Alert,
  AlertDescription,
  AlertTitle
} from './alert'
export { Badge } from './badge'
export { Avatar, AvatarImage, AvatarFallback } from './avatar'

// Data Display
export { default as AdvancedTable } from './AdvancedTable'
export { default as StatusBadge } from './StatusBadge'

// ========================================
// ADVANCED COMPONENTS
// ========================================

// Selection Components
export { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
  SelectSeparator
} from './AdvancedSelect'

export { MultiSelect } from './MultiSelect'
export { default as StatusSelector } from './StatusSelector'

// Layout & Structure
export { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from './accordion'

// Specialized Components
export { default as Carousel } from './Carousel'
export { default as FilterSidebar } from './FilterSidebar'
export { default as Modal } from './Modal'
export { default as EnhancedModal } from './EnhancedModal'
export { default as EmptyState } from './EmptyState'
export { default as Pagination } from './Pagination'

// Stats & Display Cards
export { SingleStatCard } from './StatsCard'
export { default as StatCard } from './StatCard'
export { default as TestimonialCard } from './TestimonialCard'
export { default as SportCard } from './SportCard'
export { default as StoryCard } from './StoryCard'

// Utility Components
export { SectionDivider } from './SectionDivider'
export { DecorativeElement } from './DecorativeElement'
export { AspectRatio } from './aspect-ratio'

// ========================================
// COMPLEX COMPONENTS
// ========================================

// Tables
export { default as Table } from './Table'
export { default as TableControls } from './TableControls'

// ========================================
// LOADERS & FEEDBACK
// ========================================

export { PageLoader } from './loaders'
export { default as ProgressBar } from './progress/ProgressBar'

// Toast components
export { default as ToastViewport } from './toast/ToastViewport'

// ========================================
// TYPE EXPORTS
// ========================================

export type { ButtonProps } from './Button'