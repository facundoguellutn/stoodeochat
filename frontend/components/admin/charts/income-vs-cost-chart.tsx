"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";

const chartConfig = {
  payments: { label: "Pagos", color: "var(--chart-2)" },
  cost: { label: "Costo", color: "var(--chart-1)" },
} satisfies ChartConfig;

interface Props {
  data: Array<{ date: string; cost: number; payments: number }>;
}

export function IncomeVsCostChart({ data }: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          Ingresos vs Costos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart data={data} margin={{ left: 12, right: 12 }}>
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
              tickFormatter={(v: number) => `$${v.toFixed(0)}`}
              tickLine={false}
              axisLine={false}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="payments" fill="var(--color-payments)" radius={4} maxBarSize={40}/>
            <Bar dataKey="cost" fill="var(--color-cost)" radius={4} maxBarSize={40}/>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
