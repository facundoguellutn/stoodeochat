"use server";

import { connectDB } from "@/lib/db";
import { Company, User, Conversation, Document, UsageLog, Payment } from "@/models";
import { getSession } from "@/lib/session";

export interface AdminMetrics {
  companies: number;
  users: number;
  conversations: number;
  documents: number;
  whatsappMessages: number;
  totalCost: number;
  totalPayments: number;
  balance: number;
}

export async function getAdminMetrics(): Promise<AdminMetrics> {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    throw new Error("No autorizado");
  }

  await connectDB();

  const [companies, users, conversations, documents, whatsappMessages, costAgg, paymentsAgg] =
    await Promise.all([
      Company.countDocuments(),
      User.countDocuments({ role: { $ne: "admin" } }),
      Conversation.countDocuments(),
      Document.countDocuments(),
      UsageLog.countDocuments({ type: "whatsapp_message" }),
      UsageLog.aggregate([
        { $group: { _id: null, total: { $sum: "$cost" } } },
      ]),
      Payment.aggregate([
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

  const totalCost = costAgg[0]?.total ?? 0;
  const totalPayments = paymentsAgg[0]?.total ?? 0;

  return {
    companies,
    users,
    conversations,
    documents,
    whatsappMessages,
    totalCost,
    totalPayments,
    balance: totalPayments - totalCost,
  };
}
