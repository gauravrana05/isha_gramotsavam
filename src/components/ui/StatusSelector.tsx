'use client';

import React from 'react';

export interface StatusOption {
  value: string;
  label: string;
  color?: string;
}

export interface StatusSelectorProps {
  value: string;
  options: StatusOption[];
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

const DEFAULT_STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  verified: 'bg-blue-100 text-blue-800 border-blue-300',
  approved: 'bg-green-100 text-green-800 border-green-300',
  rejected: 'bg-red-100 text-red-800 border-red-300',
  submitted: 'bg-purple-100 text-purple-800 border-purple-300',
  active: 'bg-green-100 text-green-800 border-green-300',
  inactive: 'bg-gray-100 text-gray-800 border-gray-300',
  draft: 'bg-gray-100 text-gray-800 border-gray-300',
} as const;

export const StatusSelector: React.FC<StatusSelectorProps> = ({
  value,
  options,
  onChange,
  className = '',
  disabled = false,
  placeholder = 'Select status...'
}) => {
  const getStatusStyle = () => {
    // First check if the option has a custom color
    const option = options.find(opt => opt.value === value);
    if (option?.color) {
      return option.color;
    }
    
    // Then check default colors
    if (value && value in DEFAULT_STATUS_COLORS) {
      return DEFAULT_STATUS_COLORS[value as keyof typeof DEFAULT_STATUS_COLORS];
    }
    
    // Default style
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    onChange(e.target.value);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleFocus = (e: React.FocusEvent) => {
    e.stopPropagation();
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <select
        value={value}
        onChange={handleChange}
        onClick={handleClick}
        onFocus={handleFocus}
        disabled={disabled}
        className={`
          inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border cursor-pointer 
          focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none
          disabled:opacity-50 disabled:cursor-not-allowed
          ${getStatusStyle()}
        `}
        style={{ 
          backgroundImage: disabled ? 'none' : `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
          backgroundPosition: 'right 0.3rem center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: '1rem 1rem',
          paddingRight: disabled ? '0.75rem' : '1.5rem'
        }}
      >
        {!value && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

// Pre-configured status selectors for common use cases
export const VerificationStatusSelector: React.FC<{
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}> = ({ value, onChange, className, disabled }) => {
  const options: StatusOption[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' }
  ];

  return (
    <StatusSelector
      value={value}
      options={options}
      onChange={onChange}
      className={className}
      disabled={disabled}
    />
  );
};

export const TeamStatusSelector: React.FC<{
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}> = ({ value, onChange, className, disabled }) => {
  const options: StatusOption[] = [
    { value: 'draft', label: 'Draft' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'verified', label: 'Verified' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'checked_in', label: 'Checked In' }
  ];

  return (
    <StatusSelector
      value={value}
      options={options}
      onChange={onChange}
      className={className}
      disabled={disabled}
    />
  );
};

export const GeneralStatusSelector: React.FC<{
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}> = ({ value, onChange, className, disabled }) => {
  const options: StatusOption[] = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
  ];

  return (
    <StatusSelector
      value={value}
      options={options}
      onChange={onChange}
      className={className}
      disabled={disabled}
    />
  );
};

export default StatusSelector;