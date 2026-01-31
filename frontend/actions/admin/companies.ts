"use server";

import { connectDB } from "@/lib/db";
import { Company, User, UsageLog } from "@/models";
import { getSession } from "@/lib/session";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    throw new Error("No autorizado");
  }
  return session;
}

export async function getCompanies() {
  await requireAdmin();
  await connectDB();

  const companies = await Company.find().sort({ createdAt: -1 }).lean();

  const companiesWithCounts = await Promise.all(
    companies.map(async (company) => {
      const userCount = await User.countDocuments({ companyId: company._id });
      return {
        _id: company._id.toString(),
        nombre: company.nombre,
        estado: company.estado,
        plan: company.plan,
        config: company.config,
        userCount,
        createdAt: company.createdAt.toISOString(),
      };
    })
  );

  return companiesWithCounts;
}

export async function createCompany(data: {
  nombre: string;
  plan: "basico" | "profesional" | "enterprise";
}) {
  await requireAdmin();
  await connectDB();

  const company = await Company.create({
    nombre: data.nombre,
    plan: data.plan,
  });

  return {
    _id: company._id.toString(),
    nombre: company.nombre,
    estado: company.estado,
    plan: company.plan,
  };
}

export async function getCompanyDetail(id: string) {
  await requireAdmin();
  await connectDB();

  const company = await Company.findById(id).lean();
  if (!company) throw new Error("Empresa no encontrada");

  const users = await User.find({ companyId: id })
    .select("-password")
    .sort({ createdAt: -1 })
    .lean();

  const [costAgg, whatsappMessages] = await Promise.all([
    UsageLog.aggregate([
      { $match: { companyId: company._id } },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$cost" },
          totalTokens: { $sum: "$totalTokens" },
        },
      },
    ]),
    UsageLog.countDocuments({ companyId: company._id, type: "whatsapp_message" }),
  ]);

  const costByType: Record<string, { cost: number; tokens: number }> = {};
  let totalCost = 0;
  for (const item of costAgg) {
    costByType[item._id] = { cost: item.total, tokens: item.totalTokens };
    totalCost += item.total;
  }

  return {
    company: {
      _id: company._id.toString(),
      nombre: company.nombre,
      estado: company.estado,
      plan: company.plan,
      config: company.config,
      createdAt: company.createdAt.toISOString(),
    },
    users: users.map((u) => ({
      _id: u._id.toString(),
      email: u.email,
      nombre: u.nombre,
      role: u.role,
      activo: u.activo,
      createdAt: u.createdAt.toISOString(),
    })),
    costs: {
      total: totalCost,
      byType: costByType,
    },
    whatsappMessages,
  };
}

export async function updateCompany(
  id: string,
  data: { nombre?: string; estado?: string; plan?: string }
) {
  await requireAdmin();
  await connectDB();

  const company = await Company.findByIdAndUpdate(id, data, { new: true }).lean();
  if (!company) throw new Error("Empresa no encontrada");

  return {
    _id: company._id.toString(),
    nombre: company.nombre,
    estado: company.estado,
    plan: company.plan,
  };
}
