import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      tone: {
        alive: "border-status-alive/20 bg-status-alive-bg text-status-alive",
        grace: "border-status-grace/20 bg-status-grace-bg text-status-grace",
        revival: "border-status-grace/20 bg-status-grace-bg text-status-grace",
        dead: "border-status-dead/20 bg-status-dead-bg text-status-dead",
        neutral: "border-ink/15 bg-ink/5 text-ink-muted",
        match: "border-status-alive/20 bg-status-alive-bg text-status-alive",
        mismatch: "border-seal/25 bg-seal/[0.08] text-seal",
      },
    },
    defaultVariants: { tone: "neutral" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone }), className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      <span {...props} className={cn(className)} />
    </span>
  );
}
