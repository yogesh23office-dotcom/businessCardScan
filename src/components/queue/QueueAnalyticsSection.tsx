import { useMemo, useState } from "react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QueueSaveBarChart } from "@/components/queue/QueueSaveBarChart";
import { QueuePipelineInsights } from "@/components/queue/QueuePipelineInsights";
import type { QueueItem } from "@/lib/indexeddb";
import type { StoredContact } from "@/lib/contactStorage";
import {
  buildDailySaveActivity,
  buildMonthlySaveActivity,
  buildWeeklySaveActivity,
} from "@/lib/queueAnalytics";

type Range = "daily" | "weekly" | "monthly";

const RANGE_META: Record<
  Range,
  { title: string; description: string }
> = {
  daily: {
    title: "Today by hour",
    description: "Saves on this device throughout today (local time)",
  },
  weekly: {
    title: "This week",
    description: "Saves grouped by weekday (Mon–Sun)",
  },
  monthly: {
    title: "This year",
    description: "Saves grouped by month",
  },
};

export function QueueAnalyticsSection({
  contacts,
  queueItems,
}: {
  contacts: StoredContact[];
  queueItems: QueueItem[];
}) {
  const [range, setRange] = useState<Range>("weekly");

  const dailyData = useMemo(
    () => buildDailySaveActivity(contacts, queueItems),
    [contacts, queueItems],
  );
  const weeklyData = useMemo(
    () => buildWeeklySaveActivity(contacts, queueItems),
    [contacts, queueItems],
  );
  const monthlyData = useMemo(
    () => buildMonthlySaveActivity(contacts, queueItems),
    [contacts, queueItems],
  );

  const chartData =
    range === "daily" ? dailyData : range === "weekly" ? weeklyData : monthlyData;
  const meta = RANGE_META[range];
  const total = chartData.reduce((sum, p) => sum + p.count, 0);

  return (
    <div className="mt-5 border-t border-border/60 pt-5 sm:mt-6 sm:pt-6">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-sm font-medium">Save analytics</div>
          <div className="text-xs text-muted-foreground">
            Offline captures saved on this device
          </div>
        </div>
        <Tabs
          value={range}
          onValueChange={(v) => setRange(v as Range)}
          className="w-full sm:w-auto"
        >
          <TabsList className="grid h-auto w-full grid-cols-3 rounded-xl bg-muted/60 p-1 sm:w-auto">
            <TabsTrigger value="daily" className="rounded-lg text-xs data-[state=active]:bg-card">
              Daily
            </TabsTrigger>
            <TabsTrigger value="weekly" className="rounded-lg text-xs data-[state=active]:bg-card">
              Weekly
            </TabsTrigger>
            <TabsTrigger value="monthly" className="rounded-lg text-xs data-[state=active]:bg-card">
              Monthly
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="mb-3 flex items-baseline justify-between gap-2">
        <div>
          <div className="text-xs font-medium text-foreground">{meta.title}</div>
          <div className="text-[11px] text-muted-foreground">{meta.description}</div>
        </div>
        <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
          {total} total
        </span>
      </div>

      <div className="grid min-h-60 gap-4 lg:grid-cols-5 lg:items-stretch lg:gap-5">
        <div className="flex min-h-60 flex-col lg:col-span-3">
          <QueueSaveBarChart data={chartData} className="flex-1" />
        </div>
        <div className="flex min-h-60 flex-col lg:col-span-2">
          <QueuePipelineInsights contacts={contacts} queueItems={queueItems} />
        </div>
      </div>
    </div>
  );
}
