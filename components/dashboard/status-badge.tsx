import { Badge } from "@/components/ui/badge";
import { STATUS_TONE, type PatentStatus } from "@/lib/patent-logic";

export function StatusBadge({ status }: { status: PatentStatus }) {
  const tone = STATUS_TONE[status];
  return <Badge tone={tone}>{status}</Badge>;
}
