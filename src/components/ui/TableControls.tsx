import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Filter, 
  X, 
  Download, 
  RefreshCw, 
  Settings,
  ChevronDown,
  MoreHorizontal,
  CheckCircle2
} from 'lucide-react';
import { cn, BaseComponentProps } from '@/lib/component-patterns';
import type { ActiveFilter } from './FilterSidebar';

// Export configuration
export interface ExportConfig {
  label: string;
  format: 'csv' | 'xlsx' | 'pdf' | 'json';
  filename?: string;
  onExport: () => void;
  loading?: boolean;
}

// Bulk action configuration
export interface BulkAction {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: (selectedItems: any[]) => void;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  loading?: boolean;
  disabled?: boolean;
}

// View configuration
export interface ViewConfig {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
}

// Table controls props
export interface TableControlsProps extends BaseComponentProps {
  // Search functionality
  searchable?: boolean;
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  
  // Filter functionality
  filterable?: boolean;
  showFilterButton?: boolean;
  onFilterToggle?: () => void;
  isFilterOpen?: boolean;
  
  // Active filters display
  activeFilters?: ActiveFilter[];
  onFilterRemove?: (key: string) => void;
  onFiltersClear?: () => void;
  
  // Export functionality
  exportOptions?: ExportConfig[];
  
  // Bulk actions
  bulkActions?: BulkAction[];
  selectedCount?: number;
  totalCount?: number;
  
  // View options
  views?: ViewConfig[];
  currentView?: string;
  onViewChange?: (view: string) => void;
  
  // Refresh functionality
  onRefresh?: () => void;
  refreshLoading?: boolean;
  
  // Header actions (buttons to show in the same row as search/filter)
  headerActions?: React.ReactNode;
  
  // Results info
  showResultsInfo?: boolean;
  currentPage?: number;
  pageSize?: number;
  totalResults?: number;
  
  // Additional actions
  additionalActions?: React.ReactNode;
  
  // Layout
  compact?: boolean;
  position?: 'top' | 'bottom';
}

