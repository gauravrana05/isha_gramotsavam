import React, { useState, useEffect, ReactNode } from 'react';
import { X, Filter, ChevronDown, ChevronRight, Search, Calendar } from 'lucide-react';
import { cn, BaseComponentProps } from '@/lib/component-patterns';

// Filter option interface
export interface FilterOption {
  label: string;
  value: any;
  count?: number;
  disabled?: boolean;
}

// Filter field configuration
export interface FilterField {
  key: string;
  label: string;
  type: 'select' | 'multiselect' | 'text' | 'number' | 'date' | 'daterange' | 'range' | 'boolean';
  options?: FilterOption[];
  placeholder?: string;
  defaultValue?: any;
  min?: number;
  max?: number;
  step?: number;
  searchable?: boolean; // For select/multiselect with many options
  collapsible?: boolean; // Whether the filter group can be collapsed
  category?: string; // Group filters by category
}

// Active filter interface
export interface ActiveFilter {
  key: string;
  value: any;
  operator?: string;
  label?: string; // Display label for the filter
  displayValue?: string; // Display value for the filter
}

// Filter sidebar props
export interface FilterSidebarProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterField[];
  activeFilters: ActiveFilter[];
  onFiltersChange: (filters: ActiveFilter[]) => void;
  onClearAll: () => void;
  title?: string;
  showApplyButton?: boolean;
  showClearButton?: boolean;
  position?: 'left' | 'right';
  width?: string | number;
}

// Filter input components
const TextFilter = ({ 
  field, 
  value, 
  onChange 
}: { 
  field: FilterField; 
  value: string; 
  onChange: (value: string) => void;
}) => (
  <input
    type="text"
    placeholder={field.placeholder}
    value={value || ''}
    onChange={(e) => onChange(e.target.value)}
    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
  />
);

const NumberFilter = ({ 
  field, 
  value, 
  onChange 
}: { 
  field: FilterField; 
  value: number; 
  onChange: (value: number) => void;
}) => (
  <input
    type="number"
    placeholder={field.placeholder}
    value={value || ''}
    min={field.min}
    max={field.max}
    step={field.step}
    onChange={(e) => onChange(Number(e.target.value))}
    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
  />
);

