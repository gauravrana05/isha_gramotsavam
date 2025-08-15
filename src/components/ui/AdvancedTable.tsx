'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Table, type TableProps, type Column, type ActionButton, type SortConfig } from './Table';
import { TableControls, type ExportConfig, type BulkAction } from './TableControls';
import { FilterSidebar, type FilterField, type ActiveFilter } from './FilterSidebar';
import { Pagination } from './Pagination';
import { cn, BaseComponentProps } from '@/lib/component-patterns';
import { Modal } from './Modal';

// Combined table configuration interface
export interface AdvancedTableConfig<T = any> {
  // Data and columns
  data: T[];
  columns: Column<T>[];
  keyExtractor?: (item: T, index: number) => string | number;
  
  // Server-side data loading
  loading?: boolean;
  onDataLoad?: (params: TableParams) => Promise<void> | void;
  
  // Search configuration
  searchable?: boolean;
  searchPlaceholder?: string;
  searchFields?: (keyof T)[];
  
  // Filter configuration
  filterable?: boolean;
  filters?: FilterField[];
  
  // Sort configuration
  sortable?: boolean;
  multiSort?: boolean;
  defaultSort?: SortConfig[];
  
  // Pagination configuration
  pagination?: {
    enabled: boolean;
    pageSize?: number;
    pageSizeOptions?: number[];
    serverSide?: boolean;
    total?: number;
  };
  
  // Actions
  actions?: ActionButton<T>[];
  bulkActions?: BulkAction[];
  exportOptions?: ExportConfig[];
  
  // Selection
  selectable?: boolean;
  
  // URL state persistence
  persistState?: boolean;
  stateKey?: string; // Unique key for URL state
  
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
  
  // Styling
  compact?: boolean;
  stickyHeader?: boolean;
}

// Table parameters for server-side operations
export interface TableParams {
  search: string;
  sort: SortConfig[];
  filters: ActiveFilter[];
  page: number;
  pageSize: number;
}

// Table state interface
interface TableState {
  search: string;
  sort: SortConfig[];
  filters: ActiveFilter[];
  page: number;
  pageSize: number;
  selectedRows: Set<string | number>;
  isFilterSidebarOpen: boolean;
}

// Advanced table props
export interface AdvancedTableProps<T = any> extends BaseComponentProps, AdvancedTableConfig<T> {
  title?: string;
  subtitle?: string;
  additionalActions?: React.ReactNode;
  // Virtualization
  virtualize?: boolean;
  virtualizeThreshold?: number; // auto-enable when data length exceeds
  rowHeight?: number;
  viewportHeight?: number;
}

// URL state management utilities
const encodeStateToURL = (state: Partial<TableState>): URLSearchParams => {
  const params = new URLSearchParams();
  
  if (state.search) params.set('search', state.search);
  if (state.sort && state.sort.length > 0) {
    params.set('sort', JSON.stringify(state.sort));
  }
  if (state.filters && state.filters.length > 0) {
    params.set('filters', JSON.stringify(state.filters));
  }
  if (state.page && state.page > 1) params.set('page', state.page.toString());
  if (state.pageSize && state.pageSize !== 25) params.set('pageSize', state.pageSize.toString());
  
  return params;
};

const decodeStateFromURL = (searchParams: URLSearchParams): Partial<TableState> => {
  const state: Partial<TableState> = {};
  
  const search = searchParams.get('search');
  if (search) state.search = search;
  
  const sort = searchParams.get('sort');
  if (sort) {
    try {
      state.sort = JSON.parse(sort);
    } catch (e) {
      console.warn('Invalid sort parameter in URL');
    }
  }
  
  const filters = searchParams.get('filters');
  if (filters) {
    try {
      state.filters = JSON.parse(filters);
    } catch (e) {
      console.warn('Invalid filters parameter in URL');
    }
  }
  
  const page = searchParams.get('page');
  if (page) {
    const pageNum = parseInt(page, 10);
    if (pageNum > 0) state.page = pageNum;
  }
  
  const pageSize = searchParams.get('pageSize');
  if (pageSize) {
    const pageSizeNum = parseInt(pageSize, 10);
    if (pageSizeNum > 0) state.pageSize = pageSizeNum;
  }
  
  return state;
};

