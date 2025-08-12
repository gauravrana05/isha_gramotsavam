import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  MoreHorizontal
} from 'lucide-react';
import { cn, BaseComponentProps } from '@/lib/component-patterns';

// Pagination configuration interface
export interface PaginationConfig {
  page: number;
  pageSize: number;
  total: number;
  showSizeSelector?: boolean;
  pageSizeOptions?: number[];
  showFirstLastButtons?: boolean;
  showPageNumbers?: boolean;
  maxVisiblePages?: number;
  showTotalInfo?: boolean;
  showQuickJumper?: boolean;
}

// Pagination props interface
export interface PaginationProps extends BaseComponentProps {
  // Current pagination state
  currentPage: number;
  pageSize: number;
  totalItems: number;
  
  // Event handlers
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  
  // Configuration options
  showSizeSelector?: boolean;
  pageSizeOptions?: number[];
  showFirstLastButtons?: boolean;
  showPageNumbers?: boolean;
  maxVisiblePages?: number;
  showTotalInfo?: boolean;
  showQuickJumper?: boolean;
  
  // Loading state
  loading?: boolean;
  
  // Styling options
  size?: 'sm' | 'base' | 'lg';
  variant?: 'default' | 'minimal' | 'outlined';
  position?: 'left' | 'center' | 'right';
  
  // Mobile specific
  mobileBreakpoint?: number;
  compactOnMobile?: boolean;
}

// Generate page numbers array with ellipsis
const generatePageNumbers = (
  currentPage: number,
  totalPages: number,
  maxVisiblePages: number = 7
): (number | 'ellipsis')[] => {
  if (totalPages <= maxVisiblePages) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  
  const halfVisible = Math.floor(maxVisiblePages / 2);
  let startPage = currentPage - halfVisible;
  let endPage = currentPage + halfVisible;
  
  if (startPage < 1) {
    startPage = 1;
    endPage = Math.min(maxVisiblePages, totalPages);
  }
  
  if (endPage > totalPages) {
    endPage = totalPages;
    startPage = Math.max(1, totalPages - maxVisiblePages + 1);
  }
  
  const pages: (number | 'ellipsis')[] = [];
  
  // Add first page if not included
  if (startPage > 1) {
    pages.push(1);
    if (startPage > 2) {
      pages.push('ellipsis');
    }
  }
  
  // Add visible pages
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }
  
  // Add last page if not included
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      pages.push('ellipsis');
    }
    pages.push(totalPages);
  }
  
  return pages;
};

// Page size selector component
const PageSizeSelector = ({
  pageSize,
  options,
  onPageSizeChange,
  size = 'base'
}: {
  pageSize: number;
  options: number[];
  onPageSizeChange: (size: number) => void;
  size?: 'sm' | 'base' | 'lg';
}) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    base: 'text-sm px-3 py-2',
    lg: 'text-base px-4 py-3'
  };
  
  return (
    <div className="flex items-center space-x-2">
      <span className={cn('text-gray-700 whitespace-nowrap', sizeClasses[size])}>
        Show
      </span>
      <select
        value={pageSize}
        onChange={(e) => onPageSizeChange(Number(e.target.value))}
        className={cn(
          'border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white',
          sizeClasses[size]
        )}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <span className={cn('text-gray-700 whitespace-nowrap', sizeClasses[size])}>
        per page
      </span>
    </div>
  );
};

// Quick jumper component
const QuickJumper = ({
  currentPage,
  totalPages,
  onPageChange,
  size = 'base'
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  size?: 'sm' | 'base' | 'lg';
}) => {
  const [inputValue, setInputValue] = useState(currentPage.toString());
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(inputValue, 10);
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
    } else {
      setInputValue(currentPage.toString());
    }
  };
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-1 w-12',
    base: 'text-sm px-3 py-2 w-16',
    lg: 'text-base px-4 py-3 w-20'
  };
  
  return (
    <form onSubmit={handleSubmit} className="flex items-center space-x-2">
      <span className={cn('text-gray-700 whitespace-nowrap', sizeClasses[size])}>
        Go to
      </span>
      <input
        type="number"
        min={1}
        max={totalPages}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={handleSubmit}
        className={cn(
          'border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent text-center',
          sizeClasses[size]
        )}
      />
      <span className={cn('text-gray-700 whitespace-nowrap', sizeClasses[size])}>
        of {totalPages}
      </span>
    </form>
  );
};

