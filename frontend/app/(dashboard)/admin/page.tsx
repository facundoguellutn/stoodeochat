import {
  Building2,
  DollarSign,
  FileText,
  MessageCircle,
  MessageSquare,
  Users,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminMetrics } from "@/actions/admin/metrics";
import { getAdminChartData } from "@/actions/admin/charts";
import { DashboardCharts } from "@/components/admin/dashboard-charts";

export default async function AdminPage() {
  const [metrics, chartData] = await Promise.all([
    getAdminMetrics(),
    getAdminChartData("30d"),
  ]);

  const cards = [
    { label: "Empresas", value: metrics.companies.toString(), icon: Building2 },
    { label: "Usuarios", value: metrics.users.toString(), icon: Users },
    {
      label: "Conversaciones",
      value: metrics.conversations.toString(),
      icon: MessageSquare,
    },
    { label: "Documentos", value: metrics.documents.toString(), icon: FileText },
    {
      label: "Mensajes WhatsApp",
      value: metrics.whatsappMessages.toString(),
      icon: MessageCircle,
    },
    {
      label: "Costo Total",
      value: `$${metrics.totalCost.toFixed(4)}`,
      icon: DollarSign,
    },
    {
      label: "Total Pagos",
      value: `$${metrics.totalPayments.toFixed(2)}`,
      icon: Wallet,
    },
    {
      label: "Balance Global",
      value: `$${metrics.balance.toFixed(2)}`,
      icon: TrendingUp,
      color: metrics.balance >= 0 ? "text-green-600" : "text-red-600",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {card.label}
              </CardTitle>
              <card.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${"color" in card ? card.color : ""}`}
              >
                {card.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <DashboardCharts initialData={chartData} />
    </div>
  );
}
