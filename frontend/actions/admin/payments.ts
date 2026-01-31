"use server";

import { connectDB } from "@/lib/db";
import Payment from "@/models/Payment";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") throw new Error("No autorizado");
  return session;
}

export async function createPayment(data: {
  companyId: string;
  amount: number;
  date: string;
  description?: string;
  method?: "transfer" | "card" | "cash" | "other";
}) {
  await requireAdmin();
  await connectDB();

  const payment = await Payment.create({
    companyId: data.companyId,
    amount: data.amount,
    date: new Date(data.date),
    description: data.description ?? "",
    method: data.method ?? "other",
  });

  revalidatePath(`/admin/empresas/${data.companyId}`);
  revalidatePath("/admin");

  return {
    _id: payment._id.toString(),
    amount: payment.amount,
    date: payment.date.toISOString(),
  };
}

export async function deletePayment(paymentId: string, companyId: string) {
  await requireAdmin();
  await connectDB();

  await Payment.findByIdAndDelete(paymentId);

  revalidatePath(`/admin/empresas/${companyId}`);
  revalidatePath("/admin");
}
