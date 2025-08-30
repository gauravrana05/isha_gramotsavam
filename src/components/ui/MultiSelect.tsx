"use client"

import * as React from "react"
import { Check, ChevronDown, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value?: string[];
  onValueChange?: (value: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const MultiSelect = React.forwardRef<HTMLDivElement, MultiSelectProps>(
  ({ options, value = [], onValueChange, placeholder = "Select items...", className, disabled }, ref) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState("");
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    // Filter options based on search term
    const filteredOptions = options.filter(option =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Handle option toggle
    const toggleOption = (optionValue: string) => {
      if (disabled) return;
      
      const newValue = value.includes(optionValue)
        ? value.filter(v => v !== optionValue)
        : [...value, optionValue];
      
      onValueChange?.(newValue);
    };

    // Handle remove item
    const removeItem = (optionValue: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (disabled) return;
      
      const newValue = value.filter(v => v !== optionValue);
      onValueChange?.(newValue);
    };

    // Close dropdown when clicking outside
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Get selected option labels
    const selectedLabels = value.map(v => options.find(opt => opt.value === v)?.label).filter(Boolean);

    return (
      <div ref={ref} className={cn("relative", className)}>
        <div
          ref={dropdownRef}
          className={cn(
            "flex min-h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer",
            disabled && "cursor-not-allowed opacity-50"
          )}
          onClick={() => !disabled && setIsOpen(!isOpen)}
        >
          <div className="flex flex-wrap gap-1 flex-1">
            {selectedLabels.length > 0 ? (
              selectedLabels.map((label, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-1 text-xs text-blue-800"
                >
                  {label}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-blue-600"
                    onClick={(e) => {
                      const optionValue = value[index];
                      if (optionValue) removeItem(optionValue, e);
                    }}
                  />
                </span>
              ))
            ) : (
              <span className="text-muted-foreground text-sm">{placeholder}</span>
            )}
          </div>
          <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform", isOpen && "rotate-180")} />
        </div>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-hidden rounded-md border bg-white shadow-md">
            <div className="p-2 border-b">
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="max-h-48 overflow-y-auto p-1">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <div
                    key={option.value}
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 pl-8 pr-2 text-sm outline-none hover:bg-blue-50 hover:text-blue-900",
                      value.includes(option.value) && "bg-blue-50 text-blue-900"
                    )}
                    onClick={() => toggleOption(option.value)}
                  >
                    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                      {value.includes(option.value) && <Check className="h-4 w-4" />}
                    </span>
                    {option.label}
                  </div>
                ))
              ) : (
                <div className="py-2 px-4 text-sm text-gray-500">No options found</div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);

MultiSelect.displayName = "MultiSelect";
