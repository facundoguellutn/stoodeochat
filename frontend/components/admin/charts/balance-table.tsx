"use client";

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

interface Props {
  balances: Array<{
    companyId: string;
    nombre: string;
    totalCost: number;
    totalPayments: number;
    balance: number;
  }>;
}

export function BalanceTable({ balances }: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          Balance por Empresa
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead className="text-right">Costo Total</TableHead>
              <TableHead className="text-right">Total Pagado</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {balances.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Sin datos
                </TableCell>
              </TableRow>
            )}
            {balances.map((b) => (
              <TableRow key={b.companyId}>
                <TableCell className="font-medium">{b.nombre}</TableCell>
                <TableCell className="text-right">
                  ${b.totalCost.toFixed(4)}
                </TableCell>
                <TableCell className="text-right">
                  ${b.totalPayments.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant={b.balance >= 0 ? "default" : "destructive"}
                  >
                    ${b.balance.toFixed(2)}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
