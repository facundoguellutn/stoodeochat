import { Building2, DollarSign, FileText, MessageSquare, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminMetrics } from "@/actions/admin/metrics";

export default async function AdminPage() {
  const metrics = await getAdminMetrics();

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
      label: "Costo Total",
      value: `$${metrics.totalCost.toFixed(4)}`,
      icon: DollarSign,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {card.label}
              </CardTitle>
              <card.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
