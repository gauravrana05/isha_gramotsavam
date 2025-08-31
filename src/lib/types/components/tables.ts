import { ComponentType } from 'react';
import { SortConfig } from '../shared/common';

// Table component types - support both single sort and multi-sort
export interface TableParams {
  page: number;
  pageSize: number;
  search: string;
  sort: SortConfig | SortConfig[];
  filters: FilterField[];
}

// Active filter type for compatibility
export interface ActiveFilter {
  field: string;
  value: any;
  operator?: string;
}

export interface Column<T> {
  key: string;
  header: string;
  accessor?: keyof T | ((item: T) => any);
  sortable?: boolean;
  minWidth?: number;
  render?: (value: any, item: T) => React.ReactNode;
}

export interface ActionButton<T> {
  label: string;
  icon: ComponentType<{ className?: string }>;
  onClick: (item: T) => void;
  variant: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

export interface FilterField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'multiselect';
  options?: { label: string; value: string }[];
  value?: any;
}

export interface AdvancedTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  selectedRows?: Set<string | number>;
  onSelectedRowsChange?: (rows: Set<string | number>) => void;
  actionButtons?: ActionButton<T>[];
  searchPlaceholder?: string;
  emptyState?: {
    title: string;
    description: string;
    action?: {
      label: string;
      onClick: () => void;
    };
  };
}
