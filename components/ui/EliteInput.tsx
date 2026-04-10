'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EliteInputProps {
  label?: string;
  placeholder?: string;
  type?: "text" | "email" | "password" | "number" | "tel" | "date";
  value?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  hint?: string;
  disabled?: boolean;
  required?: boolean;
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
  className?: string;
  name?: string;
  autoComplete?: string;
}

export default function EliteInput({
  label,
  placeholder,
  type = "text",
  value,
  defaultValue,
  onChange,
  error,
  hint,
  disabled = false,
  required = false,
  icon,
  trailing,
  className,
  name,
  autoComplete,
}: EliteInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  const renderTrailing = () => {
    if (isPassword) {
      return (
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="text-outline hover:text-on-surface transition-colors focus:outline-none flex items-center justify-center"
          disabled={disabled}
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      );
    }
    return trailing;
  };

  const actualTrailing = renderTrailing();

  return (
    <div className={cn("w-full", className, disabled && "opacity-40 cursor-not-allowed")}>
      {label && (
        <label className="block font-label text-[10px] uppercase tracking-[0.15em] text-outline mb-2">
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-outline pointer-events-none flex items-center justify-center">
            {icon}
          </div>
        )}
        
        <input
          type={inputType}
          name={name}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          autoComplete={autoComplete}
          className={cn(
            "w-full h-14 border-none rounded-full px-6 py-3 font-body text-sm text-on-surface font-light placeholder:text-outline transition-all duration-200 focus:ring-2 focus:ring-primary-container focus:outline-none",
            error ? "bg-error/5 ring-1 ring-error" : "bg-surface-container-low",
            icon && "pl-12",
            actualTrailing && "pr-12",
            disabled && "pointer-events-none"
          )}
        />
        
        {actualTrailing && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
            {actualTrailing}
          </div>
        )}
      </div>

      {error ? (
        <p className="font-body text-xs text-error mt-1.5">{error}</p>
      ) : hint ? (
        <p className="font-body text-xs text-outline mt-1.5">{hint}</p>
      ) : null}
    </div>
  );
}
