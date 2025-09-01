import React, { ReactNode, useState, useMemo, useCallback, useEffect } from 'react';
import { Loader2, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { cn, createResponsiveClasses, tableClasses, BaseComponentProps } from '@/lib/component-patterns';

// Column definition interface
export interface Column<T = any> {
  key: string;
  header: string;
  accessor?: keyof T | ((item: T) => any);
  render?: (value: any, item: T, index: number) => ReactNode;
  className?: string;
  headerClassName?: string;
  sortable?: boolean;
  sortKey?: string; // Custom sort key if different from accessor
  width?: string | number;
  minWidth?: string | number;
  sticky?: boolean; // For sticky columns on mobile
  priority?: 'high' | 'medium' | 'low'; // Controls visibility on smaller screens
}

// Action button interface
export interface ActionButton<T = any> {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: (item: T, index: number) => void;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  disabled?: (item: T) => boolean;
  loading?: (item: T) => boolean;
  tooltip?: string;
}

// Sort configuration
export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

// Pagination configuration
export interface PaginationConfig {
  page: number;
  pageSize: number;
  total: number;
  showSizeSelector?: boolean;
  pageSizeOptions?: number[];
}

// Filter configuration
export interface FilterConfig {
  key: string;
  value: any;
  operator?: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'gt' | 'lt' | 'between';
}

// Table state interface
export interface TableState {
  search: string;
  sort: SortConfig[];
  filters: FilterConfig[];
  pagination: PaginationConfig;
}

// Main Table props
export interface TableProps<T = any> extends BaseComponentProps {
  data: T[];
  columns: Column<T>[];
  actions?: ActionButton<T>[];
  loading?: boolean;
  
  // Search functionality
  searchable?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  
  // Sorting functionality
  sortable?: boolean;
  sortConfig?: SortConfig[];
  onSortChange?: (sortConfig: SortConfig[]) => void;
  multiSort?: boolean;
  
  // Filtering functionality
  filterable?: boolean;
  filters?: FilterConfig[];
  onFiltersChange?: (filters: FilterConfig[]) => void;
  
  // Pagination functionality
  pagination?: PaginationConfig;
  onPaginationChange?: (pagination: PaginationConfig) => void;
  
  // Empty state
  emptyState?: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
    action?: {
      label: string;
      onClick: () => void;
    };
  };
  
  // Table configuration
  stickyHeader?: boolean;
  compactMode?: boolean;
  hoverable?: boolean;
  selectable?: boolean;
  selectedRows?: Set<string | number>;
  onSelectionChange?: (selectedRows: Set<string | number>) => void;
  
  // Row configuration
  onRowClick?: (item: T, index: number) => void;
  onRowMouseDown?: (item: T, index: number) => void;
  onRowMouseUp?: () => void;
  onRowMouseLeave?: () => void;
  onRowTouchStart?: (item: T, index: number) => void;
  onRowTouchEnd?: () => void;
  onRowSelect?: (key: string | number, selected: boolean) => void;
  keyExtractor?: (item: T, index: number) => string | number;
  
  // Expandable rows
  expandable?: boolean;
  expandedRows?: Set<string | number>;
  onRowExpand?: (item: T, expanded: boolean) => void;
  renderExpandedContent?: (item: T, index: number) => React.ReactNode;
  
  // Bulk actions
  bulkActions?: ActionButton<T[]>[];
  // Virtualization
  virtualize?: boolean;
  rowHeight?: number;
  viewportHeight?: number;
}

// Get nested value from object using dot notation or function
const getNestedValue = (obj: any, path: string | ((obj: any) => any)): any => {
  if (typeof path === 'function') {
    return path(obj);
  }
  
  if (typeof path === 'string') {
    return path.split('.').reduce((value, key) => value?.[key], obj);
  }
  
  return obj[path];
};

