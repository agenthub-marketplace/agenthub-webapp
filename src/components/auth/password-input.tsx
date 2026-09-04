"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type PasswordInputProps = {
  autoComplete: string;
  describedBy?: string;
  minLength?: number;
  name: string;
  pattern?: string;
  placeholder?: string;
  showLabel: string;
  hideLabel: string;
};

export function PasswordInput({
  autoComplete,
  describedBy,
  minLength,
  name,
  pattern,
  placeholder,
  showLabel,
  hideLabel,
}: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);
  const label = isVisible ? hideLabel : showLabel;

  return (
    <div className="relative">
      <input
        name={name}
        type={isVisible ? "text" : "password"}
        autoComplete={autoComplete}
        minLength={minLength}
        pattern={pattern}
        aria-describedby={describedBy}
        placeholder={placeholder}
        required
        className="h-11 w-full rounded-xl border border-[#251A40] bg-[#080612] px-3 pr-12 text-sm text-[#F5F1FA] outline-none transition-colors placeholder:text-[#5F526F] focus:border-[#8B5CF6]"
      />
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={() => setIsVisible((current) => !current)}
        className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#A78BCF] transition-colors hover:bg-[#251A40] hover:text-[#F5F1FA] focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
      >
        {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
