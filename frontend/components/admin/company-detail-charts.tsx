"use client";

import { useState, useTransition } from "react";
import { PeriodSelector } from "./charts/period-selector";
import { CostOverTimeChart } from "./charts/cost-over-time-chart";
import { CostByTypeChart } from "./charts/cost-by-type-chart";
import { ConversationsOverTimeChart } from "./charts/conversations-over-time-chart";
import { ActiveUsersChart } from "./charts/active-users-chart";
import { WhatsAppOverTimeChart } from "./charts/whatsapp-over-time-chart";
import { IncomeVsCostChart } from "./charts/income-vs-cost-chart";
import { PaymentDeleteDialog } from "./payment-delete-dialog";
import {
  getCompanyChartData,
  type CompanyChartData,
  type Period,
} from "@/actions/admin/company-charts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

const METHOD_LABELS: Record<string, string> = {
  transfer: "Transferencia",
  card: "Tarjeta",
  cash: "Efectivo",
  other: "Otro",
};

interface Props {
  initialData: CompanyChartData;
  companyId: string;
}

export function CompanyDetailCharts({ initialData, companyId }: Props) {
  const [data, setData] = useState(initialData);
  const [period, setPeriod] = useState<string>("30d");
  const [isPending, startTransition] = useTransition();

  function handlePeriodChange(newPeriod: string) {
    setPeriod(newPeriod);
    startTransition(async () => {
      const newData = await getCompanyChartData(companyId, newPeriod as Period);
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
        </TabsContent>

        <TabsContent value="activity" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <ConversationsOverTimeChart data={data.conversationsOverTime} />
            <ActiveUsersChart data={data.activeUsersOverTime} />
          </div>
          <WhatsAppOverTimeChart data={data.whatsappOverTime} />
        </TabsContent>

        <TabsContent value="financial" className="space-y-4 mt-4">
          <IncomeVsCostChart data={data.balanceHistory} />

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Historial de Pagos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Descripcion</TableHead>
                    <TableHead>Metodo</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.payments.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-muted-foreground"
                      >
                        Sin pagos registrados
                      </TableCell>
                    </TableRow>
                  )}
                  {data.payments.map((p) => (
                    <TableRow key={p._id}>
                      <TableCell>
                        {new Date(p.date).toLocaleDateString("es-AR")}
                      </TableCell>
                      <TableCell>{p.description || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {METHOD_LABELS[p.method] ?? p.method}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${p.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <PaymentDeleteDialog
                          paymentId={p._id}
                          companyId={companyId}
                          amount={p.amount}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
