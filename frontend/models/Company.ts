import mongoose, { Schema, type Model } from "mongoose";
import type { ICompany } from "@/types/models";

const CompanySchema = new Schema<ICompany>(
  {
    nombre: { type: String, required: true },
    config: {
      llmModel: { type: String, default: "gpt-4o-mini" },
      embeddingModel: { type: String, default: "text-embedding-3-small" },
      maxTokensPerMonth: { type: Number, default: 100000 },
    },
    estado: {
      type: String,
      enum: ["activo", "inactivo", "suspendido"],
      default: "activo",
    },
    plan: {
      type: String,
      enum: ["basico", "profesional", "enterprise"],
      default: "basico",
    },
  },
  { timestamps: true }
);

const Company: Model<ICompany> =
  mongoose.models.Company || mongoose.model<ICompany>("Company", CompanySchema);

export default Company;