const SelectFilter = ({ 
  field, 
  value, 
  onChange 
}: { 
  field: FilterField; 
  value: any; 
  onChange: (value: any) => void;
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  
  const filteredOptions = field.options?.filter(option =>
    !searchTerm || option.label.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];
  
  const selectedOption = field.options?.find(opt => opt.value === value);
  
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm text-left bg-white flex items-center justify-between"
      >
        <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
          {selectedOption ? selectedOption.label : field.placeholder || 'Select...'}
        </span>
        <ChevronDown className={cn('w-4 h-4 transition-transform', isOpen && 'rotate-180')} />
      </button>
      
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {field.searchable && (
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search options..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
          )}
          
          <div className="py-1">
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setIsOpen(false);
              }}
              className="w-full px-3 py-2 text-left hover:bg-gray-100 text-sm text-gray-500"
            >
              Clear selection
            </button>
            
            {filteredOptions.map((option) => (
              <button
                key={String(option.value)}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                disabled={option.disabled}
                className={cn(
                  'w-full px-3 py-2 text-left hover:bg-gray-100 text-sm flex items-center justify-between',
                  option.value === value && 'bg-primary-50 text-primary-700',
                  option.disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                <span>{option.label}</span>
                {option.count !== undefined && (
                  <span className="text-gray-500 text-xs">({option.count})</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const MultiSelectFilter = ({ 
  field, 
  value, 
  onChange 
}: { 
  field: FilterField; 
  value: any[]; 
  onChange: (value: any[]) => void;
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  
  const filteredOptions = field.options?.filter(option =>
    !searchTerm || option.label.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];
  
  const selectedValues = value || [];
  const selectedLabels = field.options?.filter(opt => selectedValues.includes(opt.value)).map(opt => opt.label) || [];
  
  const handleToggleOption = (optionValue: any) => {
    const newValues = selectedValues.includes(optionValue)
      ? selectedValues.filter(v => v !== optionValue)
      : [...selectedValues, optionValue];
    onChange(newValues);
  };
  
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm text-left bg-white flex items-center justify-between min-h-[38px]"
      >
        <span className={selectedLabels.length > 0 ? 'text-gray-900' : 'text-gray-500'}>
          {selectedLabels.length > 0 ? (
            selectedLabels.length === 1 ? selectedLabels[0] : `${selectedLabels.length} selected`
          ) : (
            field.placeholder || 'Select...'
          )}
        </span>
        <ChevronDown className={cn('w-4 h-4 transition-transform', isOpen && 'rotate-180')} />
      </button>
      
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {field.searchable && (
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search options..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
          )}
          
          <div className="py-1">
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full px-3 py-2 text-left hover:bg-gray-100 text-sm text-gray-500"
            >
              Clear all
            </button>
            
            {filteredOptions.map((option) => (
              <label
                key={String(option.value)}
                className={cn(
                  'w-full px-3 py-2 flex items-center justify-between hover:bg-gray-100 cursor-pointer',
                  option.disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedValues.includes(option.value)}
                    onChange={() => handleToggleOption(option.value)}
                    disabled={option.disabled}
                    className="mr-2 h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm">{option.label}</span>
                </div>
                {option.count !== undefined && (
                  <span className="text-gray-500 text-xs">({option.count})</span>
                )}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const DateFilter = ({ 
  field, 
  value, 
  onChange 
}: { 
  field: FilterField; 
  value: string; 
  onChange: (value: string) => void;
}) => (
  <input
    type="date"
    value={value || ''}
    onChange={(e) => onChange(e.target.value)}
    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
  />
);

const DateRangeFilter = ({ 
  field, 
  value, 
  onChange 
}: { 
  field: FilterField; 
  value: [string, string]; 
  onChange: (value: [string, string]) => void;
}) => {
  const [startDate, endDate] = value || ['', ''];
  
  return (
    <div className="space-y-2">
      <input
        type="date"
        placeholder="Start date"
        value={startDate}
        onChange={(e) => onChange([e.target.value, endDate])}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
      />
      <input
        type="date"
        placeholder="End date"
        value={endDate}
        onChange={(e) => onChange([startDate, e.target.value])}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
      />
    </div>
  );
};

const RangeFilter = ({ 
  field, 
  value, 
  onChange 
}: { 
  field: FilterField; 
  value: [number, number]; 
  onChange: (value: [number, number]) => void;
}) => {
  const [min, max] = value || [field.min || 0, field.max || 100];
  
  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <input
          type="number"
          placeholder="Min"
          value={min}
          min={field.min}
          max={field.max}
          onChange={(e) => onChange([Number(e.target.value), max])}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
        />
        <span className="text-gray-500">to</span>
        <input
          type="number"
          placeholder="Max"
          value={max}
          min={field.min}
          max={field.max}
          onChange={(e) => onChange([min, Number(e.target.value)])}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
        />
      </div>
    </div>
  );
};

const BooleanFilter = ({ 
  field, 
  value, 
  onChange 
}: { 
  field: FilterField; 
  value: boolean; 
  onChange: (value: boolean | null) => void;
}) => (
  <div className="space-y-2">
    <label className="flex items-center cursor-pointer">
      <input
        type="radio"
        name={field.key}
        checked={value === true}
        onChange={() => onChange(true)}
        className="mr-2 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
      />
      <span className="text-sm">Yes</span>
    </label>
    <label className="flex items-center cursor-pointer">
      <input
        type="radio"
        name={field.key}
        checked={value === false}
        onChange={() => onChange(false)}
        className="mr-2 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
      />
      <span className="text-sm">No</span>
    </label>
    <label className="flex items-center cursor-pointer">
      <input
        type="radio"
        name={field.key}
        checked={value === null || value === undefined}
        onChange={() => onChange(null)}
        className="mr-2 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
      />
      <span className="text-sm text-gray-500">Any</span>
    </label>
  </div>
);

// Filter input renderer
const FilterInput = ({ 
  field, 
  value, 
  onChange 
}: { 
  field: FilterField; 
  value: any; 
  onChange: (value: any) => void;
}) => {
  switch (field.type) {
    case 'text':
      return <TextFilter field={field} value={value} onChange={onChange} />;
    case 'number':
      return <NumberFilter field={field} value={value} onChange={onChange} />;
    case 'select':
      return <SelectFilter field={field} value={value} onChange={onChange} />;
    case 'multiselect':
      return <MultiSelectFilter field={field} value={value} onChange={onChange} />;
    case 'date':
      return <DateFilter field={field} value={value} onChange={onChange} />;
    case 'daterange':
      return <DateRangeFilter field={field} value={value} onChange={onChange} />;
    case 'range':
      return <RangeFilter field={field} value={value} onChange={onChange} />;
    case 'boolean':
      return <BooleanFilter field={field} value={value} onChange={onChange} />;
    default:
      return <TextFilter field={field} value={value} onChange={onChange} />;
  }
};

// Filter group component
const FilterGroup = ({
  category,
  fields,
  values,
  onChange,
  collapsible = true
}: {
  category: string;
  fields: FilterField[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
  collapsible?: boolean;
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  return (
    <div className="border-b border-gray-200 last:border-b-0">
      {collapsible ? (
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full px-4 py-3 text-left font-medium text-gray-900 hover:bg-gray-50 flex items-center justify-between"
        >
          <span>{category}</span>
          <ChevronRight className={cn('w-4 h-4 transition-transform', !isCollapsed && 'rotate-90')} />
        </button>
      ) : (
        <div className="px-4 py-3 font-medium text-gray-900 border-b border-gray-100">
          {category}
        </div>
      )}
      
      {(!collapsible || !isCollapsed) && (
        <div className="px-4 py-3 space-y-4">
          {fields.map((field) => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {field.label}
              </label>
              <FilterInput
                field={field}
                value={values[field.key]}
                onChange={(value) => onChange(field.key, value)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Main FilterSidebar component
export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  isOpen,
  onClose,
  filters,
  activeFilters,
  onFiltersChange,
  onClearAll,
  title = "Filters",
  showApplyButton = false,
  showClearButton = true,
  position = 'right',
  width = '320px',
  className,
  ...props
}) => {
  const [tempFilters, setTempFilters] = useState<Record<string, any>>({});
  
  // Initialize temp filters from active filters
  useEffect(() => {
    const temp: Record<string, any> = {};
    activeFilters.forEach(filter => {
      temp[filter.key] = filter.value;
    });
    setTempFilters(temp);
  }, [activeFilters]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isOpen && window.innerWidth < 768) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);
  
  // Group filters by category
  const groupedFilters = filters.reduce((groups, filter) => {
    const category = filter.category || 'General';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(filter);
    return groups;
  }, {} as Record<string, FilterField[]>);
  
  // Handle filter value change
  const handleFilterChange = (key: string, value: any) => {
    setTempFilters(prev => ({ ...prev, [key]: value }));
    
    if (!showApplyButton) {
      // Apply filters immediately if no apply button
      const newFilters = [...activeFilters.filter(f => f.key !== key)];
      if (value != null && value !== '' && !(Array.isArray(value) && value.length === 0)) {
        const field = filters.find(f => f.key === key);
        newFilters.push({
          key,
          value,
          label: field?.label || key,
          displayValue: Array.isArray(value) ? 
            value.map(v => field?.options?.find(o => o.value === v)?.label || v).join(', ') :
            field?.options?.find(o => o.value === value)?.label || String(value)
        });
      }
      onFiltersChange(newFilters);
    }
  };
  
  // Apply filters (when using apply button)
  const handleApplyFilters = () => {
    const newFilters: ActiveFilter[] = [];
    Object.entries(tempFilters).forEach(([key, value]) => {
      if (value != null && value !== '' && !(Array.isArray(value) && value.length === 0)) {
        const field = filters.find(f => f.key === key);
        newFilters.push({
          key,
          value,
          label: field?.label || key,
          displayValue: Array.isArray(value) ? 
            value.map(v => field?.options?.find(o => o.value === v)?.label || v).join(', ') :
            field?.options?.find(o => o.value === value)?.label || String(value)
        });
      }
    });
    onFiltersChange(newFilters);
    if (window.innerWidth < 768) {
      onClose();
    }
  };
  
  // Clear all filters
  const handleClearAll = () => {
    setTempFilters({});
    onClearAll();
  };
  
  const sidebarClasses = cn(
    'fixed inset-y-0 z-50 flex flex-col bg-white shadow-lg transform transition-transform duration-300 ease-in-out',
    position === 'left' ? 'left-0 border-r border-gray-200' : 'right-0 border-l border-gray-200',
    isOpen ? 'translate-x-0' : (position === 'left' ? '-translate-x-full' : 'translate-x-full'),
    className
  );
  
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div 
        className={sidebarClasses}
        style={{ width }}
        {...props}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Filters */}
        <div className="flex-1 overflow-y-auto">
          {Object.entries(groupedFilters).map(([category, categoryFilters]) => (
            <FilterGroup
              key={category}
              category={category}
              fields={categoryFilters}
              values={tempFilters}
              onChange={handleFilterChange}
            />
          ))}
        </div>
        
        {/* Footer */}
        <div className="border-t border-gray-200 p-4 space-y-3">
          {showClearButton && (
            <button
              type="button"
              onClick={handleClearAll}
              className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              Clear All
            </button>
          )}
          
          {showApplyButton && (
            <button
              type="button"
              onClick={handleApplyFilters}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              Apply Filters
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default FilterSidebar;