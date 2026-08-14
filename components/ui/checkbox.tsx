import * as React from "react";
import { cn } from "@/lib/utils";

export const Checkbox = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        "h-4 w-4 shrink-0 cursor-pointer rounded-[3px] border border-ink/30 bg-paper-card accent-seal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30",
        className
      )}
      {...props}
    />
  )
);
Checkbox.displayName = "Checkbox";
