"use server";

import { connectDB } from "@/lib/db";
import { Company, User, Conversation, Document, UsageLog } from "@/models";
import { getSession } from "@/lib/session";

export interface AdminMetrics {
  companies: number;
  users: number;
  conversations: number;
  documents: number;
  totalCost: number;
}

export async function getAdminMetrics(): Promise<AdminMetrics> {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    throw new Error("No autorizado");
  }

  await connectDB();

  const [companies, users, conversations, documents, costAgg] =
    await Promise.all([
      Company.countDocuments(),
      User.countDocuments({ role: { $ne: "admin" } }),
      Conversation.countDocuments(),
      Document.countDocuments(),
      UsageLog.aggregate([
        { $group: { _id: null, total: { $sum: "$cost" } } },
      ]),
    ]);

  const totalCost = costAgg[0]?.total ?? 0;

  return { companies, users, conversations, documents, totalCost };
}
