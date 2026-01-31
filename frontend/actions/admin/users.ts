"use server";

import { connectDB } from "@/lib/db";
import { User, Company } from "@/models";
import { getSession } from "@/lib/session";
import { hashPassword } from "@/lib/auth";
import type { UserRole } from "@/types/models";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    throw new Error("No autorizado");
  }
  return session;
}

export async function createUserForCompany(data: {
  nombre: string;
  email: string;
  password: string;
  role: "gestor" | "usuario";
  companyId: string;
}) {
  await requireAdmin();
  await connectDB();

  const company = await Company.findById(data.companyId).lean();
  if (!company) throw new Error("Empresa no encontrada");

  const existing = await User.findOne({ email: data.email.toLowerCase() }).lean();
  if (existing) throw new Error("El email ya está registrado");

  const hashedPassword = await hashPassword(data.password);

  const user = await User.create({
    nombre: data.nombre,
    email: data.email.toLowerCase(),
    password: hashedPassword,
    role: data.role,
    companyId: data.companyId,
    activo: true,
  });

  return {
    _id: user._id.toString(),
    email: user.email,
    nombre: user.nombre,
    role: user.role,
  };
}

export async function getCompanyUsers(companyId: string) {
  await requireAdmin();
  await connectDB();

  const users = await User.find({ companyId })
    .select("-password")
    .sort({ createdAt: -1 })
    .lean();

  return users.map((u) => ({
    _id: u._id.toString(),
    email: u.email,
    nombre: u.nombre,
    role: u.role,
    activo: u.activo,
    createdAt: u.createdAt.toISOString(),
  }));
}

export async function getUsers(filters?: {
  companyId?: string;
  role?: UserRole;
  activo?: boolean;
}) {
  await requireAdmin();
  await connectDB();

  const query: Record<string, unknown> = { role: { $ne: "admin" } };

  if (filters?.companyId) query.companyId = filters.companyId;
  if (filters?.role) query.role = filters.role;
  if (filters?.activo !== undefined) query.activo = filters.activo;

  const users = await User.find(query)
    .select("-password")
    .populate("companyId", "nombre")
    .sort({ createdAt: -1 })
    .lean();

  return users.map((u) => ({
    _id: u._id.toString(),
    email: u.email,
    nombre: u.nombre,
    role: u.role,
    activo: u.activo,
    companyName: (u.companyId as unknown as { nombre: string })?.nombre ?? "—",
    companyId: ((u.companyId as unknown as { _id: { toString(): string } })?._id ?? u.companyId)?.toString() ?? "",
    createdAt: u.createdAt.toISOString(),
  }));
}

export async function updateUser(
  id: string,
  data: {
    nombre?: string;
    email?: string;
    role?: "gestor" | "usuario";
    activo?: boolean;
    password?: string;
  }
) {
  await requireAdmin();
  await connectDB();

  const user = await User.findById(id);
  if (!user) throw new Error("Usuario no encontrado");
  if (user.role === "admin") throw new Error("No se puede editar un administrador");

  const updateData: Record<string, unknown> = {};

  if (data.nombre !== undefined) updateData.nombre = data.nombre;
  if (data.role !== undefined) updateData.role = data.role;
  if (data.activo !== undefined) updateData.activo = data.activo;

  if (data.email !== undefined) {
    const normalized = data.email.toLowerCase();
    if (normalized !== user.email) {
      const existing = await User.findOne({ email: normalized, _id: { $ne: id } }).lean();
      if (existing) throw new Error("El email ya está registrado");
      updateData.email = normalized;
    }
  }

  if (data.password) {
    updateData.password = await hashPassword(data.password);
  }

  const updated = await User.findByIdAndUpdate(id, updateData, { new: true })
    .select("-password")
    .lean();

  if (!updated) throw new Error("Error al actualizar usuario");

  return {
    _id: updated._id.toString(),
    email: updated.email,
    nombre: updated.nombre,
    role: updated.role,
    activo: updated.activo,
  };
}

export async function deleteUser(id: string) {
  await requireAdmin();
  await connectDB();

  const user = await User.findById(id).lean();
  if (!user) throw new Error("Usuario no encontrado");
  if (user.role === "admin") throw new Error("No se puede eliminar un administrador");

  await User.findByIdAndDelete(id);

  return { success: true };
}
