import { buildDateRuler, formatDate, type EvaluatePatentStatusInput } from "@/lib/patent-logic";
import { cn } from "@/lib/utils";

/**
 * Signature visual: 把「今日落在哪一段日期區間」的判定邏輯本身畫成一條時間尺。
 * compact=true 時只顯示無標籤的迷你版本（用於表格列）。
 */
export function DateRuler({
  input,
  compact = false,
  className,
}: {
  input: EvaluatePatentStatusInput;
  compact?: boolean;
  className?: string;
}) {
  const { points, todayRatio } = buildDateRuler(input);
  const width = compact ? 56 : 100;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <svg
        viewBox={`0 0 ${width} 10`}
        width={width}
        height={10}
        className="overflow-visible"
        role="img"
        aria-label={`今日相對於年費與專利權期限的位置：${formatDate(input.today)}`}
      >
        <line x1={0} y1={5} x2={width} y2={5} stroke="#DAD7CC" strokeWidth={2} strokeLinecap="round" />
        {points.map((p, i) => (
          <circle key={p.key} cx={(width / (points.length - 1)) * i} cy={5} r={1.4} fill="#B0AD9F" />
        ))}
        <circle
          cx={todayRatio * width}
          cy={5}
          r={compact ? 2.4 : 3}
          fill="#C23B2E"
          className="animate-draw-in"
          style={{ transformOrigin: "center" }}
        />
      </svg>
      {!compact && (
        <div className="flex justify-between text-[10px] leading-tight text-ink-muted">
          {points.map((p) => (
            <span key={p.key} className="flex flex-col items-center gap-0.5" style={{ maxWidth: 60 }}>
              <span className="tabular font-mono">{formatDate(p.date)}</span>
              <span>{p.label}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
