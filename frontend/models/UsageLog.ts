import mongoose, { Schema, type Model } from "mongoose";
import type { IUsageLog } from "@/types/models";

const UsageLogSchema = new Schema<IUsageLog>({
  companyId: {
    type: Schema.Types.ObjectId,
    ref: "Company",
    index: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ["embedding", "chat_completion", "whatsapp_message", "other"],
    required: true,
    index: true,
  },
  model: { type: String, required: true },
  inputTokens: { type: Number, required: true },
  outputTokens: { type: Number, default: 0 },
  totalTokens: { type: Number, required: true },
  cost: { type: Number, required: true },
  metadata: { type: Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now, index: true },
});

UsageLogSchema.index({ companyId: 1, createdAt: -1 });
UsageLogSchema.index({ userId: 1, createdAt: -1 });
UsageLogSchema.index({ type: 1, createdAt: -1 });

const UsageLog: Model<IUsageLog> =
  mongoose.models.UsageLog ||
  mongoose.model<IUsageLog>("UsageLog", UsageLogSchema);

export default UsageLog;
