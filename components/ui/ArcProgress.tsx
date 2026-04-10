import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ArcProgressProps {
  percent: number; // 0–100
  size?: number; // diameter in px, default 36
  strokeWidth?: number; // default 2.5
  className?: string;
  animated?: boolean; // default true
}

export default function ArcProgress({
  percent,
  size = 36,
  strokeWidth = 2.5,
  className,
  animated = true,
}: ArcProgressProps) {
  const [currentPercent, setCurrentPercent] = useState(0);

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        setCurrentPercent(percent);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [percent, animated]);

  const displayPercent = animated ? currentPercent : percent;
  const safePct = Math.min(100, Math.max(0, displayPercent));
  const radius = size / 2 - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const dashArray = (circumference * safePct) / 100;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ transform: "rotate(-90deg)" }}
      className={cn("block", className)}
    >
      {/* Track ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        className="stroke-surface-container"
        strokeWidth={strokeWidth}
      />
      {/* Progress ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        className="stroke-primary-container"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={`${dashArray} ${circumference}`}
        style={
          animated
            ? { transition: "stroke-dasharray 1.2s cubic-bezier(0.34,1.56,0.64,1)" }
            : {}
        }
      />
    </svg>
  );
}
