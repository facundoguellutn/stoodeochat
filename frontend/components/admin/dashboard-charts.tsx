"use client";

import { useState, useTransition } from "react";
import { PeriodSelector } from "./charts/period-selector";
import { CostOverTimeChart } from "./charts/cost-over-time-chart";
import { CostByTypeChart } from "./charts/cost-by-type-chart";
import { TopCompaniesChart } from "./charts/top-companies-chart";
import { ConversationsOverTimeChart } from "./charts/conversations-over-time-chart";
import { UserGrowthChart } from "./charts/user-growth-chart";
import { IncomeVsCostChart } from "./charts/income-vs-cost-chart";
import { BalanceTable } from "./charts/balance-table";
import {
  getAdminChartData,
  type AdminChartData,
  type Period,
} from "@/actions/admin/charts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

interface Props {
  initialData: AdminChartData;
}

export function DashboardCharts({ initialData }: Props) {
  const [data, setData] = useState(initialData);
  const [period, setPeriod] = useState<string>("30d");
  const [isPending, startTransition] = useTransition();

  function handlePeriodChange(newPeriod: string) {
    setPeriod(newPeriod);
    startTransition(async () => {
      const newData = await getAdminChartData(newPeriod as Period);
      setData(newData);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Estadisticas</h2>
        <div className="flex items-center gap-2">
          {isPending && <Loader2 className="size-4 animate-spin" />}
          <PeriodSelector value={period} onChange={handlePeriodChange} />
        </div>
      </div>

      <Tabs defaultValue="usage">
        <TabsList>
          <TabsTrigger value="usage">Uso</TabsTrigger>
          <TabsTrigger value="activity">Actividad</TabsTrigger>
          <TabsTrigger value="financial">Financiero</TabsTrigger>
        </TabsList>

        <TabsContent value="usage" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <CostOverTimeChart data={data.costOverTime} />
            <CostByTypeChart data={data.costByType} />
          </div>
          <TopCompaniesChart data={data.topCompaniesByCost} />
        </TabsContent>

        <TabsContent value="activity" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <ConversationsOverTimeChart data={data.conversationsOverTime} />
            <UserGrowthChart data={data.userGrowth} />
          </div>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4 mt-4">
          <IncomeVsCostChart data={data.incomeVsCostOverTime} />
          <BalanceTable balances={data.companyBalances} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
