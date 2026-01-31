import Link from "next/link";
import { notFound } from "next/navigation";
import { getCompanyDetail } from "@/actions/admin/companies";
import { getCompanyChartData } from "@/actions/admin/company-charts";
import { UserFormDialog } from "@/components/admin/user-form-dialog";
import { CompanyEditDialog } from "@/components/admin/company-edit-dialog";
import { CompanyUsersTable } from "@/components/admin/company-users-table";
import { PaymentFormDialog } from "@/components/admin/payment-form-dialog";
import { CompanyDetailCharts } from "@/components/admin/company-detail-charts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, MessageCircle } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CompanyDetailPage({ params }: Props) {
  const { id } = await params;

  let detail;
  let chartData;
  try {
    [detail, chartData] = await Promise.all([
      getCompanyDetail(id),
      getCompanyChartData(id, "30d"),
    ]);
  } catch {
    notFound();
  }

  const { company, users, costs, whatsappMessages } = detail;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/empresas">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{company.nombre}</h1>
          <div className="flex gap-2 mt-1">
            <Badge variant="secondary">{company.plan}</Badge>
            <Badge variant={company.estado === "activo" ? "default" : "outline"}>
              {company.estado}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PaymentFormDialog companyId={id} />
          <CompanyEditDialog company={company} />
          <UserFormDialog companyId={id} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Costo Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${costs.total.toFixed(4)}</div>
          </CardContent>
        </Card>
        {Object.entries(costs.byType).map(([type, data]) => (
          <Card key={type}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium capitalize">
                {type.replace("_", " ")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${data.cost.toFixed(4)}</div>
              <p className="text-xs text-muted-foreground">
                {data.tokens.toLocaleString()} tokens
              </p>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Mensajes WhatsApp</CardTitle>
            <MessageCircle className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{whatsappMessages}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                chartData.balance.balance >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              ${chartData.balance.balance.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Pagado: ${chartData.balance.totalPayments.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      <CompanyDetailCharts initialData={chartData} companyId={id} />

      <div>
        <h2 className="text-lg font-semibold mb-4">Usuarios</h2>
        <CompanyUsersTable users={users} />
      </div>
    </div>
  );
}
