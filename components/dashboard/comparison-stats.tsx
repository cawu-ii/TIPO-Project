"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { CaseComparisonResult } from "@/lib/field-compare";

export function ComparisonStats({ results }: { results: CaseComparisonResult[] }) {
  const total = results.length;
  const matched = results.filter((r) => r.comparedCount > 0 && r.mismatchCount === 0).length;
  const mismatched = results.filter((r) => r.mismatchCount > 0).length;

  const stats: Array<{ label: string; value: number; tone: "neutral" | "alive" | "dead" }> = [
    { label: "總比對案件數", value: total, tone: "neutral" },
    { label: "完全一致案件", value: matched, tone: "alive" },
    { label: "有差異需確認", value: mismatched, tone: "dead" },
  ];

  const toneText = { neutral: "text-ink", alive: "text-status-alive", dead: "text-seal" } as const;
  const toneDot = { neutral: "bg-ink/40", alive: "bg-status-alive", dead: "bg-seal" } as const;

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: i * 0.06 }}
        >
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="flex items-center gap-1.5">
                <span className={cn("h-1.5 w-1.5 rounded-full", toneDot[stat.tone])} aria-hidden />
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className={cn("font-mono text-2xl font-semibold tabular", toneText[stat.tone])}>
                {stat.value}
              </span>
              <span className="ml-1 text-xs text-ink-muted">筆</span>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
