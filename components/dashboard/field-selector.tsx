"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { GREEN_FIELD_DEFS } from "@/lib/field-compare";

export function FieldSelector({
  selectedKeys,
  onChange,
}: {
  selectedKeys: Set<string>;
  onChange: (keys: Set<string>) => void;
}) {
  const allSelected = selectedKeys.size === GREEN_FIELD_DEFS.length;

  function toggle(key: string) {
    const next = new Set(selectedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(next);
  }

  function toggleAll() {
    onChange(allSelected ? new Set() : new Set(GREEN_FIELD_DEFS.map((f) => f.key)));
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-ink">選擇需比對欄位（綠底欄位）</p>
            <p className="text-xs text-ink-muted">勾選的欄位將與智慧局最新資料逐一比對；黃底欄位無須勾選，抓回後自動顯示。</p>
          </div>
          <Button variant="outline" size="sm" onClick={toggleAll}>
            {allSelected ? "取消全選" : "全選欄位"}
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
          {GREEN_FIELD_DEFS.map((field) => (
            <label
              key={field.key}
              className="flex cursor-pointer items-center gap-2 rounded-card px-1.5 py-1 text-sm text-ink hover:bg-ink/[0.03]"
            >
              <Checkbox checked={selectedKeys.has(field.key)} onChange={() => toggle(field.key)} />
              <span className="truncate">{field.label}</span>
            </label>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
