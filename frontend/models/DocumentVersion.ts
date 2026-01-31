import mongoose, { Schema, type Model } from "mongoose";
import type { IDocumentVersion } from "@/types/models";

const DocumentVersionSchema = new Schema<IDocumentVersion>(
  {
    documentId: {
      type: Schema.Types.ObjectId,
      ref: "Document",
      required: true,
      index: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    texto: { type: String, required: true },
    estado: {
      type: String,
      enum: ["procesando", "activo", "error"],
      default: "procesando",
    },
    version: { type: Number, required: true },
  },
  { timestamps: true }
);

const DocumentVersion: Model<IDocumentVersion> =
  mongoose.models.DocumentVersion ||
  mongoose.model<IDocumentVersion>("DocumentVersion", DocumentVersionSchema);

export default DocumentVersion;
