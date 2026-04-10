import { cn } from "@/lib/utils";
import WaveOrb from "./WaveOrb";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: string;
  onClick?: () => void;
  showOrb?: boolean;
  style?: React.CSSProperties;
}

export default function GlassCard({
  children,
  className,
  padding = "p-6",
  onClick,
  showOrb = false,
  style,
}: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      style={style}
      className={cn(
        "bg-surface-container-lowest/70 backdrop-blur-xl rounded-2xl border border-outline-variant/30 shadow-sm relative overflow-hidden",
        padding,
        onClick && "hover:bg-surface-container-low transition-colors cursor-pointer",
        className
      )}
    >
      {showOrb && (
        <WaveOrb position="top-right" size="md" />
      )}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
