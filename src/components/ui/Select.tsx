import { SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
  variant?: "small" | "medium" | "large";
  className?: string;
}

const Select: React.FC<SelectProps> = ({
  label,
  options,
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
          className="block text-sm font-medium text-gray-700 font-roboto"
          htmlFor={props.id}
        >
          {label}
        </label>
      )}
      <select
        className={`w-full px-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600 focus:border-transparent ${variantClasses[variant]} ${className || ""}`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default Select;