// Page button component
const PageButton = ({
  page,
  isActive,
  isDisabled,
  onClick,
  size = 'base',
  variant = 'default',
  children
}: {
  page?: number;
  isActive?: boolean;
  isDisabled?: boolean;
  onClick: () => void;
  size?: 'sm' | 'base' | 'lg';
  variant?: 'default' | 'minimal' | 'outlined';
  children: React.ReactNode;
}) => {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs min-w-[28px] h-7',
    base: 'px-3 py-2 text-sm min-w-[36px] h-9',
    lg: 'px-4 py-3 text-base min-w-[44px] h-11'
  };
  
  const variantClasses = {
    default: cn(
      'border border-gray-300 bg-white hover:bg-gray-50',
      isActive && 'bg-primary-600 text-white border-primary-600 hover:bg-primary-700',
      isDisabled && 'opacity-50 cursor-not-allowed hover:bg-white'
    ),
    minimal: cn(
      'text-gray-700 hover:text-primary-600 hover:bg-primary-50',
      isActive && 'text-primary-600 font-medium',
      isDisabled && 'opacity-50 cursor-not-allowed hover:text-gray-700 hover:bg-transparent'
    ),
    outlined: cn(
      'border-2 border-transparent text-gray-700 hover:border-primary-200 hover:text-primary-600',
      isActive && 'border-primary-600 text-primary-600 font-medium',
      isDisabled && 'opacity-50 cursor-not-allowed hover:border-transparent hover:text-gray-700'
    )
  };
  
  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:pointer-events-none',
        sizeClasses[size],
        variantClasses[variant]
      )}
    >
      {children}
    </button>
  );
};

// Mobile compact pagination
const MobilePagination = ({
  currentPage,
  totalPages,
  onPageChange,
  size = 'base',
  variant = 'default'
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  size?: 'sm' | 'base' | 'lg';
  variant?: 'default' | 'minimal' | 'outlined';
}) => {
  return (
    <div className="flex items-center justify-between">
      <PageButton
        isDisabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        size={size}
        variant={variant}
      >
        <ChevronLeft className="w-4 h-4 mr-1" />
        Previous
      </PageButton>
      
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-700">
          Page {currentPage} of {totalPages}
        </span>
      </div>
      
      <PageButton
        isDisabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        size={size}
        variant={variant}
      >
        Next
        <ChevronRight className="w-4 h-4 ml-1" />
      </PageButton>
    </div>
  );
};

// Total info component
const TotalInfo = ({
  currentPage,
  pageSize,
  totalItems,
  size = 'base'
}: {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  size?: 'sm' | 'base' | 'lg';
}) => {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);
  
  const sizeClasses = {
    sm: 'text-xs',
    base: 'text-sm',
    lg: 'text-base'
  };
  
  return (
    <div className={cn('text-gray-700', sizeClasses[size])}>
      Showing <span className="font-medium">{startItem}</span> to{' '}
      <span className="font-medium">{endItem}</span> of{' '}
      <span className="font-medium">{totalItems.toLocaleString()}</span> results
    </div>
  );
};

