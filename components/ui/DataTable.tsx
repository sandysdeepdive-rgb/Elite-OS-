import React from "react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: keyof T | string;
  label: string;
  width?: string;
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
  align?: "left" | "center" | "right";
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: string;
  onRowClick?: (row: T) => void;
  keyExtractor: (row: T) => string;
  className?: string;
}

export default function DataTable<T>({
  columns,
  data,
  loading = false,
  emptyMessage,
  emptyIcon,
  onRowClick,
  keyExtractor,
  className,
}: DataTableProps<T>) {
  return (
    <div
      className={cn(
        "w-full overflow-x-auto rounded-2xl border border-outline-variant/30",
        className
      )}
    >
      <table className="w-full border-collapse min-w-[480px]">
        <thead>
          <tr className="border-b border-outline-variant/30 bg-surface-container-low/50">
            {columns.map((col) => (
              <th
                key={col.key as string}
                style={{ width: col.width }}
                className={cn(
                  "px-6 py-3 font-label text-[10px] uppercase tracking-[0.15em] text-outline font-normal text-left",
                  col.align === "center"
                    ? "text-center"
                    : col.align === "right"
                    ? "text-right"
                    : "text-left"
                )}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <tr key={index} className="border-b border-outline-variant/20">
                {columns.map((col, i) => (
                  <td key={i} className="px-6 py-4">
                    <div
                      className="h-4 bg-surface-container rounded-full animate-pulse"
                      style={{ width: `${60 + Math.random() * 30}%` }}
                    />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-16 text-center">
                {emptyIcon && (
                  <span className="material-symbols-outlined text-[40px] text-outline/50 block mb-3">
                    {emptyIcon}
                  </span>
                )}
                <p className="font-body text-sm text-outline font-light">
                  {emptyMessage || "No records found"}
                </p>
                <p className="font-label text-[10px] uppercase tracking-[0.15em] text-outline/60 mt-1">
                  Add your first entry to get started
                </p>
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr
                key={keyExtractor(row)}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "border-b border-outline-variant/20 last:border-0 bg-surface-container-lowest/70 transition-colors duration-150",
                  onRowClick && "cursor-pointer hover:bg-surface-container-low"
                )}
                style={{
                  animation: `fadeSlideIn 0.3s ease both`,
                  animationDelay: `${index * 0.04}s`,
                }}
              >
                {columns.map((col) => (
                  <td
                    key={col.key as string}
                    className={cn(
                      "px-6 py-4 font-body text-sm text-on-surface font-light",
                      col.align === "center"
                        ? "text-center"
                        : col.align === "right"
                        ? "text-right"
                        : "text-left"
                    )}
                  >
                    {col.render
                      ? col.render(
                          (row as Record<string, unknown>)[col.key as string],
                          row,
                          index
                        )
                      : String(
                          (row as Record<string, unknown>)[col.key as string] ??
                            "—"
                        )}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
