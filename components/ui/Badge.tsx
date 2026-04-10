import { cn } from "@/lib/utils";

interface BadgeProps {
  variant?: 
    | "active" 
    | "pending" 
    | "paid" 
    | "unpaid" 
    | "partial" 
    | "absent" 
    | "present" 
    | "late" 
    | "approved" 
    | "rejected" 
    | "default";
  size?: "sm" | "md";
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}

export default function Badge({
  variant = "default",
  size = "md",
  children,
  dot = false,
  className,
}: BadgeProps) {
  const baseStyles = "inline-flex items-center gap-1.5 rounded-full font-label uppercase tracking-[0.06em] border";

  const sizes = {
    sm: "px-2.5 py-0.5 text-[9px]",
    md: "px-3 py-1 text-[10px]",
  };

  const variants = {
    active: "bg-primary-container/10 text-primary-container border-primary-container/20",
    paid: "bg-[#4A6741]/10 text-[#4A6741] border-[#4A6741]/20",
    present: "bg-[#4A6741]/10 text-[#4A6741] border-[#4A6741]/20",
    approved: "bg-[#4A6741]/10 text-[#4A6741] border-[#4A6741]/20",
    pending: "bg-tertiary-container/20 text-on-tertiary-container border-tertiary-container/30",
    partial: "bg-tertiary-container/20 text-on-tertiary-container border-tertiary-container/30",
    late: "bg-tertiary-container/20 text-on-tertiary-container border-tertiary-container/30",
    unpaid: "bg-error/10 text-error border-error/20",
    absent: "bg-error/10 text-error border-error/20",
    rejected: "bg-error/10 text-error border-error/20",
    default: "bg-surface-container text-outline border-outline-variant",
  };

  return (
    <span
      className={cn(
        baseStyles,
        sizes[size],
        variants[variant],
        className
      )}
    >
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-current" />
      )}
      {children}
    </span>
  );
}
