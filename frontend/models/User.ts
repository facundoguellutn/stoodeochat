import mongoose, { Schema, type Model } from "mongoose";
import type { IUser } from "@/types/models";

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false },
    nombre: { type: String, required: true },
    telefono: {
      type: String,
      unique: true,
      sparse: true, // Permite nulls pero unique cuando existe
      required: function (this: IUser) {
        return this.role !== "admin"; // Obligatorio para usuarios no-admin
      },
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: function (this: IUser) {
        return this.role !== "admin";
      },
    },
    role: {
      type: String,
      enum: ["admin", "gestor", "usuario"],
      default: "usuario",
    },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
