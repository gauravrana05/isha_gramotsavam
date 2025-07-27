// src/components/ui/Button.tsx
import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "small" | "medium" | "large";
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "medium",
  className,
  children,
  ...props
}) => {
  const baseClasses = "inline-flex items-center justify-center font-semibold font-fira rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variantClasses = {
    primary: "bg-[#F28C38] hover:bg-[#E67A26] text-white focus:ring-[#F28C38] shadow-lg hover:shadow-xl",
    secondary: "bg-white hover:bg-gray-50 text-[#4A2F1D] border-2 border-[#4A2F1D] focus:ring-[#4A2F1D]",
    outline: "bg-transparent hover:bg-[#F28C38] text-[#F28C38] hover:text-white border-2 border-[#F28C38] focus:ring-[#F28C38]",
    ghost: "bg-transparent hover:bg-[#F3F0E5] text-[#4A2F1D] focus:ring-[#4A2F1D]"
  };

  const sizeClasses = {
    small: "px-4 py-2 text-sm",
    medium: "px-6 py-3 text-base",
    large: "px-8 py-4 text-lg",
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className || ""}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
