import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { QueueBarPoint } from "@/lib/queueAnalytics";
import { cn } from "@/lib/utils";

const tooltipStyle = {
  backgroundColor: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: 12,
  fontSize: 12,
  boxShadow: "var(--shadow-soft)",
};

export function QueueSaveBarChart({
  data,
  tooltipLabel = "Saved on device",
  className,
}: {
  data: QueueBarPoint[];
  tooltipLabel?: string;
  className?: string;
}) {
  const maxCount = useMemo(
    () => Math.max(0, ...data.map((point) => point.count)),
    [data],
  );
  const hasData = maxCount > 0;
  const yMax = hasData ? maxCount : 1;

  return (
    <div className={cn("h-full min-h-56 w-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: -8, bottom: 4 }}
          barCategoryGap={data.length > 12 ? "12%" : "20%"}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
          <XAxis
            dataKey="label"
            stroke="var(--color-muted-foreground)"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            interval={data.length > 12 ? 2 : 0}
          />
          <YAxis
            stroke="var(--color-muted-foreground)"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            domain={[0, yMax]}
            ticks={hasData ? undefined : [0, 1]}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value) => [value ?? 0, tooltipLabel]}
          />
          <Bar
            dataKey="count"
            name={tooltipLabel}
            fill="oklch(0.54 0.22 277)"
            radius={[6, 6, 0, 0]}
            maxBarSize={data.length > 12 ? 14 : 36}
            background={
              hasData
                ? { fill: "rgba(180, 180, 180, 0.2)", radius: 6 }
                : false
            }
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
