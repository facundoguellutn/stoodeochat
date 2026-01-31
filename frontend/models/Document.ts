import mongoose, { Schema, type Model } from "mongoose";
import type { IDocument } from "@/types/models";

const DocumentSchema = new Schema<IDocument>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    nombre: { type: String, required: true },
    activeVersionId: { type: Schema.Types.ObjectId, ref: "DocumentVersion" },
  },
  { timestamps: true }
);

const Document: Model<IDocument> =
  mongoose.models.Document ||
  mongoose.model<IDocument>("Document", DocumentSchema);

export default Document;
