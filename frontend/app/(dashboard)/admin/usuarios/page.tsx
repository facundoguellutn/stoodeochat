"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { UserEditDialog } from "@/components/admin/user-edit-dialog";
import { UserDeleteDialog } from "@/components/admin/user-delete-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getUsers } from "@/actions/admin/users";
import { getCompanies } from "@/actions/admin/companies";
import type { UserRole } from "@/types/models";

const ALL = "__all__";

export default function UsuariosPage() {
  const queryClient = useQueryClient();
  const [companyFilter, setCompanyFilter] = useState(ALL);
  const [roleFilter, setRoleFilter] = useState(ALL);

  function handleUserChange() {
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
  }

  const { data: companies = [] } = useQuery({
    queryKey: ["admin-companies"],
    queryFn: () => getCompanies(),
  });

  const filters: { companyId?: string; role?: UserRole } = {};
  if (companyFilter !== ALL) filters.companyId = companyFilter;
  if (roleFilter !== ALL) filters.role = roleFilter as UserRole;

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users", companyFilter, roleFilter],
    queryFn: () => getUsers(Object.keys(filters).length > 0 ? filters : undefined),
  });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Usuarios</h1>

      <div className="flex gap-4">
        <div className="space-y-1">
          <Label>Empresa</Label>
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas</SelectItem>
              {companies.map((c) => (
                <SelectItem key={c._id} value={c._id}>
                  {c.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Rol</Label>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos</SelectItem>
              <SelectItem value="gestor">Gestor</SelectItem>
              <SelectItem value="usuario">Usuario</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Empresa</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Creado</TableHead>
            <TableHead className="w-[100px]">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                Cargando...
              </TableCell>
            </TableRow>
          )}
          {!isLoading &&
            users.map((user) => (
              <TableRow key={user._id}>
                <TableCell className="font-medium">{user.nombre}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.companyName}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{user.role}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.activo ? "default" : "outline"}>
                    {user.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(user.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <UserEditDialog user={user} onSuccess={handleUserChange} />
                    <UserDeleteDialog
                      userId={user._id}
                      userName={user.nombre}
                      onSuccess={handleUserChange}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          {!isLoading && users.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                No hay usuarios
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