// Main Pagination component
export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  
  // Configuration
  showSizeSelector = true,
  pageSizeOptions = [10, 25, 50, 100],
  showFirstLastButtons = true,
  showPageNumbers = true,
  maxVisiblePages = 7,
  showTotalInfo = true,
  showQuickJumper = false,
  
  // State
  loading = false,
  
  // Styling
  size = 'base',
  variant = 'default',
  position = 'center',
  
  // Mobile
  mobileBreakpoint = 768,
  compactOnMobile = true,
  
  className,
  ...props
}) => {
  const [isMobile, setIsMobile] = useState(false);
  
  // Check if we should show mobile view
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < mobileBreakpoint);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [mobileBreakpoint]);
  
  const totalPages = Math.ceil(totalItems / pageSize);
  
  if (totalPages <= 1) {
    return null;
  }
  
  const positionClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end'
  };
  
  // Mobile compact view
  if (isMobile && compactOnMobile) {
    return (
      <div 
        className={cn(
          'flex flex-col space-y-4 px-4 py-3 bg-white border-t border-gray-200',
          className
        )}
        {...props}
      >
        {showTotalInfo && (
          <TotalInfo
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={totalItems}
            size={size}
          />
        )}
        
        <MobilePagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          size={size}
          variant={variant}
        />
        
        {showSizeSelector && onPageSizeChange && (
          <div className="flex justify-center">
            <PageSizeSelector
              pageSize={pageSize}
              options={pageSizeOptions}
              onPageSizeChange={onPageSizeChange}
              size={size}
            />
          </div>
        )}
      </div>
    );
  }
  
  const pageNumbers = showPageNumbers ? generatePageNumbers(currentPage, totalPages, maxVisiblePages) : [];
  
  return (
    <div 
      className={cn(
        'flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 px-4 py-3 bg-white border-t border-gray-200',
        className
      )}
      {...props}
    >
      {/* Left side - Total info and page size selector */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {showTotalInfo && (
          <TotalInfo
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={totalItems}
            size={size}
          />
        )}
        
        {showSizeSelector && onPageSizeChange && (
          <PageSizeSelector
            pageSize={pageSize}
            options={pageSizeOptions}
            onPageSizeChange={onPageSizeChange}
            size={size}
          />
        )}
      </div>
      
      {/* Right side - Page navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Quick jumper */}
        {showQuickJumper && totalPages > maxVisiblePages && (
          <QuickJumper
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            size={size}
          />
        )}
        
        {/* Page buttons */}
        <div className={cn('flex items-center space-x-1', positionClasses[position])}>
          {/* First page button */}
          {showFirstLastButtons && currentPage > 2 && (
            <PageButton
              isDisabled={currentPage <= 1 || loading}
              onClick={() => onPageChange(1)}
              size={size}
              variant={variant}
            >
              <ChevronsLeft className="w-4 h-4" />
            </PageButton>
          )}
          
          {/* Previous button */}
          <PageButton
            isDisabled={currentPage <= 1 || loading}
            onClick={() => onPageChange(currentPage - 1)}
            size={size}
            variant={variant}
          >
            <ChevronLeft className="w-4 h-4" />
          </PageButton>
          
          {/* Page numbers */}
          {showPageNumbers && pageNumbers.map((page, index) => (
            <React.Fragment key={index}>
              {page === 'ellipsis' ? (
                <span className="px-2 py-2">
                  <MoreHorizontal className="w-4 h-4 text-gray-400" />
                </span>
              ) : (
                <PageButton
                  page={page}
                  isActive={page === currentPage}
                  isDisabled={loading}
                  onClick={() => onPageChange(page)}
                  size={size}
                  variant={variant}
                >
                  {page}
                </PageButton>
              )}
            </React.Fragment>
          ))}
          
          {/* Next button */}
          <PageButton
            isDisabled={currentPage >= totalPages || loading}
            onClick={() => onPageChange(currentPage + 1)}
            size={size}
            variant={variant}
          >
            <ChevronRight className="w-4 h-4" />
          </PageButton>
          
          {/* Last page button */}
          {showFirstLastButtons && currentPage < totalPages - 1 && (
            <PageButton
              isDisabled={currentPage >= totalPages || loading}
              onClick={() => onPageChange(totalPages)}
              size={size}
              variant={variant}
            >
              <ChevronsRight className="w-4 h-4" />
            </PageButton>
          )}
        </div>
      </div>
    </div>
  );
};

export default Pagination;