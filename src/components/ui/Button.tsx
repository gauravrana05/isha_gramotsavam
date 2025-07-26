interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "small" | "medium" | "large";
    className?: string;
  }
  
  export const Button: React.FC<ButtonProps> = ({
    variant = "medium",
    className,
    children,
    ...props
  }) => {
    const variantClasses = {
      small: "px-3 py-1 text-sm",
      medium: "px-4 py-2 text-base",
      large: "px-6 py-3 text-lg",
    };
  
    return (
      <button
        className={`rounded-lg font-medium font-roboto focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-600 disabled:opacity-50 ripple ${variantClasses[variant]} ${className || ""}`}
        {...props}
      >
        {children}
      </button>
    );
  };
export default Button;