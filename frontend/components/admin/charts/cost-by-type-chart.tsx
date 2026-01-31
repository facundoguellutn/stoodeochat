"use client";

import { Pie, PieChart, Cell } from "recharts";
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
  embedding: { label: "Embedding", color: "var(--chart-1)" },
  chat_completion: { label: "Chat", color: "var(--chart-2)" },
  other: { label: "Otro", color: "var(--chart-3)" },
} satisfies ChartConfig;

const COLORS: Record<string, string> = {
  embedding: "var(--color-embedding)",
  chat_completion: "var(--color-chat_completion)",
  other: "var(--color-other)",
};

interface Props {
  data: Array<{ type: string; cost: number }>;
}

export function CostByTypeChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Costo por Tipo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Sin datos
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Costo por Tipo</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="mx-auto h-[300px]">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent />} />
            <Pie
              data={data}
              dataKey="cost"
              nameKey="type"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.type}
                  fill={COLORS[entry.type] ?? "var(--chart-4)"}
                />
              ))}
            </Pie>
            <ChartLegend content={<ChartLegendContent />} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