// Main AdvancedTable component
export const AdvancedTable = <T,>({
  // Data props
  data,
  columns,
  keyExtractor,
  loading = false,
  onDataLoad,
  
  // Search props
  searchable = false,
  searchPlaceholder = "Search...",
  searchFields,
  
  // Filter props
  filterable = false,
  filters = [],
  
  // Sort props
  sortable = false,
  multiSort = false,
  defaultSort = [],
  
  // Pagination props
  pagination = { enabled: true },
  
  // Action props
  actions = [],
  bulkActions = [],
  exportOptions = [],
  
  // Selection props
  selectable = false,
  
  // State persistence
  persistState = false,
  stateKey = 'table',
  
  // Other props
  emptyState,
  compact = false,
  stickyHeader = false,
  title,
  subtitle,
  additionalActions,
  
  // Props that shouldn't go to DOM
  itemsPerPageOptions,
  defaultItemsPerPage,
  emptyMessage,
  virtualize,
  virtualizeThreshold,
  rowHeight,
  viewportHeight,
  
  className,
  ...props
}: AdvancedTableProps<T>) => {
  // Saved views state (localStorage)
  const savedViewsKey = stateKey ? `table:views:${stateKey}` : undefined;
  const [views, setViews] = useState<{ label: string; value: string; state: Partial<TableState> }[]>([]);
  const [currentView, setCurrentView] = useState<string | undefined>(undefined);
  const [isSaveViewOpen, setIsSaveViewOpen] = useState(false);
  const [saveViewName, setSaveViewName] = useState('');

  useEffect(() => {
    if (!savedViewsKey) return;
    try {
      const raw = localStorage.getItem(savedViewsKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { label: string; value: string; state: Partial<TableState> }[];
        setViews(parsed);
      }
    } catch {}
  }, [savedViewsKey]);

  const persistViews = useCallback((next: { label: string; value: string; state: Partial<TableState> }[]) => {
    if (!savedViewsKey) return;
    setViews(next);
    try { localStorage.setItem(savedViewsKey, JSON.stringify(next)); } catch {}
  }, [savedViewsKey]);

  // Initialize state (moved above closures to avoid temporal dead zone)
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Initialize state
  const [state, setState] = useState<TableState>(() => {
    const urlState = persistState ? decodeStateFromURL(searchParams) : {};
    return {
      search: '',
      sort: defaultSort,
      filters: [],
      page: 1,
      pageSize: pagination.pageSize || 25,
      selectedRows: new Set(),
      isFilterSidebarOpen: false,
      ...urlState
    };
  });

  const handleConfirmSaveView = useCallback(() => {
    if (!savedViewsKey) return;
    const name = saveViewName.trim();
    if (!name) return;
    const value = name.toLowerCase().replace(/\s+/g, '-');
    const viewState: Partial<TableState> = {
      search: state.search,
      sort: state.sort,
      filters: state.filters,
      pageSize: state.pageSize,
    } as any;
    const next = views.filter(v => v.value !== value).concat([{ label: name, value, state: viewState }]);
    persistViews(next);
    setCurrentView(value);
    setIsSaveViewOpen(false);
    setSaveViewName('');
  }, [persistViews, savedViewsKey, saveViewName, state.filters, state.pageSize, state.search, state.sort, views]);

  const handleApplyView = useCallback((viewValue: string) => {
    const v = views.find(v => v.value === viewValue);
    if (!v) return;
    setCurrentView(viewValue);
    setState(prev => ({
      ...prev,
      search: v.state.search ?? '',
      sort: v.state.sort ?? [],
      filters: v.state.filters ?? [],
      page: 1,
      pageSize: (v.state as any).pageSize ?? prev.pageSize,
    }));
  }, [views]);

  const handleDeleteCurrentView = useCallback(() => {
    if (!currentView) return;
    const next = views.filter(v => v.value !== currentView);
    persistViews(next);
    setCurrentView(undefined);
  }, [currentView, persistViews, views]);
  
  
  // Update URL when state changes (if persistence is enabled)
  useEffect(() => {
    if (!persistState) return;
    
    const params = encodeStateToURL(state);
    const currentUrl = new URL(window.location.href);
    const newUrl = new URL(window.location.href);
    
    // Clear existing table-related params
    ['search', 'sort', 'filters', 'page', 'pageSize'].forEach(key => {
      newUrl.searchParams.delete(key);
    });
    
    // Add new params
    params.forEach((value, key) => {
      newUrl.searchParams.set(key, value);
    });
    
    // Only update if URL actually changed
    if (currentUrl.href !== newUrl.href) {
      router.replace(newUrl.pathname + newUrl.search);
    }
  }, [state, persistState, router]);
  
  // Load data when state changes (for server-side tables)
  useEffect(() => {
    if (onDataLoad) {
      const params: TableParams = {
        search: state.search,
        sort: state.sort,
        filters: state.filters,
        page: state.page,
        pageSize: state.pageSize
      };
      onDataLoad(params);
    }
  }, [state.search, state.sort, state.filters, state.page, state.pageSize, onDataLoad]);
  
  // Process data for client-side operations
  const processedData = useMemo(() => {
    if (onDataLoad || pagination?.serverSide) {
      // For server-side, return data as-is
      return data;
    }
    
    // Client-side processing
    let result = [...data];
    
    // Apply search filter
    if (state.search.trim()) {
      const searchLower = state.search.toLowerCase();
      result = result.filter(item => {
        if (searchFields?.length) {
          // Search only specified fields
          return searchFields.some(field => {
            const value = item[field];
            return value != null && String(value).toLowerCase().includes(searchLower);
          });
        } else {
          // Search all columns
          return columns.some(column => {
            const value = column.accessor ? 
              (typeof column.accessor === 'function' ? column.accessor(item) : item[column.accessor]) :
              item[column.key as keyof T];
            return value != null && String(value).toLowerCase().includes(searchLower);
          });
        }
      });
    }
    
    // Apply column filters
    if (state.filters.length) {
      result = result.filter(item => {
        return state.filters.every(filter => {
          const value = item[filter.key as keyof T];
          
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
    
    // Apply sorting
    if (state.sort.length) {
      result = [...result].sort((a, b) => {
        for (const sort of state.sort) {
          const column = columns.find(col => (col.sortKey || col.key) === sort.key);
          if (!column) continue;
          
          let aValue = column.accessor ? 
            (typeof column.accessor === 'function' ? column.accessor(a) : a[column.accessor]) :
            a[column.key as keyof T];
          let bValue = column.accessor ? 
            (typeof column.accessor === 'function' ? column.accessor(b) : b[column.accessor]) :
            b[column.key as keyof T];
          
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
    }
    
    return result;
  }, [data, state, searchFields, columns, onDataLoad, pagination?.serverSide]);
  
  // Calculate pagination values
  const totalItems = pagination?.serverSide ? (pagination.total || 0) : processedData.length;
  const totalPages = Math.ceil(totalItems / state.pageSize);
  const startIndex = pagination?.serverSide ? 0 : (state.page - 1) * state.pageSize;
  const endIndex = pagination?.serverSide ? processedData.length : startIndex + state.pageSize;
  const paginatedData = pagination?.serverSide ? processedData : processedData.slice(startIndex, endIndex);
  
  // Event handlers
  const handleSearchChange = useCallback((search: string) => {
    setState(prev => ({ ...prev, search, page: 1 }));
  }, []);
  
  const handleSortChange = useCallback((sort: SortConfig[]) => {
    setState(prev => ({ ...prev, sort }));
  }, []);
  
  const handleFiltersChange = useCallback((filters: ActiveFilter[]) => {
    setState(prev => ({ ...prev, filters, page: 1 }));
  }, []);
  
  const handlePageChange = useCallback((page: number) => {
    // Smooth scroll behavior - maintain current scroll position or smoothly scroll to table
    const tableElement = document.querySelector('[data-table-container]');
    if (tableElement) {
      const rect = tableElement.getBoundingClientRect();
      const isTableVisible = rect.top >= 0 && rect.top <= window.innerHeight;
      
      if (!isTableVisible) {
        tableElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
      }
    }
    
    // Add a small delay for better user experience with transitions
    requestAnimationFrame(() => {
      setState(prev => ({ ...prev, page }));
    });
  }, []);
  
  const handlePageSizeChange = useCallback((pageSize: number) => {
    setState(prev => ({ ...prev, pageSize, page: 1 }));
  }, []);
  
  const handleSelectionChange = useCallback((selectedRows: Set<string | number>) => {
    setState(prev => ({ ...prev, selectedRows }));
  }, []);
  
  const handleFilterToggle = useCallback(() => {
    setState(prev => ({ ...prev, isFilterSidebarOpen: !prev.isFilterSidebarOpen }));
  }, []);
  
  const handleFilterRemove = useCallback((key: string) => {
    setState(prev => ({
      ...prev,
      filters: prev.filters.filter(f => f.key !== key),
      page: 1
    }));
  }, []);
  
  const handleFiltersClear = useCallback(() => {
    setState(prev => ({ ...prev, filters: [], page: 1 }));
  }, []);
  
  const handleRefresh = useCallback(() => {
    if (onDataLoad) {
      const params: TableParams = {
        search: state.search,
        sort: state.sort,
        filters: state.filters,
        page: state.page,
        pageSize: state.pageSize
      };
      onDataLoad(params);
    }
  }, [onDataLoad, state]);
  
  // Get selected items for bulk actions
  const selectedItems = useMemo(() => {
    return paginatedData.filter((item, index) => {
      const key = keyExtractor ? keyExtractor(item, index) : index;
      return state.selectedRows.has(key);
    });
  }, [paginatedData, state.selectedRows, keyExtractor]);
  
  return (
    <div className={cn('w-full', className)} {...props}>
      {/* Header */}
      {(title || subtitle || additionalActions) && (
        <div className="mb-6">
          {(title || subtitle) && (
            <div className="mb-4">
              {title && (
                <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-gray-600">
                  {subtitle}
                </p>
              )}
            </div>
          )}
          {additionalActions && (
            <div className="flex justify-end">
              {additionalActions}
            </div>
          )}
        </div>
      )}
      
      <div className="w-full" data-table-container>
        {/* Table controls */}
        <TableControls
          searchable={searchable}
          searchValue={state.search}
          searchPlaceholder={searchPlaceholder}
          onSearchChange={handleSearchChange}
          
          filterable={filterable}
          showFilterButton={filters.length > 0}
          onFilterToggle={handleFilterToggle}
          isFilterOpen={state.isFilterSidebarOpen}
          
          activeFilters={state.filters}
          onFilterRemove={handleFilterRemove}
          onFiltersClear={handleFiltersClear}
          
          exportOptions={exportOptions}
          
          bulkActions={bulkActions}
          selectedCount={state.selectedRows.size}
          totalCount={totalItems}
          
          onRefresh={onDataLoad ? handleRefresh : undefined}
          refreshLoading={loading}
          
          showResultsInfo={true}
          currentPage={state.page}
          pageSize={state.pageSize}
          totalResults={totalItems}
          
          // Saved views
          views={views.map(v => ({ label: v.label, value: v.value }))}
          currentView={currentView}
          onViewChange={handleApplyView}

          compact={compact}
          additionalActions={(
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSaveViewOpen(true)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                Save view
              </button>
              {currentView && (
                <button
                  type="button"
                  onClick={handleDeleteCurrentView}
                  className="px-3 py-2 text-sm text-red-600 border border-red-200 rounded-md bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Delete view
                </button>
              )}
            </div>
          )}
        />
        
        {/* Table */}
        <Table
          data={paginatedData}
          columns={columns}
          actions={actions}
          loading={loading}
          
          searchable={false} // Handled by TableControls
          sortable={sortable}
          sortConfig={state.sort}
          onSortChange={handleSortChange}
          multiSort={multiSort}
          
          selectable={selectable}
          selectedRows={state.selectedRows}
          onSelectionChange={handleSelectionChange}
          
          stickyHeader={stickyHeader}
          compactMode={compact}
          keyExtractor={keyExtractor}
          
          emptyState={emptyState}
          // Virtualization
          virtualize={props.virtualize || totalItems > (props.virtualizeThreshold ?? 200)}
          rowHeight={props.rowHeight}
          viewportHeight={props.viewportHeight}
        />
        
        {/* Pagination */}
        {pagination.enabled && totalPages > 1 && (
          <Pagination
            currentPage={state.page}
            pageSize={state.pageSize}
            totalItems={totalItems}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            
            pageSizeOptions={pagination.pageSizeOptions}
            showQuickJumper={totalPages > 10}
            maxVisiblePages={3}
            
            loading={loading}
            size={compact ? 'sm' : 'base'}
          />
        )}
      </div>
      
      {/* Save View Modal */}
      <Modal
        isOpen={isSaveViewOpen}
        onClose={() => { setIsSaveViewOpen(false); setSaveViewName(''); }}
        title="Save current view"
        description="Name and save your current filters, search, and sort settings"
        size="sm"
        footer={(
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setIsSaveViewOpen(false); setSaveViewName(''); }}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmSaveView}
              disabled={!saveViewName.trim()}
              className="px-4 py-2 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-600 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        )}
      >
        <div className="px-6 py-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">View name</label>
          <input
            type="text"
            autoFocus
            value={saveViewName}
            onChange={(e) => setSaveViewName(e.target.value)}
            placeholder="e.g., Verified last 30d"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent"
          />
        </div>
      </Modal>

      {/* Filter sidebar */}
      {filterable && filters.length > 0 && (
        <FilterSidebar
          isOpen={state.isFilterSidebarOpen}
          onClose={() => setState(prev => ({ ...prev, isFilterSidebarOpen: false }))}
          filters={filters}
          activeFilters={state.filters}
          onFiltersChange={handleFiltersChange}
          onClearAll={handleFiltersClear}
        />
      )}
    </div>
  );
};

export default AdvancedTable;