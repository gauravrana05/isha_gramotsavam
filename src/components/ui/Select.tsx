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
    <div className="space-y-1 relative"> {/* Make parent relative */}
  {label && (
    <label
      className="block text-sm font-medium text-gray-700 font-fira"
      htmlFor={props.id}
    >
      {label}
    </label>
  )}

  <div className="relative">
    <select
      className={`w-full px-4 border border-gray-300 appearance-none rounded-lg transition-colors duration-200 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent font-fira ${variantClasses[variant]} ${className || ""}`}
      {...props}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value} className="font-fira">
          {option.label}
        </option>
      ))}
    </select>

    {/* Arrow */}
    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
      <svg xmlns="http://www.w3.org/2000/svg"  className="w-4 h-4" viewBox="0 0 32 32"><g data-name="93-Arrow Down"><path d="M16 0a16 16 0 1 0 16 16A16 16 0 0 0 16 0zm0 30a14 14 0 1 1 14-14 14 14 0 0 1-14 14z"/><path d="m16 19.59-7.29-7.3-1.42 1.42 8 8a1 1 0 0 0 1.41 0l8-8-1.41-1.41z"/></g></svg>
    </div>
  </div>
</div>

  );
};

export default Select;
