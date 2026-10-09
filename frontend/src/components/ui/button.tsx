import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
}

export function Button({
  className,
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg px-5 py-3 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" &&
          "bg-blue-700 text-white shadow-sm hover:bg-blue-800 focus-visible:outline-blue-700",
        variant === "secondary" &&
          "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 focus-visible:outline-slate-500",
        className,
      )}
      type={type}
      {...props}
    />
  );
}

