"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PatentRow } from "@/lib/mock-data";

interface Stat {
  label: string;
  value: number;
  tone: "neutral" | "alive" | "grace" | "dead";
}

function computeStats(rows: PatentRow[] | null): Stat[] {
  const total = rows?.length ?? 0;
  const alive = rows?.filter((r) => r.status === "案件存續").length ?? 0;
  const grace =
    rows?.filter((r) => r.status === "案件逾期但尚在補繳期內" || r.status === "案件逾補繳期但尚可復權").length ?? 0;
  const dead = rows?.filter((r) => r.status === "案件已消滅").length ?? 0;

  return [
    { label: "總解析筆數", value: total, tone: "neutral" },
    { label: "案件存續", value: alive, tone: "alive" },
    { label: "逾期補繳／復權中", value: grace, tone: "grace" },
    { label: "案件已消滅／失敗", value: dead, tone: "dead" },
  ];
}

const toneText: Record<Stat["tone"], string> = {
  neutral: "text-ink",
  alive: "text-status-alive",
  grace: "text-status-grace",
  dead: "text-status-dead",
};

const toneDot: Record<Stat["tone"], string> = {
  neutral: "bg-ink/40",
  alive: "bg-status-alive",
  grace: "bg-status-grace",
  dead: "bg-status-dead",
};

export function StatCards({ rows }: { rows: PatentRow[] | null }) {
  const stats = computeStats(rows);
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
