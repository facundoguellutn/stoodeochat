import mongoose, { Schema, type Model } from "mongoose";
import type { IPayment } from "@/types/models";

const PaymentSchema = new Schema<IPayment>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    amount: { type: Number, required: true },
    date: { type: Date, required: true, index: true },
    description: { type: String, default: "" },
    method: {
      type: String,
      enum: ["transfer", "card", "cash", "other"],
      default: "other",
    },
  },
  { timestamps: true }
);

PaymentSchema.index({ companyId: 1, date: -1 });

const Payment: Model<IPayment> =
  mongoose.models.Payment ||
  mongoose.model<IPayment>("Payment", PaymentSchema);

export default Payment;
