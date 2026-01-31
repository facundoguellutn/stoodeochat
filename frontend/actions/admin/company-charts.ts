"use server";

import { connectDB } from "@/lib/db";
import { UsageLog, Conversation, Payment } from "@/models";
import { getSession } from "@/lib/session";
import mongoose from "mongoose";

export type Period = "7d" | "30d" | "90d" | "365d";

function getStartDate(period: Period): Date {
  const now = new Date();
  const days = { "7d": 7, "30d": 30, "90d": 90, "365d": 365 }[period];
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

function getMongoFormat(period: Period): string {
  return period === "365d" ? "%Y-%m" : "%Y-%m-%d";
}

export interface CompanyChartData {
  costOverTime: Array<{ date: string; cost: number }>;
  costByType: Array<{ type: string; cost: number }>;
  conversationsOverTime: Array<{ date: string; count: number }>;
  activeUsersOverTime: Array<{ date: string; count: number }>;
  balanceHistory: Array<{ date: string; cost: number; payments: number }>;
  balance: {
    totalCost: number;
    totalPayments: number;
    balance: number;
  };
  payments: Array<{
    _id: string;
    amount: number;
    date: string;
    description: string;
    method: string;
  }>;
}

export async function getCompanyChartData(
  companyId: string,
  period: Period = "30d"
): Promise<CompanyChartData> {
  const session = await getSession();
  if (!session || session.role !== "admin") throw new Error("No autorizado");
  await connectDB();

  const startDate = getStartDate(period);
  const mongoFormat = getMongoFormat(period);
  const companyOid = new mongoose.Types.ObjectId(companyId);

  const [
    costOverTime,
    costByType,
    conversationsOverTime,
    activeUsersOverTime,
    totalCostAgg,
    totalPaymentsAgg,
    costForBalance,
    paymentsForBalance,
    payments,
  ] = await Promise.all([
    // Cost over time
    UsageLog.aggregate([
      { $match: { companyId: companyOid, createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: mongoFormat, date: "$createdAt" } },
          cost: { $sum: "$cost" },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: "$_id", cost: 1 } },
    ]),

    // Cost by type
    UsageLog.aggregate([
      { $match: { companyId: companyOid, createdAt: { $gte: startDate } } },
      { $group: { _id: "$type", cost: { $sum: "$cost" } } },
      { $project: { _id: 0, type: "$_id", cost: 1 } },
    ]),

    // Conversations over time
    Conversation.aggregate([
      { $match: { companyId: companyOid, createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: mongoFormat, date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: "$_id", count: 1 } },
    ]),

    // Active users over time
    Conversation.aggregate([
      { $match: { companyId: companyOid, createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: mongoFormat, date: "$createdAt" } },
          users: { $addToSet: "$userId" },
        },
      },
      { $project: { _id: 0, date: "$_id", count: { $size: "$users" } } },
      { $sort: { date: 1 } },
    ]),

    // Total cost (all time)
    UsageLog.aggregate([
      { $match: { companyId: companyOid } },
      { $group: { _id: null, total: { $sum: "$cost" } } },
    ]),

    // Total payments (all time)
    Payment.aggregate([
      { $match: { companyId: companyOid } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),

    // Cost over time for balance
    UsageLog.aggregate([
      { $match: { companyId: companyOid, createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: mongoFormat, date: "$createdAt" } },
          cost: { $sum: "$cost" },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: "$_id", cost: 1 } },
    ]),

    // Payments over time for balance
    Payment.aggregate([
      { $match: { companyId: companyOid, date: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: mongoFormat, date: "$date" } },
          payments: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: "$_id", payments: 1 } },
    ]),

    // Recent payments list
    Payment.find({ companyId: companyOid }).sort({ date: -1 }).limit(50).lean(),
  ]);

  // Merge balance history
  const costMap = new Map(
    costForBalance.map((d: { date: string; cost: number }) => [d.date, d.cost])
  );
  const payMap = new Map(
    paymentsForBalance.map((d: { date: string; payments: number }) => [
      d.date,
      d.payments,
    ])
  );
  const allDates = new Set([...costMap.keys(), ...payMap.keys()]);
  const balanceHistory = Array.from(allDates)
    .sort()
    .map((date) => ({
      date,
      cost: costMap.get(date) ?? 0,
      payments: payMap.get(date) ?? 0,
    }));

  return {
    costOverTime,
    costByType,
    conversationsOverTime,
    activeUsersOverTime,
    balanceHistory,
    balance: {
      totalCost: totalCostAgg[0]?.total ?? 0,
      totalPayments: totalPaymentsAgg[0]?.total ?? 0,
      balance:
        (totalPaymentsAgg[0]?.total ?? 0) - (totalCostAgg[0]?.total ?? 0),
    },
    payments: payments.map((p) => ({
      _id: p._id.toString(),
      amount: p.amount,
      date: p.date.toISOString(),
      description: p.description ?? "",
      method: p.method ?? "other",
    })),
  };
}
