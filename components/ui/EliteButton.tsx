import { cn } from "@/lib/utils";

interface EliteButtonProps {
  variant?: "primary" | "outlined" | "ghost";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  type?: "button" | "submit";
  className?: string;
}

export default function EliteButton({
  variant = "primary",
  size = "md",
  children,
  onClick,
  disabled = false,
  loading = false,
  fullWidth = false,
  type = "button",
  className,
}: EliteButtonProps) {
  const baseStyles = "relative inline-flex items-center justify-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2";
  
  const variants = {
    primary: "bg-primary-container text-white font-body font-medium tracking-wide hover:opacity-90 active:scale-[0.98] shadow-sm",
    outlined: "bg-transparent border border-outline text-primary font-body font-medium tracking-wide hover:bg-surface-container transition-colors",
    ghost: "bg-transparent text-secondary font-body font-light tracking-wide hover:bg-surface-container-low transition-colors",
  };

  const sizes = {
    sm: "px-4 py-1.5 text-xs",
    md: "px-8 py-3 text-sm",
    lg: "w-full h-14 text-sm",
  };

  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        isDisabled && "opacity-40 cursor-not-allowed pointer-events-none",
        className
      )}
    >
      {loading && (
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <span className="block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        </span>
      )}
      <span className={cn("inline-flex items-center justify-center gap-2", loading && "opacity-0")}>
        {children}
      </span>
    </button>
  );
}
