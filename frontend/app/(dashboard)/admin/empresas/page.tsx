import Link from "next/link";
import { getCompanies } from "@/actions/admin/companies";
import { CompanyFormDialog } from "@/components/admin/company-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

export default async function EmpresasPage() {
  const companies = await getCompanies();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Empresas</h1>
        <CompanyFormDialog />
      </div>

      {companies.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          No hay empresas registradas
        </p>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => (
            <Link
              key={company._id}
              href={`/admin/empresas/${company._id}`}
              className="block"
            >
              <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{company.nombre}</CardTitle>
                  <div className="flex gap-2">
                    <Badge variant="secondary">{company.plan}</Badge>
                    <Badge
                      variant={
                        company.estado === "activo" ? "default" : "outline"
                      }
                    >
                      {company.estado}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="size-4" />
                    <span>
                      {company.userCount}{" "}
                      {company.userCount === 1 ? "usuario" : "usuarios"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
