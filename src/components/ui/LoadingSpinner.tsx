interface LoadingSpinnerProps {
    size?: "small" | "medium" | "large";
  }
  
  const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = "medium" }) => {
    const sizeClasses = {
      small: "w-6 h-6 border-2",
      medium: "w-12 h-12 border-4",
      large: "w-16 h-16 border-4",
    };
  
    return (
      <div
        className={`${sizeClasses[size]} border-orange-600 border-t-transparent rounded-full animate-spin`}
      ></div>
    );
  };
   
export default LoadingSpinner;