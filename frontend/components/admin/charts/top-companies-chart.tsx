"use client";

import { Bar, BarChart, XAxis, YAxis } from "recharts";
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
  data: Array<{ nombre: string; cost: number }>;
}

export function TopCompaniesChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Top Empresas por Costo
          </CardTitle>
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
        <CardTitle className="text-sm font-medium">
          Top Empresas por Costo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
            <XAxis
              type="number"
              tickFormatter={(v: number) => `$${v.toFixed(2)}`}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="nombre"
              tickLine={false}
              axisLine={false}
              width={75}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="cost" fill="var(--color-cost)" radius={4} maxBarSize={40}/>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
