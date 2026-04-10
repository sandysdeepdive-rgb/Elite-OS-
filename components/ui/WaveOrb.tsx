import { cn } from "@/lib/utils";

interface WaveOrbProps {
  size?: "sm" | "md" | "lg" | "xl";
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left" | "center";
  opacity?: number;
  animated?: boolean;
  className?: string;
}

export default function WaveOrb({
  size = "md",
  position = "top-right",
  opacity = 0.8,
  animated = true,
  className,
}: WaveOrbProps) {
  const sizes = {
    sm: "w-20 h-20",
    md: "w-32 h-32",
    lg: "w-48 h-48",
    xl: "w-72 h-72",
  };

  const positions = {
    "top-right": "absolute -top-10 -right-10",
    "top-left": "absolute -top-10 -left-10",
    "bottom-right": "absolute -bottom-10 -right-10",
    "bottom-left": "absolute -bottom-10 -left-10",
    center: "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
  };

  return (
    <div
      className={cn(
        "pointer-events-none rounded-full",
        sizes[size],
        positions[position],
        className
      )}
      style={{
        filter: "blur(40px)",
        background: "linear-gradient(135deg, rgba(43, 77, 90, 0.1) 0%, rgba(181, 168, 152, 0.1) 100%)",
        opacity,
        animation: animated ? "wave-drift 14s ease-in-out infinite" : undefined,
      }}
    />
  );
}
