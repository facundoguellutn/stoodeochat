"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const chartConfig = {
  cost: { label: "Costo", color: "var(--chart-1)" },
} satisfies ChartConfig;

interface Props {
  data: Array<{ date: string; cost: number }>;
}

export function CostOverTimeChart({ data }: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          Costo en el Tiempo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <AreaChart data={data} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(v: string) => {
                if (v.length === 7) return v;
                const parts = v.split("-");
                return `${parts[1]}/${parts[2]}`;
              }}
            />
            <YAxis
              tickFormatter={(v: number) => `$${v.toFixed(2)}`}
              tickLine={false}
              axisLine={false}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              dataKey="cost"
              fill="var(--color-cost)"
              fillOpacity={0.3}
              stroke="var(--color-cost)"
              type="monotone"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
