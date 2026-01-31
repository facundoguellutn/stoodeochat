"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserEditDialog } from "@/components/admin/user-edit-dialog";
import { UserDeleteDialog } from "@/components/admin/user-delete-dialog";

interface User {
  _id: string;
  nombre: string;
  email: string;
  role: string;
  activo: boolean;
  createdAt: string;
}

interface CompanyUsersTableProps {
  users: User[];
}

export function CompanyUsersTable({ users }: CompanyUsersTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Rol</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Creado</TableHead>
          <TableHead className="w-[100px]">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user._id}>
            <TableCell className="font-medium">{user.nombre}</TableCell>
            <TableCell>{user.email}</TableCell>
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
                <UserEditDialog user={user} />
                <UserDeleteDialog userId={user._id} userName={user.nombre} />
              </div>
            </TableCell>
          </TableRow>
        ))}
        {users.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground">
              No hay usuarios en esta empresa
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
