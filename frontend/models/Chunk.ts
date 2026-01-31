import mongoose, { Schema, type Model } from "mongoose";
import type { IChunk } from "@/types/models";

const ChunkSchema = new Schema<IChunk>({
  documentVersionId: {
    type: Schema.Types.ObjectId,
    ref: "DocumentVersion",
    required: true,
    index: true,
  },
  documentId: {
    type: Schema.Types.ObjectId,
    ref: "Document",
    required: true,
  },
  companyId: {
    type: Schema.Types.ObjectId,
    ref: "Company",
    required: true,
    index: true,
  },
  text: { type: String, required: true },
  embedding: { type: [Number], required: true },
  embeddingModel: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const Chunk: Model<IChunk> =
  mongoose.models.Chunk || mongoose.model<IChunk>("Chunk", ChunkSchema);

export default Chunk;