// Search input component
const SearchInput = ({
  value,
  onChange,
  placeholder = "Search...",
  className
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) => {
  const [internalValue, setInternalValue] = useState(value);
  
  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(internalValue);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [internalValue, onChange]);
  
  // Update internal value when prop changes
  useEffect(() => {
    setInternalValue(value);
  }, [value]);
  
  return (
    <div className={cn("relative flex-1 max-w-sm", className)}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
      <input
        type="text"
        placeholder={placeholder}
        value={internalValue}
        onChange={(e) => setInternalValue(e.target.value)}
        className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
      />
      {internalValue && (
        <button
          onClick={() => {
            setInternalValue('');
            onChange('');
          }}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

// Filter chip component
const FilterChip = ({
  filter,
  onRemove
}: {
  filter: ActiveFilter;
  onRemove: (key: string) => void;
}) => (
  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
    <span className="mr-1">{filter.label}:</span>
    <span className="font-normal">{filter.displayValue || filter.value}</span>
    <button
      onClick={() => onRemove(filter.key)}
      className="ml-2 hover:text-primary-900 focus:outline-none"
    >
      <X className="w-3 h-3" />
    </button>
  </span>
);

// Export dropdown component
const ExportDropdown = ({
  options,
  disabled = false
}: {
  options: ExportConfig[];
  disabled?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  if (options.length === 0) return null;
  
  if (options.length === 1) {
    const option = options[0];
    return (
      <button
        onClick={option.onExport}
        disabled={disabled || option.loading}
        className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Download className="w-4 h-4 mr-2" />
        {option.loading ? 'Exporting...' : option.label}
      </button>
    );
  }
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Download className="w-4 h-4 mr-2" />
        Export
        <ChevronDown className="w-4 h-4 ml-2" />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
          <div className="py-1">
            {options.map((option) => (
              <button
                key={option.format}
                onClick={() => {
                  option.onExport();
                  setIsOpen(false);
                }}
                disabled={option.loading}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
              >
                <span>{option.label}</span>
                {option.loading && <RefreshCw className="w-4 h-4 animate-spin" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Bulk actions dropdown component
const BulkActionsDropdown = ({
  actions,
  selectedItems,
  selectedCount
}: {
  actions: BulkAction[];
  selectedItems: any[];
  selectedCount: number;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  if (actions.length === 0 || selectedCount === 0) return null;
  
  if (actions.length === 1) {
    const action = actions[0];
    return (
      <button
        onClick={() => action.onClick(selectedItems)}
        disabled={action.disabled || action.loading}
        className={cn(
          "inline-flex items-center px-3 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
          action.variant === 'danger' && "text-white bg-red-600 hover:bg-red-700 focus:ring-red-500",
          action.variant === 'success' && "text-white bg-green-600 hover:bg-green-700 focus:ring-green-500",
          action.variant === 'warning' && "text-white bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500",
          (!action.variant || action.variant === 'primary') && "text-white bg-primary-600 hover:bg-primary-700 focus:ring-primary-500",
          action.variant === 'secondary' && "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:ring-primary-500"
        )}
      >
        <action.icon className="w-4 h-4 mr-2" />
        {action.loading ? 'Processing...' : action.label} ({selectedCount})
      </button>
    );
  }
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
      >
        <CheckCircle2 className="w-4 h-4 mr-2" />
        Bulk Actions ({selectedCount})
        <ChevronDown className="w-4 h-4 ml-2" />
      </button>
      
      {isOpen && (
        <div className="absolute left-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
          <div className="py-1">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={() => {
                  action.onClick(selectedItems);
                  setIsOpen(false);
                }}
                disabled={action.disabled || action.loading}
                className={cn(
                  "w-full text-left px-4 py-2 text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center",
                  action.variant === 'danger' && "text-red-600 hover:text-red-700",
                  action.variant === 'success' && "text-green-600 hover:text-green-700",
                  action.variant === 'warning' && "text-yellow-600 hover:text-yellow-700",
                  (!action.variant || action.variant === 'primary' || action.variant === 'secondary') && "text-gray-700"
                )}
              >
                <action.icon className="w-4 h-4 mr-2" />
                {action.loading ? 'Processing...' : action.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Results info component
const ResultsInfo = ({
  currentPage,
  pageSize,
  totalResults,
  selectedCount
}: {
  currentPage: number;
  pageSize: number;
  totalResults: number;
  selectedCount: number;
}) => {
  const startResult = (currentPage - 1) * pageSize + 1;
  const endResult = Math.min(currentPage * pageSize, totalResults);
  
  return (
    <div className="text-sm text-gray-500 flex items-center space-x-4">
      <span>
        Showing {startResult}-{endResult} of {totalResults} results
      </span>
      {selectedCount > 0 && (
        <span className="text-primary-600 font-medium">
          {selectedCount} selected
        </span>
      )}
    </div>
  );
};

// Main TableControls component
export const TableControls: React.FC<TableControlsProps> = ({
  // Search props
  searchable = false,
  searchValue = '',
  searchPlaceholder,
  onSearchChange,
  
  // Filter props
  filterable = false,
  showFilterButton = false,
  onFilterToggle,
  isFilterOpen = false,
  
  // Active filters
  activeFilters = [],
  onFilterRemove,
  onFiltersClear,
  
  // Export props
  exportOptions = [],
  
  // Bulk actions
  bulkActions = [],
  selectedCount = 0,
  totalCount = 0,
  
  // View props
  views = [],
  currentView,
  onViewChange,
  
  // Refresh props
  onRefresh,
  refreshLoading = false,
  
  // Header actions
  headerActions,
  
  // Results info
  showResultsInfo = false,
  currentPage = 1,
  pageSize = 25,
  totalResults = 0,
  
  // Additional props
  additionalActions,
  compact = false,
  position = 'top',
  className,
  ...props
}) => {
  const hasActiveFilters = activeFilters.length > 0;
  const hasSelection = selectedCount > 0;
  
  return (
    <div 
      className={cn(
        'border-b border-gray-200',
        compact ? 'py-3 px-0' : 'py-4 px-0',
        className
      )}
      {...props}
    >
      {/* Main controls row - Mobile friendly with all items in one row */}
      <div className="flex items-center justify-between gap-2 sm:gap-4 px-2 sm:px-0">
        {/* Left side - Search and filters */}
        <div className="flex items-center gap-2 flex-1">
          {/* Search input */}
          {searchable && onSearchChange && (
            <SearchInput
              value={searchValue}
              onChange={onSearchChange}
              placeholder={searchPlaceholder}
              className="flex-1 min-w-0"
            />
          )}
          
          {/* Filter button */}
          {filterable && showFilterButton && onFilterToggle && (
            <button
              onClick={onFilterToggle}
              className={cn(
                "inline-flex items-center px-2 sm:px-3 py-2 border rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent whitespace-nowrap",
                isFilterOpen || hasActiveFilters
                  ? "border-primary-300 text-primary-700 bg-primary-50"
                  : "border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
              )}
            >
              <Filter className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Filters</span>
              {hasActiveFilters && (
                <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 text-xs rounded-full bg-primary-200 text-primary-800">
                  {activeFilters.length}
                </span>
              )}
            </button>
          )}
        </div>
        
        {/* Header actions (like Create Team button) */}
        {headerActions && (
          <div className="flex items-center gap-2">
            {headerActions}
          </div>
        )}
        
        {/* Right side - Actions */}
        <div className="flex items-center gap-3">
          {/* View selector */}
          {views.length > 0 && currentView && onViewChange && (
            <div className="flex border border-gray-300 rounded-md">
              {views.map((view) => (
                <button
                  key={view.value}
                  onClick={() => onViewChange(view.value)}
                  className={cn(
                    "px-3 py-2 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary-500",
                    view.value === currentView
                      ? "bg-primary-100 text-primary-700 border-primary-300"
                      : "text-gray-700 hover:bg-gray-50",
                    view === views[0] && "rounded-l-md",
                    view === views[views.length - 1] && "rounded-r-md"
                  )}
                >
                  {view.icon && <view.icon className="w-4 h-4 mr-2" />}
                  {view.label}
                </button>
              ))}
            </div>
          )}
          
          {/* Bulk actions */}
          {bulkActions.length > 0 && (
            <BulkActionsDropdown
              actions={bulkActions}
              selectedItems={[]} // Pass actual selected items from parent
              selectedCount={selectedCount}
            />
          )}
          
          {/* Export options */}
          {exportOptions.length > 0 && (
            <ExportDropdown options={exportOptions} />
          )}
          
          {/* Refresh button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshLoading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={cn("w-4 h-4", refreshLoading && "animate-spin")} />
            </button>
          )}
          
          {/* Additional actions */}
          {additionalActions}
        </div>
      </div>
      
      {/* Active filters row */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-200">
          <span className="text-sm text-gray-600">Active filters:</span>
          {activeFilters.map((filter) => (
            <FilterChip
              key={filter.key}
              filter={filter}
              onRemove={onFilterRemove || (() => {})}
            />
          ))}
          {onFiltersClear && (
            <button
              onClick={onFiltersClear}
              className="text-sm text-gray-500 hover:text-gray-700 underline focus:outline-none"
            >
              Clear all
            </button>
          )}
        </div>
      )}
      
      {/* Results info row */}
      {showResultsInfo && (
        <div className={cn(
          "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2",
          hasActiveFilters ? "mt-3" : "mt-4",
          "pt-3 border-t border-gray-200"
        )}>
          <ResultsInfo
            currentPage={currentPage}
            pageSize={pageSize}
            totalResults={totalResults}
            selectedCount={selectedCount}
          />
        </div>
      )}
    </div>
  );
};

export default TableControls;