// Sort data based on sort configuration
const sortData = <T,>(data: T[], sortConfig: SortConfig[], columns: Column<T>[]): T[] => {
  if (!sortConfig.length) return data;
  
  return [...data].sort((a, b) => {
    for (const sort of sortConfig) {
      const column = columns.find(col => (col.sortKey || col.key) === sort.key);
      if (!column) continue;
      
      let aValue = column.accessor 
        ? (typeof column.accessor === 'function' ? column.accessor(a) : getNestedValue(a, String(column.accessor)))
        : getNestedValue(a, String(column.key));
      let bValue = column.accessor 
        ? (typeof column.accessor === 'function' ? column.accessor(b) : getNestedValue(b, String(column.accessor)))
        : getNestedValue(b, String(column.key));
      
      // Handle null/undefined values
      if (aValue == null && bValue == null) continue;
      if (aValue == null) return sort.direction === 'asc' ? 1 : -1;
      if (bValue == null) return sort.direction === 'asc' ? -1 : 1;
      
      // Convert to comparable values
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();
      
      let comparison = 0;
      if (aValue < bValue) comparison = -1;
      if (aValue > bValue) comparison = 1;
      
      if (comparison !== 0) {
        return sort.direction === 'asc' ? comparison : -comparison;
      }
    }
    return 0;
  });
};

// Filter data based on search and filters
const filterData = <T,>(
  data: T[], 
  search: string, 
  filters: FilterConfig[], 
  columns: Column<T>[]
): T[] => {
  let filtered = data;
  
  // Apply search filter
  if (search.trim()) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(item => {
      return columns.some(column => {
        const value = column.accessor 
          ? (typeof column.accessor === 'function' ? column.accessor(item) : getNestedValue(item, String(column.accessor)))
          : getNestedValue(item, String(column.key));
        return value != null && String(value).toLowerCase().includes(searchLower);
      });
    });
  }
  
  // Apply column filters
  if (filters.length) {
    filtered = filtered.filter(item => {
      return filters.every(filter => {
        const value = getNestedValue(item, filter.key);
        
        if (value == null) return false;
        
        const filterValue = filter.value;
        const operator = filter.operator || 'equals';
        
        switch (operator) {
          case 'equals':
            return value === filterValue;
          case 'contains':
            return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
          case 'startsWith':
            return String(value).toLowerCase().startsWith(String(filterValue).toLowerCase());
          case 'endsWith':
            return String(value).toLowerCase().endsWith(String(filterValue).toLowerCase());
          case 'gt':
            return Number(value) > Number(filterValue);
          case 'lt':
            return Number(value) < Number(filterValue);
          case 'between':
            return Array.isArray(filterValue) && 
                   Number(value) >= Number(filterValue[0]) && 
                   Number(value) <= Number(filterValue[1]);
          default:
            return true;
        }
      });
    });
  }
  
  return filtered;
};

// Paginate data
const paginateData = <T,>(data: T[], pagination: PaginationConfig): T[] => {
  const startIndex = (pagination.page - 1) * pagination.pageSize;
  const endIndex = startIndex + pagination.pageSize;
  return data.slice(startIndex, endIndex);
};

// Action button component
const ActionButton = <T,>({
  action,
  item,
  index,
  className
}: {
  action: ActionButton<T>;
  item: T;
  index: number;
  className?: string;
}) => {
  const isDisabled = action.disabled?.(item) || false;
  const isLoading = action.loading?.(item) || false;
  
  const variantClasses = {
    primary: 'text-blue-600 hover:text-blue-900 hover:bg-blue-50',
    secondary: 'text-gray-600 hover:text-gray-900 hover:bg-gray-50',
    success: 'text-green-600 hover:text-green-900 hover:bg-green-50',
    warning: 'text-yellow-600 hover:text-yellow-900 hover:bg-yellow-50',
    danger: 'text-red-600 hover:text-red-900 hover:bg-red-50',
  };
  
  return (
    <button
      onClick={() => !isDisabled && !isLoading && action.onClick(item, index)}
      disabled={isDisabled || isLoading}
      className={cn(
        'p-2 rounded-md transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[action.variant || 'secondary'],
        className
      )}
      title={action.tooltip || action.label}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <action.icon className="w-4 h-4" />
      )}
    </button>
  );
};

