import mongoose, { Schema, type Model } from "mongoose";
import type { IMessage } from "@/types/models";

const MessageSchema = new Schema<IMessage>({
  conversationId: {
    type: Schema.Types.ObjectId,
    ref: "Conversation",
    required: true,
    index: true,
  },
  role: {
    type: String,
    enum: ["user", "assistant"],
    required: true,
  },
  content: { type: String, required: true },
  chunksUsed: [{ type: Schema.Types.ObjectId, ref: "Chunk" }],
  tokenCount: { type: Number },
  createdAt: { type: Date, default: Date.now },
});

const Message: Model<IMessage> =
  mongoose.models.Message ||
  mongoose.model<IMessage>("Message", MessageSchema);

export default Message;
