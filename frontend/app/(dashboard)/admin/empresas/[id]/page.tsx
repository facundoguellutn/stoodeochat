import Link from "next/link";
import { notFound } from "next/navigation";
import { getCompanyDetail } from "@/actions/admin/companies";
import { UserFormDialog } from "@/components/admin/user-form-dialog";
import { CompanyEditDialog } from "@/components/admin/company-edit-dialog";
import { CompanyUsersTable } from "@/components/admin/company-users-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CompanyDetailPage({ params }: Props) {
  const { id } = await params;

  let detail;
  try {
    detail = await getCompanyDetail(id);
  } catch {
    notFound();
  }

  const { company, users, costs } = detail;

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
          <CompanyEditDialog company={company} />
          <UserFormDialog companyId={id} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
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
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Usuarios</h2>
        <CompanyUsersTable users={users} />
      </div>
    </div>
  );
}