// Sort indicator component
const SortIndicator = ({ 
  sortConfig, 
  columnKey, 
  sortable 
}: { 
  sortConfig: SortConfig[]; 
  columnKey: string;
  sortable?: boolean;
}) => {
  if (!sortable) return null;
  
  const sort = sortConfig.find(s => s.key === columnKey);
  const sortIndex = sortConfig.findIndex(s => s.key === columnKey);
  
  if (!sort) {
    return <ChevronsUpDown className="w-4 h-4 text-gray-400 ml-2" />;
  }
  
  const Icon = sort.direction === 'asc' ? ChevronUp : ChevronDown;
  
  return (
    <div className="flex items-center ml-2">
      <Icon className="w-4 h-4 text-gray-700" />
      {sortConfig.length > 1 && (
        <span className="text-xs text-gray-500 ml-1">{sortIndex + 1}</span>
      )}
    </div>
  );
};

// Empty state component
const EmptyState = ({
  emptyState
}: {
  emptyState: NonNullable<TableProps['emptyState']>
}) => (
  <div className="text-center py-12 bg-white">
    <emptyState.icon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
    <h3 className="text-lg font-medium text-gray-900 mb-2">{emptyState.title}</h3>
    <p className="text-gray-600 mb-4">{emptyState.description}</p>
    {emptyState.action && (
      <button
        onClick={emptyState.action.onClick}
        className="inline-flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
      >
        {emptyState.action.label}
      </button>
    )}
  </div>
);

