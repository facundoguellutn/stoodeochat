"use server";

import { connectDB } from "@/lib/db";
import { UsageLog, Conversation, User, Payment, Company } from "@/models";
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

export interface AdminChartData {
  costOverTime: Array<{ date: string; cost: number }>;
  costByType: Array<{ type: string; cost: number }>;
  topCompaniesByCost: Array<{ companyId: string; nombre: string; cost: number }>;
  conversationsOverTime: Array<{ date: string; count: number }>;
  userGrowth: Array<{ date: string; count: number }>;
  globalBalance: {
    totalCost: number;
    totalPayments: number;
    balance: number;
  };
  companyBalances: Array<{
    companyId: string;
    nombre: string;
    totalCost: number;
    totalPayments: number;
    balance: number;
  }>;
  incomeVsCostOverTime: Array<{
    date: string;
    cost: number;
    payments: number;
  }>;
}

export async function getAdminChartData(
  period: Period = "30d"
): Promise<AdminChartData> {
  const session = await getSession();
  if (!session || session.role !== "admin") throw new Error("No autorizado");
  await connectDB();

  const startDate = getStartDate(period);
  const mongoFormat = getMongoFormat(period);

  const [
    costOverTime,
    costByType,
    topCompaniesByCost,
    conversationsOverTime,
    userGrowth,
    totalCostAgg,
    totalPaymentsAgg,
    costsPerCompany,
    incomeOverTime,
    costOverTimeForBalance,
  ] = await Promise.all([
    // 1. Cost over time
    UsageLog.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: mongoFormat, date: "$createdAt" } },
          cost: { $sum: "$cost" },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: "$_id", cost: 1 } },
    ]),

    // 2. Cost by type
    UsageLog.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: "$type", cost: { $sum: "$cost" } } },
      { $project: { _id: 0, type: "$_id", cost: 1 } },
    ]),

    // 3. Top companies by cost
    UsageLog.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: "$companyId", cost: { $sum: "$cost" } } },
      { $sort: { cost: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "companies",
          localField: "_id",
          foreignField: "_id",
          as: "company",
        },
      },
      { $unwind: "$company" },
      {
        $project: {
          _id: 0,
          companyId: { $toString: "$_id" },
          nombre: "$company.nombre",
          cost: 1,
        },
      },
    ]),

    // 4. Conversations over time
    Conversation.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: mongoFormat, date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: "$_id", count: 1 } },
    ]),

    // 5. User growth
    User.aggregate([
      { $match: { role: { $ne: "admin" }, createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: mongoFormat, date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: "$_id", count: 1 } },
    ]),

    // 6. Total cost (all time)
    UsageLog.aggregate([
      { $group: { _id: null, total: { $sum: "$cost" } } },
    ]),

    // 7. Total payments (all time)
    Payment.aggregate([
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),

    // 8. Costs per company (all time)
    UsageLog.aggregate([
      { $group: { _id: "$companyId", totalCost: { $sum: "$cost" } } },
    ]),

    // 9. Payments over time
    Payment.aggregate([
      { $match: { date: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: mongoFormat, date: "$date" } },
          payments: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: "$_id", payments: 1 } },
    ]),

    // 10. Cost over time for merging with payments
    UsageLog.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: mongoFormat, date: "$createdAt" } },
          cost: { $sum: "$cost" },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: "$_id", cost: 1 } },
    ]),
  ]);

  // Payments per company
  const paymentsPerCompany = await Payment.aggregate([
    { $group: { _id: "$companyId", totalPayments: { $sum: "$amount" } } },
  ]);

  // Build company balances
  const costMap = new Map<string, number>();
  for (const item of costsPerCompany) {
    if (item._id) costMap.set(item._id.toString(), item.totalCost);
  }
  const paymentMap = new Map<string, number>();
  for (const item of paymentsPerCompany) {
    if (item._id) paymentMap.set(item._id.toString(), item.totalPayments);
  }

  const allCompanyIds = new Set([...costMap.keys(), ...paymentMap.keys()]);
  const companies = await Company.find({
    _id: {
      $in: Array.from(allCompanyIds).map(
        (id) => new mongoose.Types.ObjectId(id)
      ),
    },
  }).lean();
  const companyNameMap = new Map(
    companies.map((c) => [c._id.toString(), c.nombre])
  );

  const companyBalances = Array.from(allCompanyIds)
    .map((id) => {
      const tc = costMap.get(id) ?? 0;
      const tp = paymentMap.get(id) ?? 0;
      return {
        companyId: id,
        nombre: companyNameMap.get(id) ?? "Desconocida",
        totalCost: tc,
        totalPayments: tp,
        balance: tp - tc,
      };
    })
    .sort((a, b) => a.balance - b.balance);

  // Merge income vs cost over time
  const costTimeMap = new Map(
    costOverTimeForBalance.map((d: { date: string; cost: number }) => [
      d.date,
      d.cost,
    ])
  );
  const incomeTimeMap = new Map(
    incomeOverTime.map((d: { date: string; payments: number }) => [
      d.date,
      d.payments,
    ])
  );
  const allDates = new Set([...costTimeMap.keys(), ...incomeTimeMap.keys()]);
  const incomeVsCostOverTime = Array.from(allDates)
    .sort()
    .map((date) => ({
      date,
      cost: costTimeMap.get(date) ?? 0,
      payments: incomeTimeMap.get(date) ?? 0,
    }));

  return {
    costOverTime,
    costByType,
    topCompaniesByCost,
    conversationsOverTime,
    userGrowth,
    globalBalance: {
      totalCost: totalCostAgg[0]?.total ?? 0,
      totalPayments: totalPaymentsAgg[0]?.total ?? 0,
      balance: (totalPaymentsAgg[0]?.total ?? 0) - (totalCostAgg[0]?.total ?? 0),
    },
    companyBalances,
    incomeVsCostOverTime,
  };
}
