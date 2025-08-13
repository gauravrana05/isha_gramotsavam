import { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  variant?: "small" | "medium" | "large";
  className?: string;
}

const Input: React.FC<InputProps> = ({
  label,
  variant = "medium",
  className,
  ...props
}) => {
  const variantClasses = {
    small: "py-1 text-sm",
    medium: "py-2 text-base",
    large: "py-3 text-lg",
  };

  return (
    <div className="space-y-1">
      {label && (
        <label
          className="block text-sm font-medium text-gray-700 font-fira"
          htmlFor={props.id}
        >
          {label}
        </label>
      )}
      <input
        className={`w-full px-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent ${variantClasses[variant]} ${className || ""}`}
        {...props}
      />
    </div>
  );
};
export default Input;