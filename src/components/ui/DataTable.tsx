import React, { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn, createResponsiveClasses, tableClasses, BaseComponentProps } from '@/lib/component-patterns';

// Column definition interface
export interface Column<T = any> {
  key: string;
  header: string;
  accessor?: keyof T | ((item: T) => any);
  render?: (value: any, item: T) => ReactNode;
  className?: string;
  sortable?: boolean;
  hideOnMobile?: boolean;
}

// Action button interface
export interface ActionButton<T = any> {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: (item: T) => void;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  disabled?: (item: T) => boolean;
  loading?: (item: T) => boolean;
  hideOnMobile?: boolean;
}

// Main DataTable props
export interface DataTableProps<T = any> extends BaseComponentProps {
  data: T[];
  columns: Column<T>[];
  actions?: ActionButton<T>[];
  loading?: boolean;
  emptyState?: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
    action?: {
      label: string;
      onClick: () => void;
    };
  };
  mobileCardRender?: (item: T, index: number) => ReactNode;
  onRowClick?: (item: T) => void;
  keyExtractor?: (item: T, index: number) => string | number;
}

// Get nested value from object using dot notation
const getNestedValue = (obj: any, path: string | ((obj: any) => any)): any => {
  if (typeof path === 'function') {
    return path(obj);
  }
  
  if (typeof path === 'string') {
    return path.split('.').reduce((value, key) => value?.[key], obj);
  }
  
  return obj[path];
};

// Action button component
const ActionButton = <T,>({
  action,
  item,
  className
}: {
  action: ActionButton<T>;
  item: T;
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
      onClick={() => !isDisabled && !isLoading && action.onClick(item)}
      disabled={isDisabled || isLoading}
      className={cn(
        'p-2 rounded-md transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[action.variant || 'secondary'],
        action.hideOnMobile && 'hidden md:inline-flex',
        className
      )}
      title={action.label}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <action.icon className="w-4 h-4" />
      )}
    </button>
  );
};

// Mobile card component
const MobileCard = <T,>({
  item,
  columns,
  actions,
  onRowClick,
  customRender,
  index
}: {
  item: T;
  columns: Column<T>[];
  actions?: ActionButton<T>[];
  onRowClick?: (item: T) => void;
  customRender?: (item: T, index: number) => ReactNode;
  index: number;
}) => {
  // If custom render is provided, use it
  if (customRender) {
    return <div className={tableClasses.mobileCard}>{customRender(item, index)}</div>;
  }
  
  // Default mobile card layout
  const visibleColumns = columns.filter(col => !col.hideOnMobile);
  
  return (
    <div
      className={cn(
        tableClasses.mobileCard,
        onRowClick && 'cursor-pointer hover:bg-gray-50'
      )}
      onClick={() => onRowClick?.(item)}
    >
      <div className="space-y-3">
        {visibleColumns.map((column) => {
          // Ensure accessor is only string or function, fallback to key otherwise
          let value;
          if (typeof column.accessor === 'string' || typeof column.accessor === 'function') {
            value = getNestedValue(item, column.accessor);
          } else {
            value = getNestedValue(item, column.key);
          }
          
          return (
            <div key={column.key} className="flex justify-between items-start">
              <span className={tableClasses.mobileCardLabel}>
                {column.header}
              </span>
              <div className={tableClasses.mobileCardValue}>
                {column.render ? column.render(value, item) : value}
              </div>
            </div>
          );
        })}
        
        {actions && actions.length > 0 && (
          <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
            {actions.map((action, actionIndex) => (
              <ActionButton
                key={actionIndex}
                action={action}
                item={item}
                className="flex items-center gap-1 px-3 py-2 text-sm rounded-md"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Empty state component
const EmptyState = ({
  emptyState
}: {
  emptyState: NonNullable<DataTableProps['emptyState']>
}) => (
  <div className="text-center py-12 bg-white rounded-lg border">
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
const LoadingState = () => (
  <div className="min-h-64 bg-gray-50 flex items-center justify-center rounded-lg">
    <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
  </div>
);

// Main DataTable component
export const DataTable = <T,>({
  data,
  columns,
  actions,
  loading = false,
  emptyState,
  mobileCardRender,
  onRowClick,
  keyExtractor = (item, index) => index,
  className,
  ...props
}: DataTableProps<T>) => {
  // Loading state
  if (loading) {
    return <LoadingState />;
  }
  
  // Empty state
  if (data.length === 0 && emptyState) {
    return <EmptyState emptyState={emptyState} />;
  }
  
  return (
    <div className={cn('w-full', className)} {...props}>
      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-lg border overflow-hidden">
        <div className={tableClasses.wrapper}>
          <table className={tableClasses.table}>
            <thead className={tableClasses.header}>
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={cn(
                      tableClasses.headerCell,
                      column.className,
                      column.hideOnMobile && 'hidden md:table-cell'
                    )}
                  >
                    {column.header}
                  </th>
                ))}
                {actions && actions.length > 0 && (
                  <th className={tableClasses.headerCell}>Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((item, index) => {
                const key = keyExtractor(item, index);
                return (
                  <tr
                    key={key}
                    className={cn(
                      tableClasses.row,
                      onRowClick && 'cursor-pointer'
                    )}
                    onClick={() => onRowClick?.(item)}
                  >
                    {columns.map((column) => {
                      let value;
                      if (typeof column.accessor === 'string' || typeof column.accessor === 'function') {
                        value = getNestedValue(item, column.accessor);
                      } else {
                        value = getNestedValue(item, column.key);
                      }
                      
                      return (
                        <td
                          key={column.key}
                          className={cn(
                            tableClasses.cell,
                            column.className,
                            column.hideOnMobile && 'hidden md:table-cell'
                          )}
                        >
                          {column.render ? column.render(value, item) : value}
                        </td>
                      );
                    })}
                    {actions && actions.length > 0 && (
                      <td className={cn(tableClasses.cell, 'text-right')}>
                        <div className="flex items-center justify-end gap-2">
                          {actions.map((action, actionIndex) => (
                            <ActionButton
                              key={actionIndex}
                              action={action}
                              item={item}
                            />
                          ))}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {data.map((item, index) => {
          const key = keyExtractor(item, index);
          return (
            <MobileCard
              key={key}
              item={item}
              columns={columns}
              actions={actions}
              onRowClick={onRowClick}
              customRender={mobileCardRender}
              index={index}
            />
          );
        })}
      </div>
    </div>
  );
};

export default DataTable;