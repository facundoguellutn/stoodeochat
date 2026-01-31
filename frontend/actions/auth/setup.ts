"use server";

import { connectDB } from "@/lib/db";
import { User } from "@/models";
import { hashPassword } from "@/lib/auth";

export async function checkAdminExists(): Promise<boolean> {
  await connectDB();
  const admin = await User.findOne({ role: "admin" }).lean();
  return !!admin;
}

export async function createFirstAdmin(data: {
  nombre: string;
  email: string;
  password: string;
}): Promise<{ success: boolean; error?: string }> {
  await connectDB();

  const existing = await User.findOne({ role: "admin" }).lean();
  if (existing) {
    return { success: false, error: "Ya existe un administrador" };
  }

  const emailTaken = await User.findOne({ email: data.email.toLowerCase() }).lean();
  if (emailTaken) {
    return { success: false, error: "El email ya está registrado" };
  }

  const hashedPassword = await hashPassword(data.password);

  await User.create({
    nombre: data.nombre,
    email: data.email.toLowerCase(),
    password: hashedPassword,
    role: "admin",
    activo: true,
  });

  return { success: true };
}
