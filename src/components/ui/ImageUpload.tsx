// src/components/ui/ImageUpload.tsx
import React from 'react';

interface ImageUploadProps {
  label: string;
  onChange: (file: File | null) => void;
  progress: number;
  accept: string;
  className?: string;
  required?: boolean; // Added required prop
  disabled?: boolean; // Added disabled prop (commonly used)
  id?: string;        // Added id prop (useful for accessibility and labels)
  ariaLabel?: string; // Added specific aria-label prop (more explicit than deriving from label)
  // You could also add an 'error' prop if you want to display validation messages
  // error?: string; 
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  label,
  onChange,
  progress,
  accept,
  className = '', // Default to empty string
  required = false, // Default to false
  disabled = false, // Default to false
  id,
  ariaLabel,
  // error // Destructure error prop if added
}) => {
  // Use the provided id or generate one if needed for better a11y linking
  const inputId = id || `image-upload-${label.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div className="space-y-1">
      <label 
        htmlFor={inputId} // Link label to input
        className={`block text-sm font-medium text-gray-700 font-roboto ${required ? 'required' : ''}`} // Add 'required' class if needed for styling
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>} {/* Visual indicator for required */}
      </label>
      
      <input
        id={inputId} // Link input to label
        type="file"
        accept={accept}
        onChange={(e) => onChange(e.target.files?.[0] || null)}
        required={required} // Apply required attribute
        disabled={disabled} // Apply disabled attribute
        className={`w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-orange-50 file:text-orange-600 hover:file:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        aria-label={ariaLabel || label} // Use specific aria-label or fallback to label
        aria-required={required} // Accessibility: indicate if required
        // aria-invalid={!!error} // Accessibility: indicate if invalid (if error prop is used)
      />
      
      {progress > 0 && progress < 100 && (
        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
          <div
            className="bg-orange-600 h-2.5 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}

      {/* Example of how to display an error message if the error prop is added
      {error && (
        <p className="mt-1 text-sm text-red-600 font-roboto" role="alert">
          {error}
        </p>
      )} 
      */}
    </div>
  );
};

export default ImageUpload;