// Loading state component
const LoadingState = ({ 
  rows = 3, 
  columns = [], 
  selectable = false, 
  expandable = false 
}: { 
  rows?: number;
  columns?: Column<any>[];
  selectable?: boolean;
  expandable?: boolean;
}) => {
  // Generate skeleton content based on column type and content
  const getSkeletonContent = (column: Column<any>, index: number) => {
    const key = column.key as string;
    
    // Column-specific skeleton patterns
    if (key.includes('name') || key.includes('title')) {
      return (
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-24"></div>
        </div>
      );
    }
    
    if (key.includes('description')) {
      return <div className="h-4 bg-gray-200 rounded w-32"></div>;
    }
    
    if (key.includes('status') || key.includes('active')) {
      return <div className="h-6 bg-gray-200 rounded-full w-16"></div>;
    }
    
    if (key.includes('categories') || key.includes('tags') || key === 'genderCategories') {
      return (
        <div className="flex gap-1">
          <div className="h-6 bg-gray-200 rounded-full w-12"></div>
          <div className="h-6 bg-gray-200 rounded-full w-14"></div>
        </div>
      );
    }
    
    if (key.includes('count') || key.includes('number') || key.includes('size') || key === 'players' || key === 'teams') {
      return (
        <div>
          <div className="h-4 bg-gray-200 rounded w-8 mb-1"></div>
          <div className="h-3 bg-gray-200 rounded w-12"></div>
        </div>
      );
    }
    
    if (key === 'isActive') {
      return <div className="h-6 bg-gray-200 rounded-full w-16"></div>;
    }
    
    if (key.includes('date') || key === 'dates') {
      return (
        <div>
          <div className="h-4 bg-gray-200 rounded w-20 mb-1"></div>
          <div className="h-3 bg-gray-200 rounded w-16"></div>
        </div>
      );
    }
    
    // Default skeleton
    return <div className="h-4 bg-gray-200 rounded w-20"></div>;
  };

  return (
    <div className="bg-white sm:rounded-lg sm:border overflow-hidden min-h-96 flex flex-col">
      <div 
        className="overflow-x-auto flex-1"
        style={{ 
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--isha-saffron) var(--isha-background)'
        }}
      >
        <table className="w-full divide-y divide-gray-200 text-sm" style={{ minWidth: '600px' }}>
          {/* Headers */}
          <thead className="bg-gray-50">
            <tr>
              {selectable && (
                <th className="w-12 px-6 py-3">
                  <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                </th>
              )}
              {expandable && (
                <th className="w-12 px-6 py-3">
                  <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                </th>
              )}
              {columns.map((column, index) => (
                <th key={index} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          
          {/* Skeleton Rows */}
          <tbody className="bg-white divide-y divide-gray-200 animate-pulse">
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50">
                {selectable && (
                  <td className="w-12 px-6 py-4">
                    <div className="w-4 h-4 bg-gray-200 rounded"></div>
                  </td>
                )}
                {expandable && (
                  <td className="w-12 px-6 py-4">
                    <div className="w-4 h-4 bg-gray-200 rounded"></div>
                  </td>
                )}
                {columns.map((column, colIndex) => (
                  <td key={colIndex} className="px-6 py-4 whitespace-nowrap">
                    {getSkeletonContent(column, colIndex)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Main Table component
export function Table<T>({
  data,
  columns,
  actions,
  loading = false,
  
  // Search props
  searchable = false,
  searchPlaceholder = "Search...",
  searchValue = '',
  onSearchChange,
  
  // Sort props
  sortable = false,
  sortConfig = [],
  onSortChange,
  multiSort = false,
  
  // Filter props
  filterable = false,
  filters = [],
  onFiltersChange,
  
  // Pagination props
  pagination,
  onPaginationChange,
  
  // Other props
  emptyState,
  stickyHeader = false,
  compactMode = false,
  hoverable = true,
  selectable = false,
  selectedRows = new Set(),
  onSelectionChange,
  onRowClick,
  onRowMouseDown,
  onRowMouseUp,
  onRowMouseLeave,
  onRowTouchStart,
  onRowTouchEnd,
  onRowSelect,
  keyExtractor = (item, index) => index,
  
  // Expandable props
  expandable = false,
  expandedRows = new Set(),
  onRowExpand,
  renderExpandedContent,
  
  bulkActions,
  className,
  // virtualization props should not be spread to DOM
  virtualize: virtualizeProp,
  rowHeight: rowHeightProp,
  viewportHeight: viewportHeightProp,
  ...rest
}: TableProps<T>) {
  // Local state for controlled/uncontrolled mode
  const [internalSearch, setInternalSearch] = useState(searchValue);
  const [internalSortConfig, setInternalSortConfig] = useState<SortConfig[]>(sortConfig);
  const [internalFilters, setInternalFilters] = useState<FilterConfig[]>(filters);
  
  // Use controlled or uncontrolled values
  const currentSearch = onSearchChange ? searchValue : internalSearch;
  const currentSortConfig = onSortChange ? sortConfig : internalSortConfig;
  const currentFilters = onFiltersChange ? filters : internalFilters;
  
  // Process data (filter, sort, paginate)
  const processedData = useMemo(() => {
    let result = filterData(data, currentSearch, currentFilters, columns);
    result = sortData(result, currentSortConfig, columns);
    
    if (pagination) {
      result = paginateData(result, pagination);
    }
    
    
    return result;
  }, [data, currentSearch, currentFilters, currentSortConfig, pagination, columns]);
  
  // Handle column sort
  const handleSort = useCallback((columnKey: string) => {
    const column = columns.find(col => col.key === columnKey);
    if (!column?.sortable) return;
    
    const sortKey = column.sortKey || columnKey;
    let newSortConfig: SortConfig[];
    
    if (multiSort) {
      const existingSort = currentSortConfig.find(s => s.key === sortKey);
      if (existingSort) {
        if (existingSort.direction === 'asc') {
          // Change to desc
          newSortConfig = currentSortConfig.map(s => 
            s.key === sortKey ? { ...s, direction: 'desc' as const } : s
          );
        } else {
          // Remove sort
          newSortConfig = currentSortConfig.filter(s => s.key !== sortKey);
        }
      } else {
        // Add new sort
        newSortConfig = [...currentSortConfig, { key: sortKey, direction: 'asc' }];
      }
    } else {
      const existingSort = currentSortConfig.find(s => s.key === sortKey);
      if (existingSort && existingSort.direction === 'asc') {
        newSortConfig = [{ key: sortKey, direction: 'desc' }];
      } else if (existingSort && existingSort.direction === 'desc') {
        newSortConfig = [];
      } else {
        newSortConfig = [{ key: sortKey, direction: 'asc' }];
      }
    }
    
    if (onSortChange) {
      onSortChange(newSortConfig);
    } else {
      setInternalSortConfig(newSortConfig);
    }
  }, [columns, currentSortConfig, multiSort, onSortChange]);
  
  // Handle search change
  const handleSearchChange = useCallback((value: string) => {
    if (onSearchChange) {
      onSearchChange(value);
    } else {
      setInternalSearch(value);
    }
  }, [onSearchChange]);
  
  // Simple row virtualization (windowing) for large datasets - hooks must come before any returns
  const shouldVirtualize = !!virtualizeProp && !pagination;
  const rowHeight = rowHeightProp ?? 44;
  const viewportHeight = viewportHeightProp ?? 480;
  const totalRows = processedData.length;
  const visibleCount = Math.max(1, Math.ceil(viewportHeight / rowHeight) + 6);

  // Compute start/end for window based on scrollTop (tracked via ref handler)
  const [scrollTop, setScrollTop] = useState(0);
  const startIndex = shouldVirtualize ? Math.max(0, Math.floor(scrollTop / rowHeight) - 3) : 0;
  const endIndex = shouldVirtualize ? Math.min(totalRows, startIndex + visibleCount) : totalRows;
  const offsetY = shouldVirtualize ? startIndex * rowHeight : 0;

  const onScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    setScrollTop(target.scrollTop || 0);
  }, []);
  
  // Loading state
  if (loading && processedData.length === 0) {
    return (
      <LoadingState 
        columns={columns}
        selectable={selectable}
        expandable={expandable}
        rows={5}
      />
    );
  }
  
  // Check if we should show empty state (but still render table structure)
  const showEmptyState = processedData.length === 0 && emptyState && !loading;

  return (
    <div className={cn('w-full', className)} {...rest}>
      {/* Table Container with horizontal scroll */}
      <div className="bg-white sm:rounded-lg sm:border overflow-hidden min-h-96 flex flex-col">
        <div 
          className="overflow-x-auto flex-1"
          style={{ 
            scrollbarWidth: 'thin',
            scrollbarColor: 'var(--isha-saffron) var(--isha-background)'
          }}
          onScroll={shouldVirtualize ? onScroll : undefined}
        >
          <table 
            className={cn(
              'w-full divide-y divide-gray-200',
              compactMode ? 'text-xs sm:text-sm' : 'text-sm',
            )}
            style={{ minWidth: '600px' }} // Ensures horizontal scroll on mobile
          >
            {/* Table Header */}
            <thead 
              className={cn(
                'bg-gray-50 border-b border-gray-200',
                stickyHeader && 'sticky top-0 z-20'
              )}
            >
              <tr>
                {/* Expand column */}
                {expandable && (
                  <th className="px-2 py-3 text-left w-8">
                    {/* Empty header for expand column */}
                  </th>
                )}
                
                {/* Selection column */}
                {selectable && (
                  <th className="px-3 py-3 text-left w-12">
                    <input
                      type="checkbox"
                      checked={selectedRows.size === processedData.length && processedData.length > 0}
                      onChange={(e) => {
                        const newSelected = new Set<string | number>();
                        if (e.target.checked) {
                          processedData.forEach((item, index) => {
                            newSelected.add(keyExtractor(item, index));
                          });
                        }
                        onSelectionChange?.(newSelected);
                      }}
                      className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                  </th>
                )}
                
                {/* Data columns */}
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={cn(
                      'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                      column.headerClassName,
                      column.sortable && 'cursor-pointer select-none hover:bg-gray-100',
                      compactMode && 'px-2 py-2 text-xs sm:px-4 sm:py-2'
                    )}
                    style={{
                      width: column.width,
                      minWidth: column.minWidth,
                    }}
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    <div className="flex items-center">
                      {column.header}
                      {sortable && (
                        <SortIndicator 
                          sortConfig={currentSortConfig} 
                          columnKey={column.sortKey || column.key}
                          sortable={column.sortable}
                        />
                      )}
                    </div>
                  </th>
                ))}
                
                {/* Actions column */}
                {actions && actions.length > 0 && (
                  <th className={cn(
                    'px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider',
                    compactMode && 'px-2 py-2 text-xs sm:px-4 sm:py-2'
                  )}>
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            
            {/* Table Body */}
            <tbody 
              className="bg-white divide-y divide-gray-200 transition-opacity duration-300 ease-in-out"
              style={shouldVirtualize ? { display: 'block', height: viewportHeight } as any : undefined}
            >
              {showEmptyState ? (
                <tr>
                  <td 
                    colSpan={columns.length + (selectable ? 1 : 0) + (expandable ? 1 : 0)}
                    className="w-full py-12 text-center"
                  >
                    <div className="flex flex-col items-center justify-center w-full">
                      <emptyState.icon className="w-12 h-12 text-gray-400 mb-3" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">{emptyState.title}</h3>
                      <p className="text-gray-600 mb-4">{emptyState.description}</p>
                      {emptyState.action && (
                        <button
                          onClick={emptyState.action.onClick}
                          className="inline-flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                        >
                          {emptyState.action.label}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                <>
                  {shouldVirtualize && (
                    <tr style={{ height: offsetY, display: 'block' }} />
                  )}
                  {(shouldVirtualize ? processedData.slice(startIndex, endIndex) : processedData).map((item, i) => {
                const index = shouldVirtualize ? startIndex + i : i;
                const rowKey = keyExtractor(item, index);
                const isSelected = selectedRows.has(rowKey);
                const isExpanded = expandedRows.has(rowKey);
                
                
                return (
                  <React.Fragment key={rowKey}>
                    <tr
                      className={cn(
                        'transition-colors',
                        hoverable && 'hover:bg-gray-50',
                        onRowClick && 'cursor-pointer',
                        isSelected && 'bg-blue-50',
                        compactMode && 'text-sm'
                      )}
                      onClick={() => onRowClick?.(item, index)}
                      onMouseDown={() => onRowMouseDown?.(item, index)}
                      onMouseUp={onRowMouseUp}
                      onMouseLeave={onRowMouseLeave}
                      onTouchStart={() => onRowTouchStart?.(item, index)}
                      onTouchEnd={onRowTouchEnd}
                      style={shouldVirtualize ? { display: 'block', height: rowHeight } as any : undefined}
                    >
                      {/* Expand button cell */}
                      {expandable && (
                        <td className="py-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRowExpand?.(item, !isExpanded);
                            }}
                            className="p-0.5 rounded hover:bg-gray-200 transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-black" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-black" />
                            )}
                          </button>
                        </td>
                      )}

                      {/* Selection cell */}
                      {selectable && (
                        <td className="px-3 py-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const newSelected = new Set(selectedRows);
                              if (e.target.checked) {
                                newSelected.add(rowKey);
                              } else {
                                newSelected.delete(rowKey);
                              }
                              onSelectionChange?.(newSelected);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                          />
                        </td>
                      )}
                    
                    {/* Data cells */}
                    {columns.map((column) => {
                      const value = column.accessor ? 
                        (typeof column.accessor === 'function' ? column.accessor(item) : getNestedValue(item, String(column.accessor))) : 
                        getNestedValue(item, String(column.key));
                      
                      
                      return (
                        <td
                          key={column.key}
                          className={cn(
                            'px-6 py-4 whitespace-nowrap text-sm text-gray-900',
                            column.className,
                            compactMode && 'px-2 py-2 text-xs sm:px-3 sm:py-2'
                          )}
                          style={{
                            width: column.width,
                            minWidth: column.minWidth,
                          }}
                        >
                          {column.render ? column.render(value, item, index) : value}
                        </td>
                      );
                    })}
                    
                    {/* Actions cell */}
                    {actions && actions.length > 0 && (
                      <td className={cn(
                        'px-6 py-4 whitespace-nowrap text-center',
                        compactMode && 'px-2 py-2 sm:px-3 sm:py-2'
                      )}>
                        <div className="flex items-center justify-center gap-1">
                          {actions.map((action, actionIndex) => (
                            <ActionButton
                              key={actionIndex}
                              action={action}
                              item={item}
                              index={index}
                            />
                          ))}
                        </div>
                      </td>
                    )}
                    </tr>
                    
                    {/* Expanded content - rendered directly as returned by renderExpandedContent */}
                    {expandable && isExpanded && renderExpandedContent && 
                      renderExpandedContent(item, index)
                    }
                  </React.Fragment>
                );
                  })}
                  {shouldVirtualize ? (
                    <tr style={{ height: Math.max(0, (totalRows - endIndex) * rowHeight), display: 'block' }} />
                  ) : null}
                </>
              )}
            </tbody>
          </table>
          
          {/* Loading overlay for table updates */}
          {loading && processedData.length > 0 && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-30">
              <div className="flex items-center space-x-2">
                <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
                <span className="text-gray-600">Updating...</span>
              </div>
            </div>
          )}
        </div>
      </div>
      {shouldVirtualize && (
        <div className="mt-2 text-xs text-gray-500">Showing rows {startIndex + 1}-{Math.min(endIndex, totalRows)} of {totalRows}</div>
      )}
    </div>
  );
}

export default Table;